const custom = require('../custom');
/**
 * Строковое значение
 * @param [minLength] {number} Минимальная длина
 * @param [maxLength] {number} Максимальная длина
 * @param [pattern] {string} Регулярное выражение, например "[abc]+"
 * @param [format] {string} Название формата.
 * @param [description] {string} Краткое описание
 * @param [enums] {Array.<number>} Допустимые значение. Алиас enum
 * @param [constant] {number} Строгое равенство значение
 * @param [examples] {Array.<number>} Примеры значений
 * @param [errors] {Object.<string>} Тексты ошибок на ключевые слова. Например {type: "Неверный тип", maxLength: "Слишком длинная строка"}
 * @param [defaults] {string} Значение по умолчанию. Алиас для default.
 * @param [other] {...*} Другие параметры поддерживаемые JSONSchema для описания строки
 * @returns {object}
 */
module.exports = function ({
                             minLength,
                             maxLength,
                             pattern,
                             format,
                             description,
                             enums,
                             constant,
                             examples,
                             errors,
                             defaults,
                             ...other
                           }) {
  let result = custom({type: 'string', description, enums, constant, examples, errors, defaults, ...other});
  if (minLength) {
    result.minLength = minLength;
  }
  if (maxLength) {
    result.maxLength = maxLength;
  }
  if (pattern) {
    result.pattern = pattern;
  }
  if (format) {
    result.format = format;
  }
  return result;
};
