const param = require('./../param');
/**
 * Параметр search[name] для фильтрации (поиска) списка
 * @param name {String} Название параметра
 * @param [where] {String=query|path|header|cookie} Где параметр? В пути, в query, заголовке, куке.
 * @param [description] {String} Краткое описание
 * @param [schema] {Object} Схема параметра. По умолчанию строка
 * @param [example] {String} Пример значения
 * @param [examples] {Object<String>} Множество примеров
 * @param [required] {Boolean} Обязательно ли тело запроса
 * @param [deprecated] {Boolean} Устарел или нет параметр
 * @param [wrap] {String} Обернуть название параметра для реализация вложенности
 * @returns {object}
 */
module.exports = function ({
                             name,
                             where = 'query',
                             description,
                             schema = {type: 'string'},
                             example,
                             examples,
                             required,
                             deprecated,
                           wrap = 'search'}) {
  return param({name, where, description, schema, example, examples, required, deprecated, wrap});
};