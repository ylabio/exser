const number = require('./../number');
/**
 * Целое число
 * @param [minimum] {number} Меньше или равно
 * @param [maximum] {number} Больше или равно
 * @param [exclusiveMinimum] {number} Меньше (без равенства)
 * @param [exclusiveMaximum] {number} Больше (без равенства)
 * @param [multipleOf] {number} Делится без остатка на указанное число
 * @param [description] {string} Краткое описание
 * @param [enums] {Array.<number>} Допустимые значение. Алиас enum
 * @param [constant] {number} Строгое равенство значение
 * @param [examples] {Array.<number>} Примеры значений
 * @param [errors] {Object.<string>} Тексты ошибок на ключевые слова. Например {type: "Неверный тип", maxLength: "Слишком длинная строка"}
 * @param [defaults] {string} Значение по умолчанию. Алиас для default.
 * @param [other] {...*} Другие параметры поддерживаемые JSONSchema для описания числа
 * @returns {object}
 */
module.exports = function ({
                             minimum,
                             maximum,
                             exclusiveMinimum,
                             exclusiveMaximum,
                             multipleOf,
                             description = '',
                             enums,
                             constant,
                             examples,
                             errors,
                             defaults,
                             ...other
                           }) {
  return number({
    type: 'integer',
    minimum, maximum, exclusiveMinimum,  exclusiveMaximum,  multipleOf,
    description, enums, constant, examples, errors, defaults,
    ...other,
  });
};
