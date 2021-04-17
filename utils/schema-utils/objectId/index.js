/**
 * ObjectID - 12байтное число для идентификации объектов mongodb
 * @param [description] {string} Краткое описание
 * @param [enums] {Array.<number>} Допустимые значение. Алиас enum
 * @param [constant] {number} Строгое равенство значение
 * @param [examples] {Array.<number>} Примеры значений
 * @param [errors] {Object.<string>} Тексты ошибок на ключевые слова. Например {type: "Неверный тип", maxLength: "Слишком длинная строка"}
 * @param [defaults] {string} Значение по умолчанию. Алиас для default.
 * @param [empty] {boolean} Допустимость пустого значения (пустой строки или null) Если свойство обязательное, то передать "null" строкой
 * @param [other] {...*} Другие параметры поддерживаемые JSONSchema для описания строки
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
      {is: 'ObjectID', errors: {is: false}}, // Экземпляр new ObjectID()
      {type: 'string', pattern: '^[0-9a-fA-F]{24}$', errors: {pattern: false}}, // Строка в формате Hash24
    ],
    //toObjectId: true, // Ключевое слово сконвертирует строку в экземпляр ObjectId. Пустое значение в null},
    instance: {name: 'ObjectID', emptyToNull: true, createWithNull: false},
    description,
    errors: {
      anyOf: {message: 'Incorrect type (ObjectID or 24byte hex string)', rule: 'type'},
      ...errors
    },
    ...other
  };
  // Пустое значение не соответствует формату ObjectID, поэтому добавляется третий вариант правила в начало, чтобы строковое правило не меняло null в строку
  if (empty){
    result.anyOf.unshift({
      enum: ['', null, 'null'], errors: {enum: false}
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
  }
  if (defaults) {
    result.default = defaults;
  }
  return result;
};
