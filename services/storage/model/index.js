const ObjectID = require('mongodb').ObjectID;
const {errors, strings, schema, query} = require('../../../utils');
const deepEqual = require('deep-equal');
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
      this._name = strings.toDash(this.constructor.name);
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
   * @param config {Object} Параметры из конфига
   * @param services {Services} Менеджер сервисов
   * @returns {Promise.<Model>}
   */
  async init(config, services) {
    await super.init(config, services);
    this.spec = await this.services.getSpec();
    this.storage = await this.services.getStorage();
    this.access = await this.services.getAccess();
    this.defined = this.define();
    this.propertiesWithInstance = this.spec.findPropertiesWithKeyword({
      keyword: 'instance',
      schema: this.defined
    });
    // Нативный доступ к коллекции mongodb
    this.native = await this.defineCollection(false);
    // Схемы в спецификацию
    this.spec.set(`#/components/schemas/storage.${this.name()}`, this.defined);
    // Кэш для выборки изменений
    this.changes = {};
    return this;
  }

  async defineCollection(clean = false){
    this.native = await this.storage.defineCollection({
      name: this.name(),
      collection: this.defined.collection || this.name(),
      indexes: this.defined.indexes,
      options: this.defined.options,
      redefine: clean
    });
    return this.native;
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
    return schema.model({
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
        _id: schema.objectId({description: 'Идентификатор ObjectId'}),
        _type: schema.string({description: 'Тип объекта', defaults: this.name()}),
        _deleted: schema.boolean({description: 'Признак, удалён ли объект', defaults: false}),
        dateCreate: schema.date({description: 'Дата и время создания'}),
        dateUpdate: schema.date({description: 'Дата и время обновления'}),
        // proto: schema.rel({description: 'Прототип', model: [], tree: 'proto'}),
      },
      required: []
    });
  }

  /**
   * Выбор одного объекта
   * @param filter {Object} Фильтр для поиска одного объекта (или первого в списке)
   * @param session {SessionState} Сессия
   * @param [deleted] {Boolean} Проверять объект на метку "удаленный"
   * @param [doThrow] {Boolean} Кидать исключение если нет доступа или объект не найден. Иначе вернется null
   * @returns {Promise<Object>}
   */
  async findOne({filter, session, deleted = true, doThrow = true}) {
    const object = this.restoreInstances(
      await this.native.findOne(filter), session
    );
    // Проверка признака _deleted
    if (deleted) {
      if (!object || object._deleted) {
        if (doThrow) throw new errors.NotFound({filter});
        return null;
      }
    }
    // Контроль доступа на объект
    let deny = this.access.isDeny({action: `${this.name()}.find.one`, object, session});
    if (deny) {
      if (doThrow) throw new errors.Forbidden(deny);
      return null;
    }
    return object;
  }

  /**
   * Выбор списка объектов
   * @param [filter] {Object} Фильтр для поиска
   * @param [limit] {Number} Ограничения количества выборки
   * @param [skip] {Number} Смещение от начала выборки (от 0)
   * @param [sort] {Object} Параметры сортировки. Ключ название свойства, значение направление сортировки (1/-1)
   * @param session {SessionState} Сессия
   * @param [callback] {Function} Пользовательская функция на каждую выбранную запись
   * @param [deleted] {Boolean} Фильтровать объекты с меткой "удаленный"
   * @returns {Promise<Array<Object>>}
   */
  async findMany({
                   filter = {},
                   limit = 10,
                   skip = 0,
                   sort = {},
                   session,
                   callback,
                   deleted = true
                 }) {
    // Фильтр с учётом контроля доступа
    const aclFilter = this.access.makeFilterQuery({action: `${this.name()}.find.many`, session});
    if (aclFilter === false) return []; // Нет вообще доступа
    if (aclFilter !== true) filter = query.joinFilter(filter, aclFilter, '$and');

    // Не выбирать помеченные удаленными
    if (deleted) {
      filter = query.joinFilter(filter, {_deleted: false}, '$and');
    }

    // Выборка курсором
    const cursor = await this.native.find(filter).sort(sort).skip(parseInt(skip) || 0);
    if (limit !== Infinity && limit !== '*') {
      cursor.limit(parseInt(limit) || 10);
    }
    let i = 0;
    let object;
    let result = [];
    for await (const item of cursor) {
      object = this.restoreInstances(item, session);
      if (callback) {
        // Кэлбэк на каждую выбранную запись для кастомной обработки
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
   * @param [filter] {Object} Фильтр для поиска
   * @param [limit] {Number} Ограничения количества выборки
   * @param [skip] {Number} Смещение от начала выборки (от 0)
   * @param [sort] {Object} Параметры сортировки. Ключ название свойства, значение направление сортировки (1/-1)
   * @param session {SessionState} Сессия
   * @param [callback] {Function} Пользовательская функция на каждую выбранную запись
   * @param [deleted] {Boolean} Проверять объект на метку "удаленный"
   * @returns {Promise<{add: null, change: null, items: null, remove: null}>}
   */
  async findChanges({
                      key,
                      filter,
                      limit = 10,
                      skip = 0,
                      sort = {},
                      session,
                      callback,
                      deleted
                    }) {
    // @todo Применить mc.diff() вместо deepEqual так как надо учитывать экземпляры свойств
    const items = await this.findMany({
      filter,
      limit,
      skip,
      sort,
      session,
      callback,
      deleted
    });
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
   * @param session {SessionState} Сессия
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

      // Контроль доступа на объект после подготовки всех свойств
      let deny = this.access.isDeny({
        action: `${this.name()}.create.one`,
        object: objectValid,
        session
      });
      if (deny) {
        // noinspection ExceptionCaughtLocallyJS
        throw new errors.Forbidden(deny);
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
   * @param filter {Object} Фильтр для изменения одного объекта
   * @param body {Object} Изменяемые свойства. допустимы декларативные операции библиотек "merge-change"
   * @param [validate] {function} Кастомная функция валидации. Выполняется после базовой валидации
   * @param session {SessionState} Сессия
   * @param [prev] {Object} Текущий объект в базе. Передаётся, если быд уже выбран для оптимизации.
   * @param [deleted] {Boolean} Проверять объект на метку "удаленный"
   * @returns {Promise<Object>}
   */
  async updateOne({filter, body, validate, session, prev, deleted = true}) {
    // Текущий объект в базе
    if (!prev) {
      // При выборки не проверяем доступ
      session.commit({access: false});
      // Учитываем признак удаленного
      prev = await this.findOne({filter, session, deleted, doThrow: false});
      session.revert();
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

      // Контроль доступа на объект после подготовки всех свойств
      let deny = this.access.isDeny({
        action: `${this.name()}.update.one`,
        object: objectValid,
        session
      });
      if (deny) {
        // noinspection ExceptionCaughtLocallyJS
        throw new errors.Forbidden(deny);
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
   * @param filter {Object} Фильтр для изменения одного объекта если будет найден
   * @param body {Object} Изменяемые свойства или тело нового объекта
   * @param [validate] {function} Кастомная функция валидации. Выполняется после базовой валидации
   * @param session {SessionState} Сессия
   * @param [deleted] {Boolean} Проверять объект на метку "удаленный" если будет редактирование
   * @returns {Promise<Object>}
   */
  async upsertOne({filter, body, validate, session, deleted = true}) {
    let result;
    // При выборки пред значения не проверяем доступ
    session.commit({access: false});
    //  Учитываем признак удаленного если требуется
    let prev = await this.findOne({filter, session, deleted, doThrow: false});
    session.revert();
    if (!prev) {
      result = await this.createOne({body, session, validate});
    } else {
      // Проверять на _delete уже не требуется, так как проверили при выборке
      result = await this.updateOne({
        filter,
        body,
        validate,
        session,
        deleted: false,
        prev
      });
    }
    return result;
  }

  /**
   * Пометка объекта признаком удаленный
   * @param filter {Object} Фильтр для пометки одного объекта удаленным
   * @param session {SessionState} Сессия
   * @returns {Promise<Object>}
   */
  async deleteOne({filter, session}) {
    // Поиск объекта без контроля доступа, так как контроль ниже на действие delete
    session.commit({access: false});
    // Если объект не будет найден, то выбросится исключение
    let prev = await this.findOne({filter, session, deleted: true, doThrow: true});
    session.revert();
    // Контроль доступа на объект после подготовки всех свойств
    let deny = this.access.isDeny({
      action: `${this.name()}.delete.one`,
      object: prev,
      session
    });
    if (deny) {
      // noinspection ExceptionCaughtLocallyJS
      throw new errors.Forbidden(deny);
    }

    // Редактирование без проверки доступа и deleted, так как уже проверили
    session.commit({access: false});
    const result = await this.updateOne({
      filter,
      body: {_deleted: true},
      session,
      deleted: false,
      prev
    });
    session.revert();
    return result;
  }

  /**
   * Пометка множества объектов признаком удаленный
   * Возвращается количество удаленных (только тех что уще не были ранее удалены)
   * @param [filter] {Object} Фильтр для удаления множества объектов
   * @param session {SessionState} Сессия
   * @returns {Promise.<Object>}
   */
  async deleteMany({filter = {}, session}) {
    // Фильтр с учётом контроля доступа на удаление
    const accessFilter = this.access.makeFilterQuery({
      action: `${this.name()}.delete.many`,
      session
    });
    if (accessFilter === false) return [];
    if (accessFilter !== true) filter = query.joinFilter(filter, accessFilter, '$and');

    // Далее контроль доступа не нужно учитывать
    session.commit({access: false});
    // Используется перебор курсором
    let result = 0;
    await this.findMany({
      filter, limit: Infinity, session, deleted: true, callback: async (item) => {
        // @todo Не проверять доступ при редактировании
        await this.updateOne({
          filter: {_id: item._id},
          body: {_deleted: true},
          session,
          prev: item
        });
        result++;
      }
    });
    session.revert();
    return result;
  }

  /**
   * Физическое удаление объекта
   * @param filter {Object} Фильтр для уничтожения одного объекта
   * @param session {SessionState} Сессия
   * @returns {Promise.<boolean>}
   */
  async destroyOne({filter, session}) {
    // Выбор объекта без контроля доступа
    session.commit({access: false});
    const object = await this.findOne({
      filter,
      session,
      deleted: false,
      doThrow: true
    });
    session.revert();

    // Контроль доступа на объект после подготовки всех свойств
    let deny = this.access.isDeny({
      action: `${this.name()}.destroy.one`,
      object,
      session
    });
    if (deny) {
      // noinspection ExceptionCaughtLocallyJS
      throw new errors.Forbidden(deny);
    }

    // @todo По всем связям оповестить об удалении
    // Удаление из базы
    await this.native.deleteOne(filter);
    return true;
  }

  /**
   * Подсчёт количества объектов по критерию filter
   * @param filter {Object} Фильтр для подсчёта количества объектов
   * @param session {SessionState} Сессия
   * @param [deleted] {Boolean} Считать объекты с меткой "удаленный"
   * @returns {Promise<*|number>}
   */
  async findCount({filter = {}, session, deleted = true}) {
    // Фильтр с учётом контроля доступа
    const aclFilter = this.access.makeFilterQuery({action: `${this.name()}.find.count`, session});
    if (aclFilter === false) return 0; // Нет вообще доступа
    if (aclFilter !== true) filter = query.joinFilter(filter, aclFilter, '$and');

    // Не выбирать помеченные удаленными
    if (deleted) {
      filter = query.joinFilter(filter, {_deleted: false}, '$and');
    }
    // Подсчёт агрегацией
    let result = await this.native.aggregate([
      {$match: filter},
      {$count: 'count'}
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
   * Используется логика ключевого слова instance из схемы без выполнения валидации по всей схеме.
   * Предварительно по схеме модели найдены все свойства с ключевым словом instance.
   * @param value
   * @param session
   * @param path
   * @returns {*}
   */
  restoreInstances(value, session, path = '') {
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
    if (this.propertiesWithInstance[path]) {
      return this.spec.exeKeywordInstance(value, this.propertiesWithInstance[path], session, this.services);
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
  extend(defBase, defNew) {
    return mc.merge(defBase, defNew);
  }
}

module.exports = Model;
