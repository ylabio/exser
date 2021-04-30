/**
 * Любое значение
 * @param [type] {string} Тип значения. Допустимы number, integer, string, boolean, array, object, null
 * @param [description] {string} Краткое описание
 * @param [enums] {Array.<number>} Допустимые значение. Алиас enum
 * @param [constant] {number} Строгое равенство значение
 * @param [examples] {Array.<number>} Примеры значений
 * @param [errors] {Object.<string>} Тексты ошибок на ключевые слова. Например {type: "Неверный тип", maxLength: "Слишком длинная строка"}
 * @param [defaults] {string} Значение по умолчанию. Алиас для default.
 * @param [other] {...*} Другие параметры поддерживаемые JSONSchema
 * @returns {object}
 */
module.exports = function ({type, description = '', enums, constant, examples, errors, defaults, ...other}) {
  let result = {
    description,
    ...other,
  };
  if (type) {
    result.type = type;
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
  if (errors) {
    result.errors = errors;
  }
  if (defaults !== undefined) {
    result.default = defaults;
  }
  if (!other.title){
    result.title = description;
  }
  return result;
};
