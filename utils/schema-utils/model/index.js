const object = require('./../object');
/**
 * Схема модели
 * Модель - это объект с дополнительной информацией про название коллекции и индексы в ней.
 * @param title {String} Название модели для документации
 * @param collection {String} Название коллекции в mongodb
 * @param [indexes] {Object.<Array>} Индекс в mongodb. Указываются в формате mongodb. Пример: {name: [{field: 1}, {'unique': true, partialFilterExpression: {field: {$exists: true}}}]
 * @param [options] {Object} Опции коллекции mongodb
 * @param [maxProperties] {number} Максимальное количество свойств
 * @param [minProperties] {number} Минимальная количество свойств
 * @param [properties] {Object.<Object>} Дополнительные свойства отношения. Ключ объекта - название свойства. Значение - схема свойства
 * @param [patternProperties] {string} Паттерн для названия свойств отношения.
 * @param [additionalProperties] {Object} Допустимость свойств, не указанных схемой
 * @param [required] {Array} - Обязательные свойства отношения.
 * @param [dependentRequired] {Object.<Array.<string>>} Зависимость свойства от наличия других свойств. Например {dependentRequired: {prop1: ['prop2', 'prop3']}}
 * @param [dependentSchemas] {Object.<Object.<Object>>} Зависимость свойства от соответствии схемам других свойств. Например {dependentSchemas: {prop1: {properties: {'prop2': {type: string}]}}}
 * @param [propertyNames] {Object} Схема на названия свойств
 * @param [description] {string} Краткое описание
 * @param [examples] {Array.<number>} Примеры значений
 * @param [other] {...*} Другие параметры поддерживаемые JSONSchema для описания объекта
 *
 * @returns {Object} JSONSchema
 */
module.exports = function ({
                             title,
                             collection,
                             indexes = {},
                             options = {},
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
                             examples,
                             ...other
                           }) {
  return object({
    title,
    // Свойства для mongodb коллекции
    collection,
    indexes,
    options,
    // Базовые свойства объекта
    maxProperties,
    minProperties,
    properties,
    patternProperties,
    additionalProperties,
    required,
    dependentRequired,
    dependentSchemas,
    propertyNames,
    description,
    examples,
    ...other,
  });
};
