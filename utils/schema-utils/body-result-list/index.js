const bodyResult = require('./../body-result');
const mc = require('merge-change');
/**
 * Тело ответа JSON для списка элементов
 * @param [description] {string} Краткое описание
 * @param [schema] {Object} Схема элементов списка
 * @param [properties] {Object} Свойства списка. По умолчанию определено свойство count
 * @param [example] {Object} Пример тела
 * @param [examples] {Object<Object>} Множество примеров
 * @param [headers] {Object} Заголовки для тела ответа @see https://swagger.io/specification/#data-type-format
 * @param [mediaType] {String} Формат тела (mime тип)
 * @returns {object}
 */
module.exports = function ({
                             description = '',
                             schema = {type: 'object'},
                             properties = {},
                             example,
                             examples,
                             headers,
                             mediaType = 'application/json'
                           }) {
  return bodyResult({
    description,
    example,
    examples,
    mediaType,
    headers,
    schema: {
      type: 'object',
      properties: mc.merge({
          items: {type: 'array', items: schema},
          count: {type: 'integer', description: 'Общее количество элементов'},
        },
        properties
      )
    }
  });
};