const Property = require('./../property');
const mc = require('merge-change');
const {queryUtils} = require('./../../../../utils');

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

  // toJSON() {
  //   return mc.merge(this.$rel, this.value);
  // }

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

  /**
   * Загрузка связанного объекта
   * Загруженный объект также будет доступен в this.$rel
   * @param reload {Boolean} Перезагрузить, если уже был ранее загружен из storage
   * @returns {Promise<any>} Связанный объект, если найден
   */
  async load(reload = false) {
    if (!this.$rel || reload) {
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
          this.$rel = await storage.get(type).findOne({filter, session: this.session});
          if (this.$rel) {
            break;
          }
        }
      }
    }
    return this.$rel;
  }

  isDefine() {
    return Object.keys(this.value).length > 0;
  }

  async beforeSave({object, objectPrev, path, prev, model}) {

    if (this.isDefine()) {
      if (this.options.copy) {
        const copy = await queryUtils.loadByFields({object: this, fields: this.options.copy});
        this.value = mc.merge(this.value, copy);
      }
      if (this.options.search) {
        const search = await queryUtils.loadByFields({object: this, fields: this.options.search});
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
      //console.log('beforeSave', copy, object);
      // 1. Копирование свойств по опции copy
      // 2. Копирование свойств в массив по опции search
      // 3. Подготовить материализованный путь по опции tree
      // 4. Копирование всех свойств в объект по опции proto
    }
  }

  async afterSave({object, objectPrev, path, prev, model}) {
    // 1. Дерево
    // Если есть опция tree с названием дерева - то обновить мат путь у всех подчиненных
    // Нужно знать в каких моделях определено дерево с указанным названием и в каком свойстве
    // Нужно сравнить новый и старый _tree у связи и соотв. удалять старые и добавлять новые в начало элементы у подчиненных

    // 2. Обратная связь
    // По опции знаем модель и название свойства с обратной связью
    // Если связь была, то её нужно удалить из пред. связанного объекта
    // Установить связь в новом связанном объекте.
    // При установке связи должна сработать логика beforeSave у обратной связи, но не afterSave
  }
}

module.exports = RelProperty;
