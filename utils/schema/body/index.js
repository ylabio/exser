/**
 * Тело ответа или запроса в JSON
 * @param [description] {String} Краткое описание
 * @param [schema] {Object} Схема тела
 * @param [example] {Object} Пример тела
 * @param [examples] {Object<Object>} Множество примеров
 * @param [encoding] {Object} Кодировка тела запроса @see https://swagger.io/specification/#media-type-object
 * @param [required] {Boolean} Обязательно ли тело запроса
 * @param [headers] {Object} Заголовки для тела ответа @see https://swagger.io/specification/#data-type-format
 * @param [mediaType] {String} Формат тела (mime тип)
 * @returns {Object}
 */
module.exports = function ({description = '', schema = {type: 'object'}, example, examples, encoding, required, headers, mediaType = 'application/json'}) {
  let result = {
    description,
    content: {
      [mediaType]: {
        schema
      },
    }
  };
  if (required){
    result.required = required;
  }
  if (headers){
    result.headers = headers;
  }

  if (example){
    result.content[mediaType].example = example;
  }
  if (examples){
    result.content[mediaType].examples = examples;
  }
  if (encoding){
    result.content[mediaType].encoding = encoding;
  }
  return result;
};