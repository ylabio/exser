const string = require('./../string');
/**
 * Мультиязычная строка
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
 * @returns {Object}
 */
module.exports = function ({
                             minLength,
                             maxLength = 500,
                             pattern,
                             format,
                             description = '',
                             enums,
                             constant,
                             examples,
                             errors,
                             defaults,
                             ...other
                           }) {
  let s = string({
    minLength,
    maxLength,
    pattern,
    format,
    enums,
    constant,
    errors,
    ...other,
  });

  let result = {
    anyOf: [s, {type: 'object', patternProperties: {'^.*$': s}}],
    i18n: 'in',
    description,
  };
  // if (enums) {
  //   result.enums = enums;
  // }
  // if (constant) {
  //   result.constant = constant;
  // }
  if (examples) {
    result.examples = examples;
  }
  // if (errors) {
  //   result.errors = errors;
  // }
  if (defaults) {
    result.default = defaults;
  }

  return result;
};
