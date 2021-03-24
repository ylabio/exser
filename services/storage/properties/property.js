const mc = require('merge-change');

class Property {

  constructor({value, options, session}) {
    this.options = options;
    this.session = session;
    this.setValue(value);
  }

  /**
   * Установка значения целиком
   * @param value
   */
  setValue(value){
    this.value = value;
  }

  /**
   * Значение при обращении к объекту как к скалярному значению
   * @returns {*}
   */
  valueOf(){
    return this.value;
  }

  /**
   * Значение для конвертации в JSON
   * Метод сам ничего не конвертирует
   * @returns {*}
   */
  toJSON(){
    return this.value;
  }

  /**
   * Значение для конвертации в BSON при записи в mongodb
   * @returns {string}
   */
  toBSON(){
    return this.value;
  }

  /**
   * Логика перед сохранением объекта с этим свойством
   * @param session
   * @param object
   * @param objectPrev
   * @param path
   * @param prev
   * @param model
   * @param services
   * @returns {Promise<void>}
   */
  async beforeSave({session, object, objectPrev, path, prev, model, services}){ }

  /**
   * логика после сохранения объекта с этим свойством
   * @param session
   * @param object
   * @param objectPrev
   * @param path
   * @param prev
   * @param model
   * @param services
   * @returns {Promise<void>}
   */
  async afterSave({session, object, objectPrev, path, prev, model, services}){}

  /**
   * Выбор свойство по пути на него.
   * Кастомизация merge-change
   * @param path
   * @param defaultValue
   * @param separator
   * @returns {*}
   */
  operation$get(path, defaultValue, separator = '.') {
    return mc.utils.get(this.value, path, defaultValue, separator);
  }

  /**
   * Установка свойства по пути на него
   * Кастомизация merge-change
   * @param path
   * @param value
   * @param doNotReplace
   * @param separator
   * @returns {*}
   */
  operation$set(path, value, doNotReplace, separator = '.') {
    return mc.utils.set(this.value, path, value, doNotReplace, separator);
  }

  /**
   * Удаление свойства по пути на него
   * Кастомизация merge-change
   * @param path
   * @param separator
   * @returns {*}
   */
  operation$unset(path, separator = '.') {
    return mc.utils.unset(this.value, path, separator);
  }
}

module.exports = Property
