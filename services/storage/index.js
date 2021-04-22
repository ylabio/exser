const MongoDB = require('mongodb');
const Service = require("../service");

class Storage extends Service {

  async init(config, services) {
    await super.init(config, services);
    this.spec = await this.services.getSpec();
    this.client = await MongoDB.MongoClient.connect(this.config.db.url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
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
      await this.models[type].init(this.config[instance.configName()], this.services);
    }
  }

  /**
   * Инициализация коллекции для счётчика
   * Необходимо для работы метода this.newCode()
   * @returns {Promise<void>}
   */
  async initCounter() {
    this.counters = await this.defineCollection({name: '_counters'});
  }

  /**
   * Инициализация коллекции
   * @param name
   * @param collection
   * @param indexes
   * @param options
   * @returns {Promise.<MongoDB.Collection>}
   */
  async defineCollection({name, collection, indexes, options}) {
    if (!name && collection) name = collection;
    if (!collection && name) collection = name;
    if (!name && !collection) throw new TypeError('Not defined collection name');
    if (!indexes) indexes = {};
    if (!options) options = {};
    const mongoCollection = await new Promise((resolve, reject) => {
      options.strict = true;
      this.db.collection(collection, options, (err, coll) => {
        if (err !== null) {
          this.db.createCollection(collection, {}, (err, coll) => {
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
   * Удаление всех коллекций в mongodb
   * @returns {Promise<void>}
   */
  async clearStorage() {
    let list = await this.db.listCollections().toArray();
    for (let collection of list) {
      if (collection.name.indexOf('system.') === -1) {
        await this.db.dropCollection(collection.name);
      }
    }
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
}

module.exports = Storage;
