const {arrays} = require('../../utils');
/**
 * Состояние данных инициализации
 * Для удобства подготовки
 */
class InitState {

  constructor(key, values = []) {
    this.key = key;
    this.values = values;
  }

  /**
   * Проверка, пустое ли состояние
   * @returns {boolean}
   */
  isEmpty(){
    return this.values.length === 0;
  }

  /**
   * Добавление элемента в состояние
   * @param item
   * @returns {InitState}
   */
  append(item){
    this.values.push(item);
    return item;
  }

  /**
   * Очистка состояния
   */
  clear(){
    this.values = [];
  }

  /**
   * Возврат всех элементов
   * @returns {*[]}
   */
  getArray(){
    return this.values;
  }

  /**
   * Возврат случайного элемента
   * @returns {*}
   */
  getRandom(){
    return arrays.random(this.values);
  }

  /**
   * Поиск элемента по его свойству
   * @param field {String} Название сверяемого свойства
   * @param value {*} Искомое значение свойства
   * @returns {*} Найденный элемент
   */
  getBy(field, value){
    return this.values.find(item => item[field] === value);
  }

  valueOf(){
    return this.values;
  }

  toJSON(){
    return this.values;
  }
}

module.exports = InitState;
