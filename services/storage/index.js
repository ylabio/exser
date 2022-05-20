const MongoDB = require('mongodb');
const Service = require("../service");

class Storage extends Service {

  async init(config, services) {
    await super.init(config, services);
    this.spec = await this.services.getSpec();
    this.client = new MongoDB.MongoClient(this.mongoUrl(this.config.db.url), {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    await this.client.connect();
    this.db = this.client.db(this.config.db.name);
    this.models = {};
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
   * Из-за связанности моделей их нужно все сразу инициализировать
   * @returns {Promise<void>}
   */
  async initModels() {
    const modelKeys = Object.keys(this.config.models);
    for (const key of modelKeys) {
      const ModelClass = this.config.models[key];
      const instance = new ModelClass();
      const type = instance.name();
      this.models[type] = instance;
      await this.models[type].init(this.config[instance.configName()], this.services, this);
    }
  }

  /**
   * Инициализация коллекции для счётчика
   * Необходимо для работы метода this.newCode()
   * @returns {Promise<void>}
   */
  async initCounter(clean = false) {
    this.counters = await this.defineCollection({name: '_counters', redefine: clean});
  }

  /**
   * Инициализация коллекции
   * @param name {String} Название коллекции
   * @param collection {String} Название коллекции
   * @param indexes {Object} Индексы
   * @param options {Object} Опции коллекции
   * @param redefine {Boolean} Пересоздать коллекцию, удалить данные и заново создать индексы
   * @returns {Promise.<MongoDB.Collection>}
   */
  async defineCollection({name, collection, indexes, options, redefine = false}) {
    if (!name && collection) name = collection;
    if (!collection && name) collection = name;
    if (!name && !collection) throw new TypeError('Not defined collection name');
    if (!indexes) indexes = {};
    if (!options) options = {};

    // Проверка существования коллекции
    const exists = await this.isCollectionExists(name);
    // Если коллекция есть, но надо её переопределить, то удаляем её
    if (exists && redefine) {
      await this.db.dropCollection(collection);
    }
    let mongoCollection;
    // Если коллекции нет ИЛИ её надо переопределить, то создаём её
    if (!exists || redefine) {
      mongoCollection = await this.db.createCollection(collection);
    } else {
      mongoCollection = this.db.collection(collection, options);
    }
    // Индексы
    const indexKeys = Object.keys(indexes);
    for (let key of indexKeys) {
      if (!indexes[key][1]) {
        indexes[key].push({});
      }
      if (!indexes[key][1].name) {
        indexes[key][1].name = key;
      }
      if (!await mongoCollection.indexExists(indexes[key][1].name)) {
        await mongoCollection.createIndex(indexes[key][0], indexes[key][1]);
      }
    }
    return mongoCollection;
  }

  /**
   * Проверка существования коллекции
   * @param name {String}
   * @returns {Promise<boolean>}
   */
  async isCollectionExists(name){
    const collections = await this.db.listCollections().toArray();
    for (const collection of collections){
      if (collection.name === name) return true;
    }
    return false;
  }

  /**
   * Пересоздание коллекций в mongodb
   * Удаляются все данные, заново создаются коллекции по определениям моделей.
   * Связка сервисов-моделей с коллекциями не ломается
   * @returns {Promise<void>}
   */
  async clearStorage() {
    const names = Object.keys(this.models);
    for (const name of names) {
      await this.models[name].defineCollection(true);
    }
    await this.initCounter(true);
  }

  /**
   * Выбор сервиса модели по названию модели
   * @param name {String} название модели
   * @returns {Model}
   */
  get(name) {
    if (!this.models[name]) {
      throw new Error('Model service "' + name + '" not found');
    }
    return this.models[name];
  }

  /**
   * Генератор-счётчик
   * @param namespace {Object} Уникальные свойства счётчика, чтобы отличать его от других (если нужен не глобальный)
   * @returns {Promise<*>}
   */
  async newCode(namespace = {scope: 'global'}) {
    const result = await this.counters.findOneAndUpdate(
      namespace,
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
   * Формирование адреса к серверу mongoDB
   * @param params {String|{schema, user, password, host, port, defaultauthdb, options}}
   * @returns {string|*}
   */
  mongoUrl(params) {
    if (typeof params === 'object') {
      let result = params.schema || 'mongodb://';
      if (params.user) {
        result += `${encodeURIComponent(params.user)}:${encodeURIComponent(params.password)}@`;
      }
      result += params.host || 'localhost';
      if (params.port) {
        result += `:${params.port}`;
      }
      if (params.defaultauthdb) {
        result += `/${params.defaultauthdb}`;
      }
      if (typeof params.options === 'object') {
        const pairs = [];
        const keys = Object.keys(params.options);
        for (const key of keys) {
          pairs.push(`${key}=${encodeURIComponent(params.options[key])}`);
        }
        if (pairs.length) {
          result += '/?' + pairs.join('&');
        }
      }
      return result;
    }
    return params;
  }
}

module.exports = Storage;
