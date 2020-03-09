const ObjectID = require('mongodb').ObjectID;
const moment = require('moment');
const {errors, queryUtils, objectUtils, stringUtils} = require('../../../utils');
const deepEqual = require('deep-equal');

class Model {

  constructor() {

  }

  type() {
    if (!this._type) {
      this._type = stringUtils.toDash(this.constructor.name);
    }
    return this._type;
  }

  configName() {
    return this.type();
  }

  /**
   * @param config
   * @param services {Services}
   * @returns {Promise.<Model>}
   */
  async init(config, services) {
    this.config = config;
    this.services = services;
    this.spec = await this.services.getSpec();
    this.storage = await this.services.getStorage();

    this._define = this.define();
    this._schemes = await this.schemes();
    this._links = this.spec.findLinks(this._define.model, '', this.type());

    this.native = await this.storage.define(this._define, this);

    // Схемы в спецификацию
    // if (this._define.schema) {
    //   this.spec.schemas(this.type(), this._define.schema);
    // }
    const keys = Object.keys(this._schemes);
    for (let key of keys) {
      this.spec.schemas(this.type() + '.' + key, this._schemes[key]);
    }
    // if (Object.keys(this._links).length) {
    //   console.log(this.type(), this._links);
    // }
    this.changes = {};
    return this;
  }

  /**
   * Параметры коллекции
   * @returns {{collection: string, indexes: {}}}
   */
  define() {
    return {
      collection: 'objects', // название коллекции в монге
      indexes: {
        order: [{'order': 1}, {}], // нельзя делать уникальным из-за сдвигов при упорядочивании
        key: [{_key: 1}, {'unique': true, partialFilterExpression: {_key: {$exists: true}}}]
      },
      options: {},
      model: {
        type: 'object',
        title: 'Объект',
        properties: {
          _id: {type: 'string', description: 'Идентификатор ObjectId'},
          _type: {type: 'string', description: 'Тип объекта'},
          _key: {type: 'string', description: 'Дополнительный необязательный идентфиикатор'},
          order: {type: 'number', description: 'Порядковый номер'},
          dateCreate: {
            type: 'string',
            format: 'date-time',
            description: 'Дата и время создания в секундах'
          },
          dateUpdate: {
            type: 'string',
            format: 'date-time',
            description: 'Дата и время обновления в секундах'
          },
          isDeleted: {type: 'boolean', description: 'Признак, удалён ли объект', default: false},
          isNew: {type: 'boolean', description: 'Признак, новый ли объект', default: true}
        },
        additionalProperties: false
      }
    };
  }

  /**
   * Схемы для валидации или фильтра. Применются в методах коллекции
   * @returns {{}}
   */
  schemes() {
    let schemes = {};
    // Схема создания
    schemes.create = this.spec.extend(this._define.model, {
        title: `${this._define.model.title}. Создание`,
        properties: {
          $unset: ['_type', 'dateCreate', 'dateUpdate', 'isDeleted', 'isNew'],
        },
      });
    // Схема редактирования
    schemes.update = this.spec.extend(this._define.model, {
          title: `${this._define.model.title}. Изменение`,
          properties: {
            $unset: [
              '_id', '_type', 'dateCreate', 'dateUpdate', 'isNew'
            ]
          },
          $set: {
            required: []
          },
          $mode: 'update'
        }
      );
    // Схема просмотра
    schemes.view = this.spec.extend(this._define.model, {
        title: `${this._define.model.title}. Просмотр`,
        properties: {
          $unset: []
        },
        $set: {
          required: []
        },
        $mode: 'view'
      });
    // Схема просмотра для спсика
    schemes.viewList = {
        title: `${this._define.model.title}. Просмотр списка`,
        properties: {
          // используем схему view для каждого объекта в списке
          items: {type: 'array', items: this.spec.extend(schemes.view, {})},
          count: {type: 'integer', description: 'Количество объектов без учёта limit и skip'}
        }
      };
    // Схема для запроса на удаление (отметка признака удаления)
    schemes.delete = this.spec.extend(this._define.model, {
        title: `${this._define.model.title}. Удаление`,
        //properties: {
        // $leave: [
        //   'isDeleted'
        // ]
        //},
        $set: {
          required: ['isDeleted']
        },
      });
    return schemes;
  }

  /**
   * Выбор одного объекта
   * @param filter
   * @param view Применить схему валидации view (фильтровать) для найденного объекта
   * @param fields Какие поля выбрать, если view == true (с учётом схему валидации)
   * @param session Объект сессии с авторизованным юзером, языком
   * @param throwNotFound Исключение, если объект не найден
   * @returns {Promise.<Object>}
   */
  async getOne({filter = {}, view = true, fields = {'*': 1}, session, throwNotFound = true}) {
    const pFields = queryUtils.parseFields(fields) || fields || {};
    let result = await this.native.findOne(filter);
    if (throwNotFound && (!result || (view && !('isDeleted' in pFields) && result.isDeleted))) {
      throw new errors.NotFound({}, 'Not found');
    }
    if (result && view) {
      result = await this.view(result, {fields: pFields, session, view});
    }
    return result;
  }

  /**
   * Выбор списка
   * @param filter
   * @param sort
   * @param limit
   * @param skip
   * @param view Отфильтровать ответ в соответсвии со схемой отображения
   * @param fields
   * @param session
   * @param isDeleted
   * @returns {Promise.<{items, count}>}
   */
  async getList({
                  filter = {}, sort = {}, limit = 10, skip = 0,
                  view = true, fields = {'*': 1},
                  session, isDeleted = true
                }) {
    if (!(queryUtils.inFields(fields, 'isDeleted', false) || queryUtils.inFields(fields, 'items.isDeleted', false))) {
      filter = Object.assign({isDeleted: false}, filter);
    }
    const query = await this.native.find(filter)
      .sort(sort)
      .skip(parseInt(skip) || 0);
    if (limit !== '*') {
      query.limit(parseInt(limit) || 10);
    }

    let result = {
      items: await query.toArray()
    };

    if (view) {
      result = await this.viewList(result, {filter, fields, session, view});
    }

    return result;
  }

  async getListChanges({key, ...params}) {
    const current = await this.getList({...params});
    let result = {
      add: null,
      remove: null,
      change: null,
      items: null
    };
    let items = current.items;
    if ('count' in current) {
      result.count = current.count;
    }
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
      date: (new Date()).getTime()
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
   * @returns {Promise.<*|Object>}
   */
  async createOne({body, view = true, validate, prepare, fields = {'*': 1}, session, schema = 'create'}) {
    try {
      let object = objectUtils.clone(body);

      // Валидация с возможностью переопредления
      const validateDefault = (object) => this.validate(schema, object, session);
      object = await (validate ? validate(validateDefault, object) : validateDefault(object));

      // Системная установка/трансформация свойств
      const prepareDefault = async (object) => {
        object._id = object._id ? ObjectID(object._id) : new ObjectID();
        object._type = this.type();
        object.dateCreate = 'dateCreate' in object ? object.dateCreate : moment().toDate();
        object.dateUpdate = 'dateUpdate' in object ? object.dateUpdate : moment().toDate();
        object.isDeleted = 'isDeleted' in object ? object.isDeleted : false;
      };
      await (prepare ? prepare(prepareDefault, object) : prepareDefault(object));

      // Конвертация свойств для монги
      object = await this.convertTypes(object);

      // Order
      // Если неопредлен, то найти максимальный в базе
      if (!('order' in object)) {
        const orderFilter = this.orderScope(object);
        if (!object.isNew) {
          orderFilter.isNew = false;
        }
        const maxOrder = await this.native.find(orderFilter).sort({order: -1}).limit(1).toArray();
        object.order = maxOrder.length ? maxOrder[0].order + 1 : 1;
        if (!object.isNew) {
          await this.native.updateMany(this.orderScope(object, {order: {$gte: object.order}}), {
            $inc: {order: +1},
            $set: {dateUpdate: moment().toDate()}
          });
        }
      } else {
        // смещение делается для записей больше или равных order
        await this.native.updateMany(this.orderScope(object, {order: {$gte: object.order}}), {
          $inc: {order: +1},
          $set: {dateUpdate: moment().toDate()}
        });
      }

      // запись в базу
      let result = (await this.native.insertOne(object)).ops[0];

      // По всем связям оповестить об их добавлении
      await this.saveLinks({
        object: result,
        path: '',
        set: result
      });

      if (result._type !== 'history') {
        //const history = await this.storage.get('history');
        const diff = objectUtils.getChanges({}, result);
        if (Object.keys(diff).length) {
          await this.onCreate({object: result, diff, session});
        }
      }

      // Подготовка на вывод
      return view ? await this.view(result, {fields, session, view}) : result;
    } catch (e) {
      throw errors.convert(e);
    }
  }

  /**
   * Обновление одного объекта
   * @returns {Promise.<*|Object>}
   */
  async updateOne({id, filter = {}, body, view = true, validate, prepare, fields = {'*': 1}, session, prev, upsert = false, schema = 'update'}) {
    let object = objectUtils.clone(body);
    if (!prev) {
      if (id){
        filter = {_id: new ObjectID(id)};
      }
      prev = await this.native.findOne(filter);
    }
    if (!prev){
      if (upsert && !body._id){
        return await this.createOne({body, view, fields, session});
      } else {
        throw new errors.NotFound({filter}, 'Not found for update');
      }
    }
    let _id = prev._id;
    try {
      // Валидация с возможностью переопредления
      const validateDefault = (object) => this.validate(schema, object, session);
      object = await (validate ? validate(validateDefault, object, prev) : validateDefault(object, prev));

      // @todo удаление обратных связей, если связи изменены

      // Конвертация значений для монги
      object = await this.convertTypes(object);

      // Системная установка/трансформация свойств
      const prepareDefault = (object, prev) => {
        object.dateUpdate = moment().toDate();
        //object.isNew = false;
      };
      await (prepare ? prepare(prepareDefault, object, prev) : prepareDefault(object, prev));

      // Конвертация в плоский объект
      let $set = objectUtils.convertForSet(object, true);

      let result = await this.native.updateOne({_id}, {$set});

      if (result.matchedCount) {
        const objectNew = await this.getOne({filter: {_id}, view: false, fields, session});

        // Сдвиг order
        const prevOrder = this.isNewScope(prev, objectNew) ? Number.MAX_SAFE_INTEGER : prev.order;
        if (objectNew.order > prevOrder) {
          // свдиг вверх, чтобы освободить order снизу
          await this.native.updateMany(this.orderScope(objectNew, {
              _id: {$ne: objectNew._id},
              order: {
                $gt: prevOrder,
                $lte: objectNew.order
              },
            }),
            {$inc: {order: -1}, $set: {dateUpdate: moment().toDate()}});
        } else if (objectNew.order < prevOrder) {
          // сдвиг вниз, чтобы освободить order сверху
          await this.native.updateMany(this.orderScope(objectNew, {
            _id: {$ne: objectNew._id},
            order: {
              $gte: objectNew.order,
              $lt: prevOrder
            }
          }), {$inc: {order: 1}, $set: {dateUpdate: moment().toDate()}});
        }

        // Обновление обратных отношений
        await this.saveLinks({
          object: objectNew, // новый объект
          path: '',
          set: objectNew, // новый объект для рекурсивного обхода
          setPrev: prev, // старый объект для рекурсивного обхода
          changes: object // изменения
        });

        // добавление записи в истории
        if (objectNew._type !== 'history') {
          //const history = await this.storage.get('history');
          const diff = objectUtils.getChanges(prev, objectNew, ['dateUpdate']);
          if (Object.keys(diff).length) {
            await this.onChange({prev, object: objectNew, diff, session});
          }
          // const historyBody = {
          //   relative: {
          //     _id: id,
          //     _type: prev._type,
          //   },
          //   diff,
          // };
          //await history.createOne({body: historyBody, session});
        }

        return view ? await this.view(objectNew, {fields, session, view}) : objectNew;
      }

      //throw new errors.NotFound({_id}, 'Not found for update');
      return false;
    } catch (e) {
      throw errors.convert(e);
    }
  }

  /**
   * Обновление множества объектов по условию
   * @returns {Promise<boolean>}
   */
  async updateMany({filter, body, validate, prepare, session, schema = 'update'}) {
    try {
      let object = objectUtils.clone(body);

      // Валидация с возможностью переопредления
      const validateDefault = (object) => this.validate(schema, object, session);
      object = await (validate ? validate(validateDefault, object) : validateDefault(object));

      // Конвертация значений для монги
      object = await this.convertTypes(object);

      // Системная установка/трансформация свойств
      const prepareDefault = (object) => {
        object.dateUpdate = moment().unix();
      };
      await (prepare ? prepare(prepareDefault, object) : prepareDefault(object));

      // Конвертация в плоский объект
      let $set = objectUtils.convertForSet(object);

      let result = await this.native.updateMany(filter, {$set});

      if (result.matchedCount) {
        return true;
      }
      return false;
    } catch (e) {
      throw errors.convert(e);
    }
  }

  /**
   * Создание или перезапись объекта
   * @param filter
   * @param object
   * @param view Отфильтровать ответ в соответсвии со схемой отображения
   * @returns {Promise.<Object>}
   */
  async upsertOne({filter, body, view = true, fields = {'*': 1}, session}) {
    let result;
    let object = await this.native.findOne(filter);
    if (!object) {
      result = await this.createOne({body, view, fields, session});
    } else {
      result = await this.updateOne({
        id: object._id.toString(), body, view, fields, session, prev: object
      });
    }
    return result;
  }

  /**
   * Пометка объекта как удаленный
   * @param id
   * @returns {Promise.<Object>}
   */
  async deleteOne({id, fields = {'*': 1, 'isDeleted': 1}, session}) {
    // По всем связям оповестить об изменении isDelete
    const pFields = queryUtils.parseFields(fields) || fields || {};
    pFields.isDeleted = 1;
    const _id = new ObjectID(id);
    return await this.updateOne({
      id: _id,
      body: {isDeleted: true},
      fields: pFields,
      session,
      schema: 'delete'
    });
  }

  /**
   * Пометка объекта как удаленный
   * @param id
   * @returns {Promise.<Object>}
   */
  async deleteMany({filter = {}/*, fields = {'*': 1, 'isDeleted': 1}*/, session}) {
    // По всем связям оповестить об изменении isDelete
    // const pFields = queryUtils.parseFields(fields) || fields || {};
    // pFields.isDeleted = 1;
    filter = Object.assign({isDeleted: false}, filter);
    let result = 0;
    let cursor = this.native.find(filter);
    while (await cursor.hasNext()) {
      const object = await cursor.next();
      await this.updateOne({
        id: object._id,
        body: {isDeleted: true},
        //fields: pFields,
        session,
        schema: 'delete',
        view: false
      });
      result++;
    }
    return result;
  }

  /**
   * Физическое удаление объекта
   * @param _id
   * @returns {Promise.<boolean>}
   */
  async destroyOne({id/*, fields = {'*': 1}*/, session}) {
    // По всем связям оповестить об удалении
    let result = await this.native.deleteOne({_id: new ObjectID(id)});
    if (result.deletedCount === 0) {
      throw new errors.NotFound({_id: id}, 'Not found for delete');
    }
    return true;
  }

  async getCount({filter = {}, session}) {
    let result = await this.native.aggregate([
      {
        $match: filter
      },
      {
        $count: 'count'
      }
    ]).toArray();
    return result.length ? result[0].count : 0;
  }

  /**
   * Фильтр объекта по схеме view и проекция по fields с подгрузкой связанных сущностей
   * @param object
   * @param options
   * @returns {Promise.<Object>}
   */
  async view(object, options = {}) {
    const _view = (typeof options.view === 'undefined' || options.view === true)
      ? {type: true, schema: true, fields: true}
      : options.view || {};

    if (options.from === 'viewList'){
      object = await this.viewListAppend(object, options);
    } else {
      object = await this.viewAppend(object, options);
    }

    if (_view.type || _view.schema) {
      object = await this.reconvertTypes(object);
    }
    if (_view.schema) {
      object = await this.validate(options.schema || 'view', object, options.session);
    }
    if (_view.fields) {
      if (typeof options.fields !== 'string' &&
        (!options.fields || !Object.keys(options.fields).length)) {
        options.fields = {_id: 1};
      }
      object = await this.storage.loadByFields(
        {object, fields: options.fields, session: options.session || {}}
      );
    }
    return object;
  }

  /**
   * Метод view для массива объектов
   * @param list
   * @param options
   * @param limit
   * @returns {Promise<*>}
   */
  async viewList(list, options = {}, limit = 0) {
    options.fields = (typeof options.fields === 'string') ? queryUtils.parseFields(options.fields) : options.fields;
    if (!options.fields.items){
      options.fields.items = options.fields;
    }
    options.from = 'viewList';
    options.schema = 'viewList';
    return await this.view(list, options);
  }

  /**
   * Дополнение объекта виртуальными свойствами
   * Свойства желательно описать в схеме view
   * Метод так же выхывается для каждого объекта при выборке списка, но есть метод viewListAppend для
   * опитмального дополнения списку объектов. Чтобы повторно не делать дополнения, нужно свойрить options.from
   * @param object
   * @param options
   * @returns {Promise<*>}
   */
  async viewAppend(object, options = {}) {
    // @example
    if (options.from !== 'viewList') {
      // Только при выборке одного объекта
    }
    return object;
  }

  /**
   * Дополнение при выборке списка объектов.
   * Нужно учесть, что метод для каждого объекта юудет вызван viewAppend и в нём надо проверить options.from !== 'viewList'
   * чтобы не делать повторные выборки, если они были сделаны
   * @param list
   * @param options
   * @returns {Promise<void>}
   */
  async viewListAppend(list, options = {}) {
    if (options.fields['count']) {
      list.count = await this.getCount(options);
    }
    let itemOptions = {...options, fields: options.fields.items};
    for (let i=0; i< list.items.length; i++){
      list.items[i] = await this.viewAppend(list.items[i], itemOptions);
    }
    return list;
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
   * Конвертация типов mongodb в типы JS
   * @param obj
   * @returns {*}
   */
  reconvertTypes(obj) {
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        obj[i] = this.reconvertTypes(obj[i]);
      }
    } else if (obj instanceof String || obj instanceof Number || obj instanceof Boolean) {
      obj = obj.valueOf();
    } else if (typeof obj === 'object' && obj !== null) {
      if (obj instanceof ObjectID) {
        return obj.toString();
      } else if (obj instanceof Date) {
        return obj.toISOString();
      } else {
        let keys = Object.keys(obj);
        for (let key of keys) {
          obj[key] = this.reconvertTypes(obj[key]);
        }
      }
    }
    return obj;
  }

  /**
   * Конвератция JS типов в mongodb типы
   * @param obj
   * @returns {*}
   */
  convertTypes(obj) {
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        obj[i] = this.convertTypes(obj[i]);
      }
    } else if (typeof obj === 'object' && obj !== null) {
      let keys = Object.keys(obj);
      for (let key of keys) {
        if (key === '_id' && obj[key]) {
          obj[key] = new ObjectID(obj[key]);
        } else if ((key === 'birthday' || /^date([A-Z]|$)/.test(key)) &&
          (key !== 'dateGame') && typeof obj[key] === 'string' && obj[key]) {
          obj[key] = moment(obj[key]).toDate();
        } else /*if (key !== '$outer')*/{
          obj[key] = this.convertTypes(obj[key]);
        }
      }
    }
    return obj;
  }

  /**
   * Валидация объекта по указанной схеме
   * @param schemeName
   * @param object
   * @param session
   * @returns {Promise<*>}
   */
  async validate(schemeName, object, session) {
    if (this._schemes[schemeName]) {
      await this.spec.validate(`${this.type()}.${schemeName}`, object, {
        session: session || {},
        collection: this
      });
    }
    return object;
  }

  /**
   * Услвовия группировки объектов для упорядочивания (автозначения для order)
   * @param object
   * @param filter
   */
  orderScope(object, filter = {}) {
    return filter;
  }

  /**
   * Условие, при ктором объект считается "новым" и должен получить максимальный order
   * @param prevObject
   * @param nextObject
   * @returns {boolean}
   */
  isNewScope(prevObject, nextObject) {
    return false;
  }

  /**
   * Обработка связей после сохранения объекта
   * @param object
   * @param path
   * @param set
   * @param setPrev
   * @param changes
   * @param canDelete
   * @returns {Promise<void>}
   */
  async saveLinks({object, path, set, setPrev, changes, canDelete = true}) {
    let exists = {};
    if (Array.isArray(set)) {
      for (let i = 0; i < set.length; i++) {
        const setPrevItem = set[i]._id && setPrev && setPrev.find(
          item => {
            return item._id && item._id.toString() === set[i]._id.toString();
          }
        );
        await this.saveLinks({
          object,
          path: `${path}`,
          set: set[i],
          setPrev: setPrevItem ? setPrevItem : undefined,
          changes,
          canDelete: false
        });
        if (set[i]._id) {
          exists[set[i]._id] = true;
        }
      }
      if (setPrev) {
        for (let i = 0; i < setPrev.length; i++) {
          if (setPrev[i]._id && !exists[setPrev[i]._id]) {
            await this.storage.get(setPrev[i]['_type']).onForeignDelete({
              foreignObject: object,
              foreignPath: `${path}`,
              foreignLink: setPrev[i]
            });
          }
        }
      }
    } else if (typeof set === 'object' && set) {
      if (!set) {
        console.log(path, setPrev);
      }
      if (path && set['_id'] && set['_type']) {
        // Если свойство - вязь
        if (!setPrev || !setPrev['_id'] || !setPrev['_type']) {
          // Если новая связь или свойство ранее не являлось связью
          await this.storage.get(set['_type']).onForeignAdd({
            foreignObject: object,
            foreignPath: path,
            foreignLink: set
          });

          await this.onUpdateTree({
            object: object,
            path,
            link: set,
            linkPrev: undefined,
            method: 'add'
          });

        } else if (setPrev['_id'].toString() !== set['_id'].toString()) {
          // Изменени связи
          // 1. Удаление текущих обратных связей
          if (canDelete) {
            // Если свойство ранее было другой связью
            await this.storage.get(setPrev['_type']).onForeignDelete({
              foreignObject: object,
              foreignPath: path,
              foreignLink: setPrev
            });
          }
          // 2. Добавление новых обратных связей
          await this.storage.get(set['_type']).onForeignAdd({
            foreignObject: object,
            foreignPath: path,
            foreignLink: set
          });

          await this.onUpdateTree({
            object: object,
            path,
            link: set,
            linkPrev: setPrev,
            method: 'delete'
          });
          await this.onUpdateTree({
            object: object,
            path,
            link: set,
            linkPrev: setPrev,
            method: 'add'
          });

        } else {
          // Связь не обновилась. Но уведомляем об изменении объекта
          await this.storage.get(set['_type']).onForeignUpdate({
            foreignObject: object,
            foreignPath: path,
            foreignLink: set,
            changes
          });
        }
        //await this.onUpdateTree({object, path, set, setPrev});
      } else if (path && Object.keys(set).length === 0 && setPrev && setPrev['_id'] && setPrev['_type']) {
        // Если связь сброшена (установлена в {})
        await this.storage.get(setPrev['_type']).onForeignDelete({
          foreignObject: object,
          foreignPath: path,
          foreignLink: setPrev
        });

        await this.onUpdateTree({
          object: object,
          path,
          link: undefined,
          linkPrev: setPrev,
          method: 'delete'
        });

      } else {
        // Если вложенный объект (не связь)
        let keys = Object.keys(set);
        for (let key of keys) {
          if (key !== '_id' && key !== '_type') {
            await this.saveLinks({
              object,
              path: `${path}${path ? '.' : ''}${key}`,
              set: set[key],
              setPrev: setPrev ? setPrev[key] : undefined,
              changes
            });
          }
        }
      }
    }
    // @todo?? Перебор свойств setPrev, которые не просмотерны - там удаленные связи
    // if (setPrev){
    //
    // }
  }

  /**
   * Общее определение связи
   * @param path Свойство в котором устанваливается связь
   * @param link Объект связи {_id, _type,...}
   * @param foreign {Boolean} Признак, в каком контексте определяется связь (своем, в связанном объекте)
   * @returns {Promise.<{_id}>}
   */
  async onLinkPrepare({path, link, foreign = false}) {
    if (this._links && this._links[path]) {
      let props = {
        _id: link._id,
        _type: link._type
      };
      if (this._links[path].tree) {
        // Копирование массива связей ("хлебных крошек") из родительского объекта
        const parent = await this.storage.get(link._type).native.findOne({_id: new ObjectID(link._id)});
        props._tree = objectUtils.get(parent, this._links[path].treeTypes[link._type] + '._tree', []);
        props._tree.unshift({_id: link._id, _type: link._type});
        // После сохранения объекта с новой связью будет обновлены _tree у всех подчиенных объектов
      }
      if (this._links[path].copy) {
        Object.assign(
          props,
          await this.storage.get(link._type).view(
            link,
            {fields: this._links[path].copy, view: {type: true, fields: true}}
          ));
      }
      if (this._links[path].prepare) {
        Object.assign(
          props,
          await this._links[path].prepare({path, link, foreign})
        );
      }
      if (this._links[path].search) {
        const obj = await this.storage.get(link._type).view(
          link,
          {fields: this._links[path].search, view: {type: true, fields: true}}
        );
        delete obj._id;
        props.search = objectUtils.getAllValues(obj, true);
      }
      return props;
    }
  }

  /**
   * Установка обратной связи, если в схеме есть её опредление в inverse
   * @param foreignObject Объект, в котором удалена свзь
   * @param foreignPath Название связи в foreignObject
   * @param foreignLink Объект связи в foreignObject
   * @returns {Promise.<void>}
   */
  async onForeignAdd({foreignObject, foreignPath, foreignLink}) {
    if (this._links) {
      const paths = Object.keys(this._links);
      for (const path of paths) {
        // Обработка связи, если есть inverse в схеме
        if (this._links[path]._type === foreignObject._type &&
          this._links[path].inverse === foreignPath) {

          let props = await this.onLinkPrepare({
            path: path, link: foreignObject, foreign: true
          });

          await this.onUpdateTree({
            object: foreignLink,
            path: path,
            link: props,
            linkPrev: undefined,
            method: 'add-foreign'
          });

          // Если size=1 и ссылка уже есть, то нужно проинформировать об её удалении
          // Если size=1 то $set
          if (this._links[path].size === '1') {
            try {
              const prevObject = await this.getOne({
                filter: {_id: new ObjectID(foreignLink._id)},
                view: {type: true}
              });
              // Если path уже опредлен, то нужно сообщить об удалении обратной связи
              if (prevObject[path] && prevObject[path]._id && prevObject[path]._type) {
                await this.storage.get(prevObject[path]._type).onForeignDelete({
                  foreignObject: prevObject,
                  foreignPath: path,
                  foreignLink: prevObject[path]
                });
              }
            } catch (e) {
              console.log(e);
            }
            await this.native.updateOne({_id: new ObjectID(foreignLink._id)}, {
              $set: {[path]: this.convertTypes(props)}
            });
          } else {
            await this.native.updateOne({_id: new ObjectID(foreignLink._id)}, {
              $push: {[path]: this.convertTypes(props)}
            });
          }
        }
      }
    }
  }

  /**
   * Событие при обновление связанного объекта (когда меняется не связь, а дургие свойства объекта)
   * Делается обработка, если скопированы свойства связанного объекта
   * @param foreignObject Объект, в котором удалена свзь
   * @param foreignPath Название связи в foreignObject
   * @param foreignLink Объект связи в foreignObject
   * @param changes
   * @returns {Promise<void>}
   */
  async onForeignUpdate({foreignObject, foreignPath, foreignLink, changes}) {
    if (this._links) {
      // Поиск связи, которое обратносвязано с foreignObject[foreignPath]
      const paths = Object.keys(this._links);
      for (const path of paths) {
        if (this._links[path]._type === foreignObject._type &&
          this._links[path].inverse === foreignPath) {
          // Подготовока объекта обратной связи
          let props = await this.onLinkPrepare({path: path, link: foreignObject, foreign: true});

          props = this.convertTypes(props);
          // Если size=1, то $set: {[path]: props} без поиска элемента
          if (this._links[path].size === '1') {
            await this.native.updateOne({_id: new ObjectID(foreignLink._id)}, {
              $set: {[path]: props}
            });
          } else {
            await this.native.updateOne({
              _id: new ObjectID(foreignLink._id),
              [`${path}._id`]: props._id
            }, {
              $set: {[`${path}.$`]: props}
            });
          }

          // @todo Теоретически, если делается кореркция связи нужно сделать обновление дерева
        }
      }
    }
  }

  /**
   * Событие при удалении обатной связи
   * @param foreignObject Объект, в котором удалена свзь
   * @param foreignPath Название связи в foreignObject
   * @param foreignLink Объект связи в foreignObject
   * @returns {Promise<void>}
   */
  async onForeignDelete({foreignObject, foreignPath, foreignLink}) {
    if (this._links) {
      const paths = Object.keys(this._links);
      for (const path of paths) {
        if (this._links[path]._type === foreignObject._type &&
          this._links[path].inverse === foreignPath && !this._links[path].remember) {

          if (this._links[path].size === '1') {
            // @todo Возможно, надо убедиться, что в свойстве удаляемая связь
            await this.native.updateOne({_id: new ObjectID(foreignLink._id)}, {
              $set: {[path]: {}}
            });
          } else {
            await this.native.updateOne({_id: new ObjectID(foreignLink._id)}, {
              $pull: {[path]: {_id: new ObjectID(foreignObject._id)}}
            });
          }

          await this.onUpdateTree({
            object: foreignLink,
            path: path,
            link: undefined, // так как удаляем
            linkPrev: undefined, // хз где взять
            method: 'delete-foreign'
          });
        }
      }
    }
  }

  /**
   * Собтыие при обновление древовидной связи
   * @param object Объект, в котором обновляемая древовидная связь
   * @param path Название свойства с дервовидной связью
   * @param link Новая связь
   * @param linkPrev Старая связь
   * @param method
   * @returns {Promise<void>}
   */
  async onUpdateTree({object, path, link, linkPrev, method}) {
    if (this._links[path] && this._links[path].treeTypes) {
      //console.log('onUpdateTree', {method, object, path, link, linkPrev});
      if (method === 'add') {
        //console.log(method, `Всем подчиненным ${object._id} добавить в ${path}._tree`, link._tree);
        // В каких коллекциях смотреть?
        const types = Object.keys(this._links[path].treeTypes);
        const tree = link._tree.map(item => this.convertTypes(item));
        for (const type of types) {
          const name = `${this._links[path].treeTypes[type]}._tree`;
          await this.storage.get(type).native.updateMany(
            {[`${name}._id`]: new ObjectID(object._id)},
            {$push: {[name]: {$each: tree}}});
        }
      }
      if (method === 'delete') {
        //console.log(method, `Во всех подчиненных ${object._id} удалить из ${path}._tree`, linkPrev._tree);
        const types = Object.keys(this._links[path].treeTypes);
        const tree = linkPrev._tree.map(item => this.convertTypes(item));
        for (const type of types) {
          const name = `${this._links[path].treeTypes[type]}._tree`;
          const result = await this.storage.get(type).native.updateMany(
            {[`${name}._id`]: new ObjectID(object._id)},
            {$pullAll: {[name]: tree}});
        }
      }
      if (method === 'update') {
        console.log(method, `Всем подчиненным ${object._id} добавить в ${path}._tree если ещё нет`, link._tree);
      }
      if (method === 'add-foreign') {
        console.log(method, `Всем подчиненным ${object._id} добавить в ${path}._tree`, link._tree);
      }
      if (method === 'delete-foreign') {
        console.log(method, `Во всех подчиненных ${object._id} удалить из ${path}._tree`, linkPrev._tree);
      }
    }
  }

  /**
   * Пересоздание связей для восставновления взаимосвязей
   * @param filter
   * @returns {Promise<void>}
   */
  async remakeLinks({filter}) {
    // Курсор на список документов с учётом filter
    // Рекурсивный перебор свойств (нужно учитывать вложенность, массивы)
    // При обнаружении свойства-отношения
    // 1) Если связь обратная и у связанного объекта нет связи или самого объекта нет, то обратную связь надо удалить
    // 2) иначе обновить поля обратной связи
    // 3) Если связь обычная, то обновить поля связи
    // подготавливать по нему свежие данные
  }

}

module.exports = Model;
