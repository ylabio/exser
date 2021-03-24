const MongoDB = require('mongodb');
const ObjectID = MongoDB.ObjectID;
const {queryUtils, objectUtils, stringUtils} = require('../../utils');
const mc = require('merge-change');

class Storage {

  constructor() {
  }

  async init(config, services) {
    this.config = config;
    this.services = services;
    this.spec = await this.services.getSpec();
    this._client = await MongoDB.MongoClient.connect(this.config.db.url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    this._db = this._client.db(this.config.db.name);
    this._collections = {};
    if (config.mode === 'clear') {
      await this.clearStorage();
    }
    await this.initModelProperties();
    await this.initModels();
    await this.initCounter();
    return this;
  }

  /**
   * Регистрация конструкторов (классов) для свойств моделей. Например ObjectID, Relation, Order, StringI18n
   * Для таких свойство используется ключевое слово instance в схеме модели.
   * Сервис Spec по умолчанию понимает только нативные классы JS, например Date
   */
  async initModelProperties() {
    const propKeys = Object.keys(this.config.properties);
    for (const key of propKeys) {
      this.spec.setKeywordInstanceClass(this.config.properties[key]);
    }
  }

  /**
   * Инициализация всех сервисов моделей
   * При инициализации как парвило создаётся коллекция в монге, индексы и регается схема модели в сервисе spec
   * @returns {Promise<void>}
   */
  async initModels() {
    const modelKeys = Object.keys(this.config.models);
    for (const key of modelKeys) {
      const ModelClass = this.config.models[key];
      const instance = new ModelClass();
      const type = instance.type();
      this._collections[type] = instance;
      await this._collections[type].init(this.config[instance.configName()], this.services);
    }
  }

  /**
   * Инициализация коллекции для счётчика
   * Используется методом this.newCode()
   * @returns {Promise<void>}
   */
  async initCounter() {
    this.counters = await this.define('_counters', {collection: '_counters'});
  }

  /**
   * Генераор-счётчик
   * @param namespace {Object} Уникальные свойства счётчика, чтобы отличать его от других (если нужен не глобальный)
   * @returns {Promise<*>}
   */
  async newCode(namespace = {scope: 'global'}) {
    const result = await this.counters.findAndModify(
      namespace,
      [['_id', 'asc']],
      {$inc: {count: 1}},
      {upsert: true},
    );
    if (!result.value) {
      return 1;
    } else {
      return result.value.count + 1;
    }
  }

  /**
   * Инициализация коллекции
   * @param type
   * @param name
   * @param indexes
   * @param options
   * @param schemes
   * @param service
   * @returns {Promise.<MongoDB.Collection>}
   */
  async define(type, {collection, indexes, options, schemes}, service) {
    if (!collection) {
      throw new TypeError('Not defined name of the collection');
    }
    if (!type) {
      type = collection;
    }
    if (!indexes) {
      indexes = {};
    }
    if (!options) {
      options = {};
    }
    if (!schemes) {
      schemes = {};
    }
    const mongoCollection = await new Promise((resolve, reject) => {
      options.strict = true;
      this._db.collection(collection, options, (err, coll) => {
        if (err !== null) {
          this._db.createCollection(collection, {}, (err, coll) => {
            if (err === null) {
              resolve(coll);
            } else {
              reject(err);
            }
          });
        } else {
          resolve(coll);
        }
      });
    });
    await this._defineIndexes(mongoCollection, indexes);
    if (service) {
      this._collections[type] = service;
    }
    return mongoCollection;
  }

  /**
   * Создание индексов
   * @param collection
   * @param indexes
   * @returns {Promise.<void>}
   * @private
   */
  async _defineIndexes(collection, indexes) {
    const indexKeys = Object.keys(indexes);
    for (let key of indexKeys) {
      if (!indexes[key][1]) {
        indexes[key].push({});
      }
      if (!indexes[key][1].name) {
        indexes[key][1].name = key;
      }
      if (!await collection.indexExists(indexes[key][1].name)) {
        await collection.createIndex(indexes[key][0], indexes[key][1]);
      }
    }
  }

  /**
   * Ссылка на драйвер монги
   * @returns {*}
   */
  get db() {
    return this._db;
  }

  /**
   *
   * @param type
   * @returns {Model}
   */
  getModelService(type) {
    if (!this._collections[type]) {
      throw new Error('Model service "' + type + '" not found');
    }
    return this._collections[type];
  }

  /**
   *
   * @param type
   * @param base
   * @return {(Model|*)}
   */
  get(type, base = '') {
    if (base) {
      if (!type || !type.match(`^${stringUtils.escapeRegex(base)}($|-)`)) {
        type = base + (type ? '-' + type : '');
      }
    }
    return this.getModelService(type);
  }

  /**
   * Догрузка/фильтр свойств объекта
   * @param object
   * @param fields
   * @param empty
   * @param session
   * @returns {Promise<*>}
   * @deprecated
   */
  async loadByFields({object, fields, empty = true, session}) {
    if (typeof fields === 'string') {
      fields = queryUtils.parseFields(fields);
    }
    if (!fields || fields === 1) {
      return object;
    }
    const keys = Object.keys(fields);
    let result = {};
    if ('*' in fields) {
      result = object;//mc.merge(object, {});
    }

    for (let key of keys) {
      let rel, link;
      if (key in object) {
        try {
          const type = mc.utils.type(object[key]);
          if (type === 'Array') {
            result[key] = [];
            for (let item of object[key]) {
              link = await this.loadByFields({
                object: item,
                fields: fields[key],
                empty: false,
                session,
              });
              if (item._id) {
                const rel = await this.loadRel({rel: item, fields: fields[key], session});
                if (Object.keys(rel).length) {
                  link = Object.assign(rel, link);
                  result[key].push(link);
                }
              } else {
                result[key].push(link);
              }
            }
          } else if (type === 'Object' && mc.utils.type(fields[key]) === 'Object') {
            link = await this.loadByFields({
              object: object[key],
              fields: fields[key],
              empty: false,
              session,
            });
            // @todo PropertyRel
            if (object[key]._id && (fields[key]['*'] || Object.keys(fields[key]).length > 0)) {
              result[key] = Object.assign(
                await this.loadRel({rel: object[key], fields: fields[key], session}),
                link,
              );
            } else {
              result[key] = link;
            }
          } else {
            result[key] = object[key];
          }
        } catch (e) {
          console.log(key, object, fields);
          throw e;
        }
      } else if (empty && key !== '*') {
        result[key] = null;
      }
    }
    // if (!result._id && object._id) {
    //   result._id = object._id;
    // }
    return result;
  }

  /**
   * Выборка объекта по rel и догрузка/фильтр свойств объекта
   * @param rel
   * @param fields
   * @param session
   * @returns {Promise<*>}
   * @deprecated
   */
  async loadRel({rel, fields, session}) {
    try {
      if (rel._id && rel._type) {
        return await this.getModelService(rel._type).getOne({
          filter: {_id: new ObjectID(rel._id)},
          fields,
          session,
          throwNotFound: false,
        });
      }
    } catch (e) {
    }
    return {};
  }

  async clearStorage() {
    let list = await this._db.listCollections().toArray();
    for (let collection of list) {
      if (collection.name.indexOf('system.') === -1) {
        await this._db.dropCollection(collection.name);
      }
    }
  }

  is(type, needType) {
    return type && needType && !!type.match(`^${stringUtils.escapeRegex(needType)}($|-)`);
  }

  /**
   * Поиск метаданных в схеме модели
   * @param schema {Object} Схема текущего свойства. (Начинается со схемы всей модели)
   * @param model {String} Название модели
   * @param result {Object} Объект с найденными метаданными
   * @param path {String} Путь текущего свойства (Начинается с пустого)
   * @returns {{}}
   */
  findPropertiesWithInstance(schema, model, result = {}, path = '') {
    if (typeof schema === 'object') {
      // Запоминаем ключевое слово схемы по пути на свойство
      if ('instance' in schema) {
        if (!(path in result)) {
          result[path] = {};
        }
        result[path] = schema.instance;
      }
      if (schema.type === 'array' && schema.items) {
        if (schema.items.type === 'object' && schema.items.properties) {
          let propsNames = Object.keys(schema.items.properties);
          for (let propName of propsNames) {
            // Двойными слэшами кодируется множественность свойства (массив)
            this.findPropertiesWithInstance(schema.items.properties[propName], model, result, `${path}${path ? '//' : '/'}${propName}`);
          }
        }
      } else if (schema.type === 'object' && schema.properties) {
        let propsNames = Object.keys(schema.properties);
        for (let propName of propsNames) {
          this.findPropertiesWithInstance(schema.properties[propName], model, result, `${path}${path ? '.' : ''}${propName}`);
        }
      }
    }
    return result;
  }

  /**
   * @deprecated
   */
  getRootSession() {
    return {
      user: {
        _id: new ObjectID(),
        _type: 'user-admin',
        type: 'admin',
        email: 'root@boolive.com',
        profile: {
          name: 'root',
        },
        status: 'confirm',
        isBlocked: false,
        isDeleted: false,
      },
    };
  }
}

module.exports = Storage;
