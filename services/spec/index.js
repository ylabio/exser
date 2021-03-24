const Ajv = require('ajv').default;
const ajvFormats = require('ajv-formats').default;
const ajvKeywords = require('ajv-keywords');
const {errors, objectUtils} = require('../../utils');
const mc = require('merge-change');

/**
 * Сервис спецификации
 * Содержит все схемы для валидации, фильтрации моделей и описания апи
 * Структура всей схемы соответствует OpenApi 3.0
 * Схемы моделей помещаются в #/components/schemas
 */
class Spec {

  constructor() {
    this.validator = new Ajv({
      strict: false,
      removeAdditional: true, // Если в схеме явно указано additionalProperties: false, то удалять все не описанные свойства,
      useDefaults: true, // Установка значения по умолчанию из default если свойства нет или оно null или undefined
      coerceTypes: true, // Корректировка скалярных типов по схеме. Например строку в число.
      messages: true, // Сообщения об ошибках
      allErrors: true, // Искать все ошибки вместо остановки при первой найденной
      verbose: true, // Передача текущей схемы в callback кастомного ключевого слова
      passContext: true, // Передача своего контекста в callback кастомного ключевого слова при валидации
    });
    ajvKeywords(this.validator);
    ajvFormats(this.validator);

    // Объект спецификации по формату OpenAPI3.0
    this.specification = {
      openapi: '3.0.0',
      info: {
        title: 'API',
        description: 'REST API',
        termsOfService: '',//url
        version: '1.0.0',
      },
      servers: [],
      paths: {}, // Описание роутеров апи
      components: {
        schemas: {}, // Модели данных
        responses: {},
        parameters: {},
        examples: {},
        requestBodies: {},
        headers: {},
        securitySchemes: {},
        links: {},
        callbacks: {},
      },
      security: {},
      tags: [], // Теги для группировки роутеров
      externalDocs: {},
    };
    this.keywords = {};
    this.trees = {};
  }

  /**
   * Инициализация при первом обращении к сервису
   * @param config
   * @param services
   * @returns {Promise<Spec>}
   */
  async init(config, services) {
    this.config = config;
    this.services = services;
    this.specification = mc.update(this.specification, config.default);
    if (config.keywords) {
      const names = Object.keys(config.keywords);
      for (const name of names) {
        this.setKeyword(name, config.keywords[name]);
      }
    }
    return this;
  }

  /**
   * Выбор свойства спецификации
   * @param path {String} Путь на свойство спецификации. Если не казан, то вся спецификация. Может начинаться с #/
   * @returns {undefined}
   */
  get(path) {
    if (!path) {
      return this.specification;
    }
    let relPath = path.match(/^#?\/?(.*)$/);
    if (relPath) {
      return objectUtils.get(this.specification, relPath[1], undefined, '/');
    }
    return undefined;
  }

  /**
   * Изменение свойства спецификации
   * С применением операций слияния npm пакета "merge-change"
   * @param path {String} Путь на свойство от корная спецификации, может начинаться с #/
   * @param def {Any} Значение свойства
   */
  set(path, def) {
    let relPath = path.match(/^#?\/?(.*)$/);
    if (relPath) {
      let currentValue = this.get(path);
      let newValue = mc.update(currentValue, def);
      objectUtils.set(this.specification, relPath[1], newValue, false, '/');
    }
    this.isChanged = true;
  }

  /**
   * Установить кастомное ключевое слово для JSONScheme
   * @link 3
   * @param name {String}
   * @param options {Function|Object}
   */
  setKeyword(name, options) {
    if (typeof options === 'function') {
      options = options(this, this.services);
    }
    if (!options.keyword) {
      options.keyword = name;
    }
    this.keywords[name] = options;
    this.validator.addKeyword(this.keywords[name]);
  }

  /**
   * Регистрация класса (конструктора) для ключевого слова instance
   * @param construct
   */
  setKeywordInstanceClass(construct) {
    require('./keywords/instance').CLASS_NAMES[construct.name] = construct;
  }

  exeKeywordInstance(data, dataSchema){
    return require('./keywords/instance').exe(data, dataSchema);
  }

  /**
   * Валидация
   * @param path Путь к схеме, например #/components/schemas/user
   * @param value Значение для валидации
   * @param context Контекст для кастомных ключевых слов
   */
  async validate(path, value, context = {}) {
    this.updateAjvSchema(path);
    const ajvSch = this.validator.getSchema(path);
    if (!ajvSch) {
      throw Error(`Schema by path ${path} was not found`);
    }
    try {
      if (!context.target) {
        context.target = 'js'; // может быть json когда типы конвертируются в совместимые json (например дата строкой)
      }
      return await ajvSch.call(context, value);
    } catch (e) {
      //console.log(e);
      throw this.customErrors('', e, value);
    }
  }

  /**
   * Обновление схемы в экземпляре валидатора (Ajv)
   * Вызывается автоматически перед первой валидацией
   * @param path Путь на схему
   */
  updateAjvSchema(path = '') {
    const sch = this.get(path);
    if (typeof sch === 'object' && !sch.$async) {
      sch.$async = true; // Необходимо для асинхронного вызова валидатора
      this.validator.removeSchema('');
      this.validator.addSchema(this.specification);
    }
  }

  getSchemaOpenApi() {
    const filter = (obj, parent = '') => {
      let result;
      if (Array.isArray(obj)) {
        result = [];
        for (let i = 0; i < obj.length; i++) {
          result.push(filter(obj[i], `${parent}.[]`));
        }
      } else if (typeof obj === 'object' && obj !== null) {
        result = {};
        let keys = Object.keys(obj);
        for (let key of keys) {
          if (key === 'in' && parent === 'parameters.[]' && !('required' in obj)) {
            result.required = obj[key] === 'path';
          }
          // Кастомные ключевые слова
          if (['rel', 'i18n', 'errors', 'const', '$async', 'patternProperties', 'exclusiveMinimum'].indexOf(key) !== -1 && parent !== 'properties') {
            if (key === 'i18n') {
              result.type = 'string';
            }
            continue;
          }
          // Пустые required
          if (key === 'required' && Array.isArray(obj[key]) && obj[key].length === 0) {
            continue;
          }
          // Сессия в роутах
          if (key === 'session' && ['get', 'post', 'put', 'delete', 'patch', 'head'].indexOf(parent) !== -1) {
            continue;
          }
          // Скрытые
          if (key === '_tree' || key === '_key') {
            continue;
          }
          result[key.replace(/\\/g, '/')] = filter(obj[key], `${key}`);
        }
      } else if (typeof obj === 'function') {
        result = 'func';
      } else {
        result = obj;
      }
      return result;
    };
    return filter(this.specification);
  }

  /**
   * Кастомное сообщение об ошибке
   * @param key
   * @param schema
   * @param property
   * @returns {*}
   */
  getCustomMessage(key, schema, property, message) {
    let result;
    if (schema && schema.errors) {
      if (typeof schema.errors === 'string') {
        result = schema.errors;
      } else {
        if (key in schema.errors) {
          result = schema.errors[key];
        }
        if ('*' in schema.errors) {
          result = schema.errors['*'];
        }
      }
    }
    if (result === false) {
      return false;
    }
    if (!result) {
      return {rule: key, message};
    } else if (typeof result === 'object') {
      return result;
    }
    return {rule: key, message};
  };

  /**
   * Исключение с подробным описанием ошибок по схеме
   * @param rootField
   * @param validationError
   * @param value
   * @returns {*}
   */
  customErrors(rootField = '', validationError, value) {
    const combinePath = (...paths) => {
      return paths.join('/')
        .replace(/(\/\/|\[)/g, '/') // замена двух точек или [ на слэш
        .replace(/(^[.\/]|[.\/]$|])/g, ''); // удаление точки или слэша в начале и конце, удаление ]
    };
    const errorsList = validationError.errors || this.validator.errors;
    let issues = [];
    if (errorsList) {
      errorsList.map(({keyword, params, dataPath, schema, parentSchema, message}) => {
        let key, path, customMessage;
        switch (keyword) {
          case 'required':
            key = params.missingProperty;
            path = combinePath(...rootField.split('/'), dataPath, key);
            customMessage = this.getCustomMessage(keyword, schema[key], key, message);
            if (customMessage !== false) {
              issues.push({
                path: path,
                rule: customMessage.rule,
                message: customMessage.message,
              });
            }
            break;
          default:
            key = dataPath.split('/').pop();
            customMessage = this.getCustomMessage(keyword, parentSchema, key, message);
            if (customMessage !== false) {
              issues.push({
                path: combinePath(rootField, dataPath),
                rule: customMessage.rule,
                message: customMessage.message,
              });
            }
        }
      });
    }
    console.log(JSON.stringify(issues, null, 2));
    return new errors.Validation(issues);
  };

  extend(def, newDef) {
    let result = def;
    if (typeof def === 'string') {
      result = this.get(def);
    }
    if (typeof def === 'function') {
      result = def(this);
    } else {
      result = def;
    }
    result = objectUtils.merge(result, newDef/*, {replaceEmpty: true}*/);

    if (result.$mode) {
      if (result.$mode === 'view') {
        result = this.clearRulesView(result);
      } else if (result.$mode === 'update') {
        result = this.clearRulesUpdate(result);
      }
      delete result.$mode;
    }

    return result;
  }

  clearRulesView(schema) {
    let result = {};
    let keys = Object.keys(schema);
    for (let key of keys) {
      if (['type', 'description', 'title', 'items',
        'properties', 'additionalProperties', '$ref', '$id', 'i18n', 'anyOf', 'oneOf', 'allOf', 'not',
        'toDate', 'toObjectId',
      ].indexOf(key) !== -1) {
        result[key] = schema[key];
      }
      if (key === 'i18n') {
        result[key] = 'out';
      }
      if (key === 'items') {
        result[key] = this.clearRulesView(result[key]);
      }
      if (key === 'properties') {
        let propsNames = Object.keys(result[key]);
        for (let propName of propsNames) {
          result[key][propName] = this.clearRulesView(result[key][propName]);
        }
      }
      if (key === 'required') {
        result[key] = [];
      }
      if (key === '$ref' && schema[key] === '#/components/schemas/object-id') {
        delete result['$ref'];
        result['type'] = 'string';
      }
    }
    return result;
  };

  /**
   * @todo
   * @param schema
   * @returns {{}}
   */
  clearRulesUpdate(schema) {
    let result = {};
    let keys = Object.keys(schema);
    for (let key of keys) {
      if (['default'].indexOf(key) === -1) {
        result[key] = schema[key];
      }
      if (key === 'items') {
        result[key] = this.clearRulesUpdate(result[key]);
      }
      if (key === 'properties') {
        let propsNames = Object.keys(result[key]);
        for (let propName of propsNames) {
          result[key][propName] = this.clearRulesUpdate(result[key][propName]);
        }
      }
      if (key === 'required') {
        result[key] = [];
      }
    }
    return result;
  };

  /**
   * @todo Перенести в storage
   * @param schema
   * @param path
   * @param type
   * @returns {{}}
   */
  findLinks(schema, path = '', type = '') {
    let result = {};
    if (typeof schema === 'object') {
      if (schema.rel) {
        result[path] = Object.assign({}, {size: '1'}, schema.rel);
        // @todo Если свойство - деревро, то запомнить соответствие типа и названия дерева (чтобы знать в каких коллекциях отношение)
        if (schema.rel.tree) {
          if (!this.trees[schema.rel.tree]) {
            this.trees[schema.rel.tree] = {};
          }
          this.trees[schema.rel.tree][type] = path;
          result[path].treeTypes = this.trees[schema.rel.tree];
        }
      } else if (schema.type === 'array' && schema.items) {
        if (schema.items.rel) {
          result[path] = Object.assign({}, {size: 'M'}, schema.items.rel);
        } else if (schema.items.type === 'object' && schema.items.properties) {
          let propsNames = Object.keys(schema.items.properties);
          for (let propName of propsNames) {
            Object.assign(
              result,
              this.findLinks(schema.items.properties[propName], `${path}${path ? '.' : ''}${propName}`, type),
            );
          }
        }
      } else if (schema.properties) {
        let propsNames = Object.keys(schema.properties);
        for (let propName of propsNames) {
          Object.assign(
            result,
            this.findLinks(schema.properties[propName], `${path}${path ? '.' : ''}${propName}`, type),
          );
        }
      }
    }
    return result;
  }
}

module.exports = Spec;
