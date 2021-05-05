const body = require('./../body');
/**
 * Тело ответа JSON - успешный результат роутера оборачивается в объект со свойством result
 * @param [description] {String} Краткое описание
 * @param [schema] {Object} Схема ошибки
 * @param [example] {Object} Пример тела с ошибкой
 * @param [examples] {Object<Object>} Множество примеров
 * @param [headers] {Object} Заголовки для тела ответа @see https://swagger.io/specification/#data-type-format
 * @param [mediaType] {String} Формат тела (mime тип)
 * @returns {Object}
 */
module.exports = function ({
                             description = '',
                             schema,
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
        error: schema || {
          type: 'object',
          properties: {
            name: {type: 'string', description: 'Класс ошибки'},
            status: {type: 'string', description: 'Статус ошибки'},
            code: {type: 'string', description: 'Код ошибки'},
            message: {type: 'string', description: 'Сообщение об ошибке'},
            data: {type: 'object', description: 'Детали про ошибку'}
          }
        }
      }
    }
  });
};