const body = require('./../body');
/**
 * Тело ответа JSON - успешный результат роутера оборачивается в объект со свойством result
 * @param [description] {String} Краткое описание
 * @param [schema] {Object} Схема тела
 * @param [example] {Object} Пример тела
 * @param [examples] {Object<Object>} Множество примеров
 * @param [headers] {Object} Заголовки для тела ответа @see https://swagger.io/specification/#data-type-format
 * @param [mediaType] {String} Формат тела (mime тип)
 * @returns {Object}
 */
module.exports = function ({
                             description = '',
                             schema = {type: 'object'},
                             example,
                             examples,
                             headers,
                             mediaType = 'application/json'
                           }) {
  return body({
    description,
    example,
    examples,
    mediaType,
    headers,
    schema: {
      type: 'object',
      properties: {
        result: schema
      }
    }
  });
};