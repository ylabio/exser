const string = require('./../string');
/**
 * Дата с временем
 * @param [description] {string} Краткое описание
 * @param [enums] {Array.<number>} Допустимые значение. Алиас enum
 * @param [constant] {number} Строгое равенство значение
 * @param [examples] {Array.<number>} Примеры значений
 * @param [errors] {Object.<string>} Тексты ошибок на ключевые слова. Например {type: "Неверный тип", maxLength: "Слишком длинная строка"}
 * @param [defaults] {string} Значение по умолчанию. Алиас для default.
 * @param [empty] {boolean} Допустимость пустого значения (пустой строки или null) Если свойство обязательное, то передать "null" строкой
 * @param [other] {...*} Другие параметры поддерживаемые JSONSchema для описания строки
 * @returns {object}
 * @returns {Object}
 */
module.exports = function ({
                             description = '',
                             enums,
                             constant,
                             examples,
                             errors = {},
                             defaults,
                             empty,
                             ...other
                           }) {
  let result = {
    anyOf: [
      {is: 'Date', errors: {is: false}}, // Экземпляр new Date()
      {type: 'string', format: 'date-time', errors: {format: false}}, // Строка в формате ISO8601 YYYY-MM-DDTHH:mm:ss.sssZ
    ],
    instance: {name: 'Date', emptyToNull: true, createWithNull: false},
    description,
    errors: {
      anyOf: {message: 'Не является датой или не соответствует формату ISO8601', rule: 'type'},
      ...errors
    },
    ...other
  };
  // Пустое значение не соответствует формату даты, поэтому добавляется третий вариант правила в начало, чтобы строковое правило не меняло null в строку
  if (empty){
    result.anyOf.unshift({
       enum: ['', null, 'null'], errors: {const: false}
    })
  }
  if (enums) {
    result.enums = enums;
  }
  if (constant) {
    result.constant = constant;
  }
  if (examples) {
    result.examples = examples;
  } else {
    result.examples = [new Date().toISOString()]
  }
  // if (errors) {
  //   result.errors = errors;
  // }
  if (defaults) {
    result.default = defaults;
  }
  return result;
};
