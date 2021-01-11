const any = require('./../any');
/**
 * Объект
 * @param [maxProperties] {number} Максимальное количество свойств
 * @param [minProperties] {number} Минимальная количество свойств
 * @param [properties] {Object.<Object>} Свойства объект. Ключ объекта - название свойства. Значение - схема свойства
 * @param [patternProperties] {string} Паттерн для названия свойств объекта.
 * @param [additionalProperties] {Object} Допустимость свойств, не указанных схемой
 * @param [required] {Array} - Обязательные свойства объекта.
 * @param [dependentRequired] {Object.<Array.<string>>} Зависимость свойства от наличия других свойств. Например {dependentRequired: {prop1: ['prop2', 'prop3']}}
 * @param [dependentSchemas] {Object.<Object.<Object>>} Зависимость свойства от соответствии схемам других свойств. Например {dependentSchemas: {prop1: {properties: {'prop2': {type: string}]}}}
 * @param [propertyNames] {Object} Схема на названия свойств
 * @param [description] {string} Краткое описание
 * @param [enums] {Array.<Object>} Допустимые значение. Алиас enum
 * @param [constant] {Object} Строгое равенство значению
 * @param [examples] {Array.<Object>} Примеры значений
 * @param [errors] {Object.<string>} Тексты ошибок на ключевые слова. Например {type: "Неверный тип", maxLength: "Слишком длинная строка"}
 * @param [defaults] {Object} Значение по умолчанию. Алиас для default.
 * @param [other] {...*} Другие параметры поддерживаемые JSONSchema для описания массива
 * @returns {object}
 */
module.exports = function ({
                             maxProperties,
                             minProperties,
                             properties = {},
                             patternProperties,
                             additionalProperties = false,
                             required = [],
                             dependentRequired,
                             dependentSchemas,
                             propertyNames,
                             description = '',
                             enums,
                             constant,
                             examples,
                             errors = {},
                             defaults = {},
                             ...other
                           }) {
  let result = any({type: 'object', description, enums, constant, examples, errors, defaults, ...other});
  if (maxProperties) {
    result.maxProperties = maxProperties;
  }
  if (minProperties) {
    result.minProperties = minProperties;
  }
  if (properties) {
    result.properties = properties;
  }
  if (patternProperties) {
    result.patternProperties = patternProperties;
  }
  if (additionalProperties) {
    result.additionalProperties = additionalProperties;
  }
  if (required) {
    result.required = required;
  }
  if (dependentRequired) {
    result.dependentRequired = dependentRequired;
  }
  if (dependentSchemas) {
    result.dependentSchemas = dependentSchemas;
  }
  if (propertyNames) {
    result.propertyNames = propertyNames;
  }
  return result;
};
