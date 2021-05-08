const mc = require('merge-change');

/**
 * Абстрактный класс свойства
 * Используется для свойств, требующих особой логики обработки до и после сохранения в базу данных
 */
class Property {

  constructor({value, session, services, options}) {
    this.session = session;
    this.services = services;
    this.options = options;
    this.set(value);
  }

  /**
   * Установка значения целиком
   * @param value
   */
  set(value){
    this.value = value;
  }

  /**
   * Возврат значения
   * @returns {*}
   */
  get(){
    return this.value;
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

  async toFields(fields){
    if (fields === true){
      return this.valueOf();
    } else {
      return this.value;
    }
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
   * @param object Объект с новыми свойствами
   * @param objectPrev Старый объект
   * @param path Путь на свойство
   * @param prev Предыдущее значение
   * @param model Storage модель
   * @returns {Promise<void>}
   */
  async beforeSave({object, objectPrev, path, prev, model}){ }

  /**
   * логика после сохранения объекта с этим свойством
   * @param object Объект с новыми свойствами
   * @param objectPrev Старый объект
   * @param path Путь на свойство
   * @param prev Предыдущее значение
   * @param model Storage модель
   * @returns {Promise<void>}
   */
  async afterSave({object, objectPrev, path, prev, model}){}

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
