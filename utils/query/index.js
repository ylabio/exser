const escapeStringRegexp = require('escape-string-regexp');
const ObjectID = require('mongodb').ObjectID;
const moment = require('moment');
const mc = require('merge-change');

const queryUtils = {

  /**
   * Если строка представляет число, то конвертация в целое или действительное
   * @param value
   * @param type
   * @param trim
   */
  type(value, type = 'auto', trim = true) {
    let types = type === 'auto'
      ? ['number', 'boolean', 'null', 'date', 'objectid', 'string']
      : (Array.isArray(type)
          ? type
          : [type]
      );
    let testValue = typeof value === 'string' && trim ? value.trim() : value;
    type = types.shift();
    let result;
    try {
      switch (type.toLowerCase()) {
        case 'number':
          if (typeof value === 'string') {
            result = Number(testValue.replace(/\s/g, '').replace(/,/g, '.'));
          } else {
            result = Number(testValue);
          }
          if (!Number.isNaN(result) && result !== null) {
            return result;
          }
          break;

        case 'boolean':
        case 'bool':
          if (testValue && (testValue.toLowerCase() === 'true' || testValue === '1' || testValue === true)) {
            return true;
          }
          if ((testValue && testValue.toLowerCase() === 'false' || testValue === '0') || testValue === '' || testValue === false) {
            return false;
          }
          break;

        case 'date':
          const date = moment(testValue, [
            'YYYY-MM-DDTHH:mm:ss.SSSZ',
            'YYYY-MM-DDTHH:mm:ssZ',
            'YYYY-MM-DDTHH:mm:ss',
            'YYYY-MM-DD'], true);
          if (date.isValid()) {
            return date.toDate();
          }
          break;

        case 'string':
          if (typeof testValue !== 'string') {
            return testValue.toString();
          }
          return testValue;
        //break;

        case 'null':
          if (testValue === 'null' || testValue === null) {
            return null;
          }
          break;

        case 'regex':
          if (typeof testValue === 'string') {
            const params = testValue.match(/^\/(.*)\/([gimy]*)$/);
            if (params) {
              return new RegExp(params[1], params[2]);
            }
            return new RegExp(testValue);
          }
          if (value instanceof RegExp) {
            return value;
          }
          break;

        case 'objectid':
        case 'object-id':
          if (/^[0-9a-fA-F]{24}$/.test(testValue)) {
            return new ObjectID(testValue);
          }
          break;

        // Возвраст в дату рождения
        case 'age':
          result = Number(testValue);
          if (!Number.isNaN(result) && result !== null) {
            return moment().subtract(result, 'years').toDate()
          }
          break;
      }

      // Функция не завершена, значит тип не подходит
      if (types.length) {
        return queryUtils.type(value, types, trim);
      }
      // Приведение типа не выполнено
      return testValue;

    } catch (e) {

      console.log('bad type');
      return testValue;
    }
  },

  parseFieldIgnore: (object) => {
    if (object && typeof object === 'object') {
      let keys = Object.keys(object);
      let result = {};
      for (let key of keys) {
        if (key.substr(0, 1) === '!') {
          result[key.substr(1)] = false;
        } else {
          result[key] = queryUtils.parseFieldIgnore(object[key]);
        }
      }
      return result;
    }
    return object;
  },

  /**
   * Парсер форматированной строки, перечисляющей поля для выборки
   * @param fieldsString String
   * @return {Object|Boolean}
   */
  parseFields: (fieldsString) => {
    const type = typeof fieldsString;
    // Если объект, то считаем преобразование уже выполнено
    if (fieldsString && type === 'object') {
      return fieldsString;
    }
    // Если не строка или пустая строка, то всегда true
    if (type !== 'string' || fieldsString === '') {
      return true;
    }
    // Преобразование строки в объект
    let formatted = fieldsString.replace(/["'`]?([^"'`()\s,{}]+)["'`]?\s*(,|$|\)|\})/uig, '"$1":true$2');
    formatted = formatted.replace(/["'`]?([^"'`()\s,{}]+)["'`]?\s*([({])/uig, '"$1":{');
    formatted = '{' + formatted.replace(/\)/g, '}') + '}';
    try {
      return queryUtils.parseFieldIgnore(JSON.parse(formatted));
    } catch (e) {
      throw {message: 'Incorrect fields format', name: 'ParseFieldsException'};
    }
  },

  inFields: (fields, prop, strick = false) => {
    fields = ((typeof fields === 'string') ? queryUtils.parseFields(fields) : fields) || {};
    // @todo проверка в *
    return mc.utils.get(fields, prop, false);
  },

  setField: (fields, name, value) => {
    const obj = (typeof fields === 'string') ? queryUtils.parseFields(fields) : fields;
    obj[name] = value;
    return obj;
  },

  loadByFields: async ({
                         object,
                         fields,
                         depth = {},
                         limit = {},
                         defaultValue = undefined,
                         typeField = '_type',
                         parentFields = undefined,
                         currentPath = '',
                         action
                       }) => {
    fields = queryUtils.parseFields(fields);
    // Возврат всего значения в простом формате
    if (fields === true) {
      return object; // отдаём как есть
    }
    if (fields === false) {
      return undefined;
    }
    // Ссылка на родительский шаблон
    let isRecursive = false;
    if (fields['^']) {
      // Добавляем поля родительского шаблона взамен ^
      fields = mc.merge(fields, {
        $set: parentFields,
        $unset: ['^']
      });
      // Ограничение глубины вложенности
      if (currentPath in depth && depth[currentPath] !== '*') {
        depth = mc.merge({}, depth);
        depth[currentPath]--;
        if (depth[currentPath] < 0) {
          return undefined;
        }
      }
      // Признак нужен, чтобы не менять текущий путь на свойство
      isRecursive = true;
    }
    // Возможность подгрузить объект, если есть метод load()
    const canLoad = (object && typeof object.load === 'function');
    let objectLoad;
    // Перебираем поля, чтобы добавить их или удалить
    let $preset = {};
    let $set = {};
    let $unset = [];
    if (object) {
      const fieldNames = Object.keys(fields);
      for (const fieldName of fieldNames) {
        let [type, name] = fieldName.split(':');
        if (!name) {
          name = type;
          type = null;
        }
        if (!type || object[typeField] === type) {
          if (fields[name] === false) {
            // Исключение свойства
            $unset.push(name);
          } else if (name === '*') {
            // Предустанавливаем все возможные свойства
            $set = mc.utils.plain(object);
            if (canLoad) {
              // Все свойства из подгруженного объекта
              if (!objectLoad) objectLoad = await object.load({action});
              $preset = mc.utils.plain(objectLoad);
            }
          } else {
            // Если нет свойства в object
            if (!(name in object)) {
              // Подгружаем объект, чтобы от туда попробовать взять
              if (canLoad) {
                if (!objectLoad) objectLoad = await object.load({action});
              }
              // Если нет objectLoad или в objectLoad нет свойства, то установка defaultValue
              if (!objectLoad || !(name in objectLoad)) {
                if (defaultValue !== undefined) $set[name] = defaultValue;
              } else {
                // свойство обнаружилось
                $set[name] = await queryUtils.loadByFields({
                  object: objectLoad[name],
                  fields: fields[fieldName],
                  defaultValue,
                  parentFields: fields,
                  depth,
                  limit,
                  currentPath: isRecursive ? currentPath : (currentPath ? currentPath + '.' + name : name),
                  action
                });
              }
            } else {
              if (Array.isArray(object[name])) {
                currentPath = isRecursive ? currentPath : (currentPath ? currentPath + '.' + name : name);
                let limitCnt = (currentPath in limit && limit[currentPath]!=='*') ? limit[currentPath] : Infinity;
                $set[name] = [];
                for (let item of object[name]) {
                  if (limitCnt < 1) break;
                  const fieldValue = await queryUtils.loadByFields({
                    object: item,
                    fields: fields[fieldName],
                    defaultValue,
                    parentFields: fields,
                    depth,
                    limit,
                    currentPath,
                    action
                  });
                  if (fieldValue !== undefined) {
                    $set[name].push(fieldValue);
                    limitCnt--;
                  }
                }
              } else {
                const fieldValue = await queryUtils.loadByFields({
                  object: object[name],
                  fields: fields[fieldName],
                  defaultValue,
                  parentFields: fields,
                  depth,
                  limit,
                  currentPath: isRecursive ? currentPath : (currentPath ? currentPath + '.' + name : name),
                  action
                });
                if (fieldValue !== undefined) {
                  $set[name] = fieldValue;
                }
              }
            }
          }
        }
      }
    }
    return mc.update($preset, {$set, $unset});
  },

  /**
   * Форматирование параметра сортировки
   * @param sortField String
   * @returns Object
   */
  parseSort: (sortField) => {
    if (typeof sortField === 'object'){
      return sortField;
    }
    if (typeof sortField === 'string') {
      let fields = sortField.split(',').map(field => field.replace(/\s/g, ''));
      let result = {};
      for (let field of fields) {
        if ((!field || field === '-')) {
          //bad sort
        } else if (field.substring(0, 1) === '-') {
          result[field.substring(1)] = -1;
        } else {
          result[field] = 1;
        }
      }
      if (Object.keys(result).length !== 0) {
        return result;
      }
    }
    return null;
  },


  /**
   * Создание условия фильра в монге
   * @param searchFields {Object} Поля со значениями для условия. Значения в строковом типе
   * {
   *   [key]: "value"
   * }
   * @param filterMap {Object} Параметры на поля для создания фильтра
   * {
   * [key]: {
   *   value: "" // предустановленное значение для сверки, замещает searchFields[key]
   *   default: "" // значение, если нет параметра в searchFields
   *   fields: ["name"] // название полей на которые создавать условие, по умолчанию [key]
   *   type: "ObjectId" // тип значения для конвертации из строки, по умолчанию "any" для автоматического определения
   *   cond: "eq" // условие, по умочланию "flex"
   *   join: "and" // если несколько fields, то способ объединения условий на несколько полей, по умочланию "or"
   * },
   * [key]: (value, key, searchFields) => ({fieldName: {$eq: value}})
   * }
   *
   * @returns {*}
   */
  makeFilter: (searchFields = {}, filterMap = {}) => {
    let result = [];
    if (!Array.isArray(searchFields) && searchFields === Object(searchFields)) {
      const keys = Object.keys(filterMap);
      for (let key of keys) {
        // Значение предустановленное, из параметра поиска или по умолчанию если нет параметра
        let value = typeof filterMap[key].value !== 'undefined'
          ? filterMap[key].value
          : (typeof searchFields[key] !== 'undefined'
              ? searchFields[key]
              : filterMap[key].default
          );
        if (typeof filterMap[key] === 'function') {
          const query = filterMap[key](value, key, searchFields);
          if (query !== null && typeof query === 'object') {
            if (query === false){
              result.push({_id: 0});
            } else {
              result.push(query);
            }
          }
        } else if (typeof value !== 'undefined') {
          // Поля, для которых формировать условие на value
          if (filterMap[key].field) {
            filterMap[key].fields = filterMap[key].field;
          }
          // Если не указан fields, то использовать ключ из filterMap
          if (!filterMap[key].fields || !filterMap[key].fields.length) {
            filterMap[key].fields = [key];
          }
          // Нормализация полей в массив
          if (!Array.isArray(filterMap[key].fields)) {
            filterMap[key].fields = [filterMap[key].fields];
          }
          // Тип значения
          if (filterMap[key].type) {
            filterMap[key].types = filterMap[key].type;
          }
          // Формируемое услвоие
          if (filterMap[key].kind) {
            filterMap[key].cond = filterMap[key].kind;
          }
          if (!filterMap[key].cond) {
            filterMap[key].cond = 'flex';
          }
          // Объединение условий на несколько полей
          if (!filterMap[key].join) {
            filterMap[key].join = '$or';
          }
          let fieldCondList = [];
          for (const filed of filterMap[key].fields) {
            const c = queryUtils.makeFilterField(filed, value, filterMap[key]);
            if (c) {
              // Сокращение условия равенства
              if (typeof c[filed] === 'object' && ('$eq' in c[filed]) && Object.keys(c[filed]).length === 1) {
                fieldCondList.push({[filed]: c[filed].$eq});
              } else {
                fieldCondList.push(c);
              }
            }
          }
          if (fieldCondList.length > 1) {
            result.push({[filterMap[key].join]: fieldCondList});
          } else {
            result.push(fieldCondList[0]);
          }
        }
      }
    }
    return result.length ? {$and: result} : {};
  },

  /**
   * Условие на поле
   * @param field {String}
   * @param value {String}
   * @param options {{types, trim}}
   * @returns {Object}
   */
  makeFilterField(field, value, options) {
    const type = (value) => queryUtils.type(value, options.types, options.trim);
    let splits;
    switch (options.cond) {
      case 'eq':
        return {[field]: {$eq: type(value)}};
      case 'ne':
        return {[field]: {$ne: type(value)}};
      case 'lt':
        return {[field]: {$lt: type(value)}};
      case 'lte':
        return {[field]: {$lte: type(value)}};
      case 'gt':
        return {[field]: {$gt: type(value)}};
      case 'gte':
        return {[field]: {$gte: type(value)}};
      case 'in':
        // Равенство одному из значению
        splits = value.split(/[|,]/);
        return {[field]: {$in: splits.map(v => type(v))}};
      case 'nin':
        // Неравенство всем значениям
        splits = value.split(/[|,+]/);
        return {[field]: {$nin: splits.map(v => type(v))}};
      case 'all':
        // Массив содержит все перечисленные значения
        splits = value.split(/[|,+]/);
        return {[field]: {$all: splits.map(v => type(v))}};
      case 'size':
        // Размер массива
        return {[field]: {$size: type(value, 'number')}};
      case 'range':
        // Попадание в диапазон
        splits = value.split(/[;~]/);
        if (splits.length > 1) {
          // ";20"
          if (!splits[0]) {
            return {[field]: {$lte: type(splits[1])}};
          }
          // "10;"
          if (!splits[1]) {
            return {[field]: {$gte: type(splits[1])}};
          }
          // "10;20"
          return {[field]: {$gte: type(splits[0]), $lte: type(splits[1])}};
        } else {
          // "10"
          return {[field]: {$eq: type(value)}};
        }
      case 'interval':
        // Попадание в интервал
        splits = value.split(/[;~]/);
        if (splits.length > 1) {
          // ";20"
          if (!splits[0]) {
            return {[field]: {$lt: type(splits[1])}};
          }
          // "10;"
          if (!splits[1]) {
            return {[field]: {$gt: type(splits[1])}};
          }
          // "10;20"
          return {[field]: {$gt: type(splits[0]), $lt: type(splits[1])}};
        } else {
          // "10"
          return {[field]: {$gt: type(splits[0]), $lt: type(splits[0])}}; // всегда false
        }
      case 'like-start':
        // Совпадение от начала строки без учета регистра
        return {[field]: new RegExp(escapeStringRegexp(value.trim()), 'i')};
      case 'like':
        // Содержится в строке без учета регистра
        return {[field]: new RegExp('^' + escapeStringRegexp(value.trim()), 'i')};
      case 'fulltext':
        // Полнотекстовый поиск (общее условие без указния поля)
        return {
          $text: {
            $search: value,
            //$language: options.lang || 'ru',
          }
        };
      case 'flex':
        // Формирование условия по спецсимволам в значении
        return queryUtils.parseConditionFlex(value, field, options.types, options.trim, options.flexDefault);
      default:
        throw new Error('Unsupported cond = "' + options.cond + '"');
    }
  },

  /**
   * Парсер условия сравнения по http://query.rest
   * @param condition {String}
   * @param field {String}
   * @param types (String|Array} Типы значения
   * @param trim
   * @param [defaultCond] {string} Операция по умолчанию, если она не выявлена в значении
   */
  parseConditionFlex: (condition, field, types, trim, defaultCond = '') => {
    const type = (value) => queryUtils.type(value, types, trim);
    if (condition.substr(0, 1) === '"') {
      return {[field]: {$eq: type(condition.substr(1))}};
    } else {
      let itemsCond = '$and';
      let items = condition.split('|');
      if (items.length > 1) {
        // OR
        itemsCond = '$or';
      } else {
        // AND
        items = condition.split('+');
        itemsCond = '$and';
      }

      const f = (item) => {
        // Отрицание условия
        const not = (item.substr(0, 1) === '!');
        if (not) {
          item = item.substr(1);
        }
        // Диапазон
        const range = item.split(';', 2);
        if (range.length > 1) {
          return not
            ? {$lt: type(range[0]), $gt: type(range[1])}
            : {$gte: type(range[0]), $lte: type(range[1])}
        }
        // Интервал
        const interval = item.split('~', 2);
        if (interval.length > 1) {
          return not
            ? {$lte: type(interval[0]), $gte: type(interval[1])}
            : {$gt: type(interval[0]), $lt: type(interval[1])}
        }
        // Отсутствие свойства или значения
        if (item === 'null') {
          return {$exists: not}
        }
        // Неравенство
        if (not) {
          return {$ne: type(item)};
        }
        const match = item.match(/^(\*|\^|%|\/|<{1,2}|>{1,2})?(.+)/);
        if (!match[1]) {
          match[1] = defaultCond;
        }
        switch (match[1]) {
          case '*':
            // Вхождение в строку
            return {$regex: new RegExp(escapeStringRegexp(match[2].trim()), 'i')};
          case '^':
            // Вхождение с сначала строки
            return {$regex: new RegExp('^' + escapeStringRegexp(match[2].trim()), 'i')};
          case '>':
            // Больше
            return {$gt: type(match[2])};
          case '>>':
            // Больше или равно
            return {$gte: type(match[2])};
          case '<':
            // Меньше
            return {$lt: type(match[2])};
          case '<<':
            // Меньше или равно
            return {$lte: type(match[2])};
          case '/':
          // Регулярка
          // @todo Отфильтровать на безопасность
          default:
            // Равенство
            return {$eq: type(match[2])};
        }
      };

      for (let i = 0; i < items.length; i++) {
        items[i] = f(items[i]);
      }
      if (items.length > 1) {
        return {[itemsCond]: items.map(item => ({[field]: item}))};
      } else {
        return {[field]: items[0]};
      }
    }
  },
};

module.exports = queryUtils;
