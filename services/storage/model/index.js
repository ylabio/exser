const ObjectID = require('mongodb').ObjectID;
const moment = require('moment');
const {errors, stringUtils} = require('../../../utils');
const deepEqual = require('deep-equal');
const type = require('../../../utils/schema-utils');
const mc = require('merge-change');
const Service = require('./../../service');

class Model extends Service {

  /**
   * Название модели
   * Используется в качестве типа и для получения сервиса модели из storage
   * Определяется по названию класса. Составное название разделяется дефисом ModelName => model-name
   * @returns {*}
   */
  name() {
    if (!this._name) {
      this._name = stringUtils.toDash(this.constructor.name);
    }
    return this._name;
  }

  /**
   * Название сервиса для опции в общей конфигурации
   * По молчанию это тоже имя модели, но при наследовании моделей может возникнуть потребность
   * сохранить конфигурационный ключ базовой модели, тогда этот метод переопределяется.
   * @returns {*}
   */
  configName() {
    return this.name();
  }

  /**
   * Инициализация модели
   * @param config
   * @param services {Services}
   * @returns {Promise.<Model>}
   */
  async init(config, services) {
    await super.init(config, services);
    this.spec = await this.services.getSpec();
    this.storage = await this.services.getStorage();
    this.defined = this.define();
    this.propertiesWithInstance = this.spec.findPropertiesWithKeyword({
      keyword: 'instance',
      schema: this.defined
    });
    // Нативный доступ к коллекции mongodb
    this.native = await this.storage.defineCollection({
      name: this.name(),
      collection: this.defined.collection || this.name(),
      indexes: this.defined.indexes,
      options: this.defined.options
    });
    // Схемы в спецификацию
    this.spec.set(`#/components/schemas/storage.${this.name()}`, this.defined);
    // Кэш для выборки изменений
    this.changes = {};
    return this;
  }

  get schema() {
    if (!this.defined) {
      return this.define();
    }
    return this.defined;
  }

  /**
   * Параметры коллекции
   * @returns {{collection: string, indexes: {}}}
   */
  define() {
    return type.model({
      // Заголовок модели в документации
      title: 'Объект',
      // Название коллекции в mongodb
      collection: this.name(),
      // Индексы коллекции mongodb.
      // @see https://docs.mongodb.com/manual/reference/method/db.collection.createIndex/#mongodb-method-db.collection.createIndex
      indexes: {
        // order: [{'order': 1}, {}], // нельзя делать уникальным из-за сдвигов при упорядочивании
        // key: [{_key: 1}, {'unique': true, partialFilterExpression: {_key: {$exists: true}}}],
      },
      // Опции коллекции mongodb
      options: {},
      // Свойства модели в JSONSchema. Используются функции для генерации фрагментов схем.
      properties: {
        _id: type.objectId({description: 'Идентификатор ObjectId'}),
        _type: type.string({description: 'Тип объекта', defaults: this.name()}),
        _deleted: type.boolean({description: 'Признак, удалён ли объект', defaults: false}),
        dateCreate: type.date({description: 'Дата и время создания'}),
        dateUpdate: type.date({description: 'Дата и время обновления'}),
        // proto: type.rel({description: 'Прототип', model: [], tree: 'proto'}),
      },
      required: []
    });
  }

  /**
   * Выбор одного объекта
   * @param filter
   * @param session
   * @returns {Promise<*>}
   */
  async findOne({filter, session}) {
    return this.restoreInstances(
      await this.native.findOne(filter), session
    );
  }

  /**
   * Выбор списка объектов
   * @param filter
   * @param limit
   * @param skip
   * @param sort
   * @param session
   * @param callback
   * @returns {Promise<[]>}
   */
  async findMany({filter, limit = 10, skip = 0, sort = {}, session, callback}) {
    const cursor = await this.native.find(filter).sort(sort).skip(parseInt(skip) || 0);
    if (limit !== Infinity) {
      cursor.limit(parseInt(limit) || 10);
    }
    let i = 0;
    let object;
    let result = [];
    for await (const item of cursor) {
      object = this.restoreInstances(item, session);
      if (callback) {
        object = await callback(object, i);
        if (object) result.push(object);
      } else {
        result.push(object);
      }
      i++;
    }
    return result;
  }

  /**
   * Выбор списка объектов с вычислением различий с предыдущей выборкой
   * @param key Ключ выборки для последующего сравнения в повторных выборках
   * @param filter
   * @param limit
   * @param skip
   * @param sort
   * @param session
   * @param callback
   * @returns {Promise<{add: null, change: null, items: null, remove: null}>}
   */
  async findChanges({key, filter, limit = 10, skip = 0, sort = {}, session, callback}) {
    const items = await this.findMany({filter, limit, skip, sort, session, callback});
    let result = {
      add: null,
      remove: null,
      change: null,
      items: null,
    };
    if (!this.changes[key]) {
      result.items = items;
    } else {
      const prevItems = this.changes[key].items;
      const prevIndex = this.changes[key].index;
      result.add = [];
      result.change = [];
      // Новые и измененные объекты
      for (const item of items) {
        if (!(item._id in prevIndex)) {
          result.add.push(item);
        } else if (!deepEqual(item, prevItems[prevIndex[item._id]])) {
          result.change.push(item);
        }
        delete prevIndex[item._id];
      }
      // Отсутствующие объекты
      const delIds = Object.keys(prevIndex);
      result.remove = [];
      for (const id of delIds) {
        result.remove.push(prevItems[prevIndex[id]]);
      }
    }
    this.changes[key] = {
      items: items,
      index: {},
      date: (new Date()).getTime(),
    };
    items.forEach((item, index) => {
      this.changes[key].index[item._id] = index;
    });
    // Чистка старых данных
    if (Math.random() > 0.5) {
      const badDate = (new Date()).getTime() - this.config.changes.lifetime;
      const changeKeys = Object.keys(this.changes);
      for (const changeKey of changeKeys) {
        if (this.changes[changeKey].date < badDate) {
          delete this.changes[changeKey];
        }
      }
    }
    return result;
  }

  /**
   * Создание одного объекта
   * @param body {object} Объект для сохранения в баз
   * @param session {object} Объект сессии
   * @param [validate] {function} Кастомная функция валидации. Выполняется после базовой валидации
   * @returns {Promise<Object>}
   */
  async createOne({body, session, validate}) {
    try {
      let object = {};
      // Инициализация предопределенных свойств. (могут отсутствовать в пользовательской модели)
      if ('_id' in this.defined.properties) object._id = new ObjectID();
      if ('_type' in this.defined.properties) object._type = this.name();
      if ('_deleted' in this.defined.properties) object._deleted = false;
      if ('dateCreate' in this.defined.properties) object.dateCreate = new Date();
      if ('dateUpdate' in this.defined.properties) object.dateUpdate = new Date();

      // Клонирование и подмена значений  предопределенных свойств.
      object = mc.merge(object, body);

      // Валидация по схеме
      let objectValid = await this.validate({object, session});

      // Обработка свойств-экземпляров перед кастомной валидацией и сохранением объекта
      await this.processPropertiesWithInstance({
        method: 'beforeSave',
        value: objectValid,
        object: objectValid,
        session,
      });

      // Кастомная валидация
      if (validate) {
        objectValid = await validate({object: objectValid, source: object, session});
      }

      // запись в базу
      let result = (await this.native.insertOne(objectValid)).ops[0];

      // Обработка свойств-экземпляров после сохранения объекта
      await this.processPropertiesWithInstance({
        method: 'afterSave',
        value: objectValid,
        object: objectValid,
        session
      });

      // @todo Запись в историю?
      // @todo Оповестить о создании объекта

      // Подготовка на вывод
      return this.restoreInstances(object, session); // result
    } catch (e) {
      throw errors.convert(e);
    }
  }

  /**
   * Обновление одного объекта
   * @returns {Promise.<*|Object>}
   */
  async updateOne({filter, body, validate, session, prev}) {
    // Текущий объект в базе
    if (!prev) {
      prev = await this.findOne({filter, session});
    }
    if (!prev) {
      throw new errors.NotFound({filter}, 'Not found for update');
    }
    let _id = prev._id;
    try {
      let source = {};
      if ('dateUpdate' in this.defined.properties) source.dateUpdate = new Date();
      source = mc.merge(source, body);
      // Объект со всеми свойствами с учётом новых
      let object = mc.merge(prev, source);

      let objectValid = await this.validate({object, prev, session});

      objectValid.dateUpdate = new Date();
      objectValid.isNew = false;

      await this.processPropertiesWithInstance({
        method: 'beforeSave',
        value: objectValid,
        object: objectValid,
        prev,
        objectPrev: prev,
        session,
      });

      // Кастомная валидация
      if (validate) {
        objectValid = await validate({object: objectValid, prev, source, session});
      }

      // Вычисление отличий
      let diff = mc.utils.diff(prev, objectValid);

      // Запись отличий
      let operation = this.operationToMongo(diff);
      let result = await this.native.updateOne({_id}, operation);

      // Обработка свойств после сохранения
      await this.processPropertiesWithInstance({
        method: 'afterSave',
        value: objectValid,
        object: objectValid,
        prev,
        objectPrev: prev,
        session,
      });

      // @todo Оповестить об изменении объекта
      // @todo Запись в историю (diff?)

      return objectValid;
    } catch (e) {
      throw errors.convert(e);
    }
  }

  /**
   * Создание или перезапись объекта
   * @param filter
   * @param object
   * @returns {Promise.<Object>}
   */
  async upsertOne({filter, body, session}) {
    let result;
    let prev = await this.findOne({filter});
    if (!prev) {
      result = await this.createOne({body, session});
    } else {
      result = await this.updateOne({filter, body, session, prev});
    }
    return result;
  }

  /**
   * Пометка объекта признаком удаленный
   * @param filter
   * @param object
   * @returns {Promise.<Object>}
   */
  async deleteOne({filter, session}) {
    return await this.updateOne({
      filter,
      body: {_deleted: true},
      session
    });
  }

  /**
   * Пометка множества объектов признаком удаленный
   * Возвращается количество удаленных (только тех что уще не были ранее удалены)
   * @param filter
   * @param object
   * @returns {Promise.<Object>}
   */
  async deleteMany({filter = {}, session}) {
    filter = Object.assign({_deleted: false}, filter);
    let result = 0;
    let cursor = this.native.find(filter);
    while (await cursor.hasNext()) {
      const object = await cursor.next();
      await this.updateOne({
        filter: {_id: object._id},
        body: {_deleted: true},
        session
      });
      result++;
    }
    return result;
  }

  /**
   * Физическое удаление объекта
   * @param filter
   * @param object
   * @returns {Promise.<boolean>}
   */
  async destroyOne({filter, session}) {
    // По всем связям оповестить об удалении
    let result = await this.native.deleteOne(filter);
    if (result.deletedCount === 0) {
      throw new errors.NotFound({_id: id}, 'Not found for delete');
    }
    return true;
  }

  /**
   * Подсчёт количества объектов по критерию filter
   * @param filter
   * @param session
   * @returns {Promise<*|number>}
   */
  async getCount({filter = {}, session}) {
    let result = await this.native.aggregate([
      {
        $match: filter,
      },
      {
        $count: 'count',
      },
    ]).toArray();
    return result.length ? result[0].count : 0;
  }

  /**
   * Обратный вызов при изменении объекта
   * @param prev
   * @param object
   * @param diff
   * @returns {Promise<void>}
   */
  async onChange({prev, object, diff}) {

  }

  /**
   * Обратный вызов при создании объекта
   * @param object
   * @param diff
   * @param session
   * @returns {Promise<void>}
   */
  async onCreate({object, diff, session}) {

  }

  /**
   * Валидация объекта по указанной схеме
   * Используется сервис spec, в котором заранее регистрируется схема модели
   * @param object {object}
   * @param prev {object|null} Предыдущая версия объекта при валидации на изменение данных
   * @param session {object} Объект сессии
   * @returns {Promise<object>}
   */
  async validate({object, prev = null, session}) {
    return this.spec.validate(`#/components/schemas/storage.${this.name()}`, object, {session});
  }

  /**
   * Восстановление экземпляров свойств по схеме модели.
   * Обычно используется после выборки из базы данных.
   * Используется логика ключевого слова instance без выполнения валидации по всей схеме.
   * Предварительно в схеме модели найдены все свойства с ключевым словом instance.
   * @param value
   * @param session
   * @param path
   * @returns {*}
   */
  restoreInstances(value, session, path = '') {
    if (this.propertiesWithInstance[path]) {
      return this.spec.exeKeywordInstance(value, this.propertiesWithInstance[path], session, this.services);
    }
    const type = mc.utils.type(value);
    if (type === 'Object') {
      for (const [key, item] of Object.entries(value)) {
        const pathKey = path ? `${path}/${key}` : key;
        value[key] = this.restoreInstances(item, session, pathKey);
      }
    } else if (type === 'Array') {
      const pathKey = `${path}//`;
      for (let i = value.length - 1; i--; i >= 0) {
        value[i] = this.restoreInstances(value[i], session, pathKey);
      }
    }
    return value;
  }

  /**
   * Рекурсивная обработка свойств-экземпляров
   * @param value {*} Текущее значение свойства (объекта). Обработка рекурсивная, начинается с корня объекта
   * @param prev {object|null} Предыдущее значение свойства (объекта).
   * @param path {string} Путь на текущее свойство от корня объекта. Если пустая строка, то обрабатывается корень объекта
   * @param object {object} Обрабатываемый объекта (корень)
   * @param [objectPrev] {object} Текущий объект (корень) в базе, если выполняется обновление
   * @param pathMeta {string} Путь на текущее свойство в метаданных. Элемент массива кодируется двойным слэшем
   * @param method {string} Методы вызываемый у экземпляра свойства, если он есть
   * @returns {Promise<void>}
   */
  async processPropertiesWithInstance({
                                        value,
                                        prev,
                                        path = '',
                                        object,
                                        objectPrev,
                                        pathMeta = '',
                                        method = 'onStep',
                                      }) {
    if (this.propertiesWithInstance[pathMeta]) {
      if (value && typeof value[method] === 'function') {
        await value[method]({object, objectPrev, path, prev, model: this});
      }
    }
    if (mc.utils.type(value) === 'Array') {
      for (let index = 0; index < value.length; index++) {
        await this.processPropertiesWithInstance({
          value: value[index],
          prev: prev ? prev[index] : undefined,
          path: path + (path ? '/' : '') + index,
          pathMeta: path + '//',
          object,
          objectPrev,
          method,
        });
      }
    } else if (mc.utils.type(value) === 'Object') {
      let properties = Object.keys(value);
      for (let name of properties) {
        await this.processPropertiesWithInstance({
          value: value[name],
          prev: prev ? prev[name] : undefined,
          path: path + (path ? '/' : '') + name,
          pathMeta: path + (path ? '/' : '') + name,
          object,
          objectPrev,
          method,
        });
      }
    }
  }

  /**
   * Конвертация формата операций библиотеки "merge-change" в формат операций mongodb
   * @param operation
   * @returns {{$set: {}}}
   */
  operationToMongo(operation) {
    let result = {$set: {}};
    if (operation.$set) {
      result.$set = operation.$set;
    }
    if (operation.$unset && operation.$unset.length) {
      result.$unset = {};
      for (let unset of operation.$unset) {
        result.$unset[unset] = '';
      }
    }
    return result;
  }

  /**
   * Наследование схем
   * @param defBase {Object}
   * @param defNew {Object}
   * @returns {Object}
   */
  extend(defBase, defNew){
    return mc.merge(defBase, defNew);
  }
}

module.exports = Model;
