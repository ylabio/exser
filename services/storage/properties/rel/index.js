const Property = require('./../property');
const mc = require('merge-change');
const {query, errors} = require('./../../../../utils');

class RelProperty extends Property {

  constructor({value, session, services, options}) {
    super({
      value,
      session,
      services,
      options: mc.patch({
        model: [],
        copy: '_id, _type',
        search: '',
        inverse: '',
        tree: '',
        own: false,
        proto: false,
        by: ['_id', '_key'],

      }, options)
    });
    // Объект, на который установлено отношение. Подгружается методом this.load()
    this.$rel = undefined;
  }

  /**
   * Установка свойств отношения
   * @param value {Object|RelProperty}
   */
  set(value) {
    this.deleteProps();
    if (mc.utils.type(value) === 'Object') {
      this.value = value;
    } else if (mc.utils.instanceof(value, 'RelProperty')) {
      this.value = mc.merge({}, value.valueOf());
    } else {
      throw new Error('Invalid relation value (need object with identifier)');
    }
    // Формат значения, который попадает в базу данных
    this.value = value;
    this.defineProps();
  }

  /**
   * Установка свойств на основе ключей this.value для удобства обращения к ним
   */
  defineProps() {
    for (const props of [this.value, this.$rel]) {
      if (props) {
        const keys = Object.keys(props);
        for (const key of keys) {
          Object.defineProperty(this, key, {
            get: function () {
              return props[key];
            },
            set: function (newValue) {
              props[key] = newValue;
            },
            enumerable: false,
            configurable: true
          })
        }
      }
    }
  }

  /**
   * Удаление свойств созданных из ключей this.value
   */
  deleteProps() {
    if (this.value) {
      const keys = Object.keys(this.value);
      for (const key of keys) {
        delete this[key];
      }
    }
  }

  async toFields(fields){
    if (fields === true){
      return this.valueOf();
    } else {
      return mc.merge(this.value, await this.load());
    }
  }

  isDefine() {
    return Object.keys(this.value).length > 0;
  }

  /**
   * Загрузка связанного объекта
   * Загруженный объект также будет доступен в this.$rel
   * @param reload {Boolean} Перезагрузить, если уже был ранее загружен из storage
   * @returns {Promise<any>} Связанный объект, если найден
   */
  async load(reload = false) {
    if (typeof this.$rel === 'undefined' || reload) {
      const storage = await this.services.getStorage();
      let types = Array.isArray(this.options.model)
        ? this.options.model
        : (this.options.model ? [this.options.model] : []);
      // Если по схеме тип не определен, то берем переданный
      if (!types.length && this.value._type) {
        types = [this.value._type];
      }
      // Условие поиска
      let filter = {};
      for (const field of this.options.by) {
        if (this.value[field]) {
          filter[field] = this.value[field];
        }
      }
      // Поиск
      if (Object.keys(filter).length) {
        // Выборка из коллекции
        for (let type of types) {
          this.$rel = await storage.get(type).findOne({filter, session: this.session, doThrow: false});
          if (this.$rel) {
            break;
          }
        }
      }
    }
    return this.$rel;
  }

  async validate(){
    // @todo Учесть сброс отношения, тогда не надо проверять наличие объекта
    if (this.options.exists){
      // Проверка существования связанного объекта
      const obj = await this.load();
      if (!obj){
        throw new errors.Validation({}, 'Relation not found');
      }
    }
    return true;
  }

  async beforeSave({object, objectPrev, path, prev, model}) {
    // @todo Реализовать сброс отношения через this.value[this.options.by] = null

    if (this.isDefine()) {
      await this.validate();

      if (this.options.copy) {
        const copy = await query.loadByFields({object: await this.load(), fields: this.options.copy});
        if (copy) {
          this.value = mc.merge(this.value, copy);
        }
      }
      if (this.options.search) {
        const search = await query.loadByFields({object: await this.load(), fields: this.options.search});
        if (search) {
          const searchFlat = mc.utils.flat(search, '', '.');
          const keys = Object.keys(searchFlat);
          const searchList = [];
          for (let i = 0; i < keys.length; i++) {
            if (searchFlat[keys[i]] || searchFlat[keys[i]] === 0) {
              searchList.push(searchFlat[keys[i]]);
            }
          }
          this.value = mc.merge(this.value, {_search: searchList});
        }
      }
      //console.log('beforeSave', copy, object);
      // 3. Подготовить материализованный путь по опции tree
      // 4. Копирование всех свойств в объект по опции proto
    }
  }

  async afterSave({object, objectPrev, path, prev, model}) {
    // @todo this != prev
    const rel = await this.load();
    const relPrev = await (prev && prev.load());

    // 1. Дерево
    if (this.options.tree) {
      // Если есть опция tree с названием дерева - то обновить мат путь у всех подчиненных
      // Нужно знать в каких моделях определено дерево с указанным названием и в каком свойстве
      // Нужно сравнить новый и старый _tree у связи и соотв. удалять старые и добавлять новые в начало элементы у подчиненных
    }
    // 2. Обратная связь
    if (this.options.inverse) {
      // По опции знаем название свойства с обратной связью в связанном объекте
      // Если связь была, то нужно оповестить связанный объект об удалении обратной связи.
      if (prev){
        const currentInverseProp = mc.utils.get(prev, this.options.inverse);
      }
      // - связанный о
      // Это приводит к каскаду обновления связей. Нужно в рамках сессии фиксировать изменяемые связи, чтобы предотвратить зацикливание
      // Установить обратную связь в связанном объекте.
      // При установке связи должна сработать логика beforeSave у обратной связи, но не afterSave
    }
  }
}

module.exports = RelProperty;
