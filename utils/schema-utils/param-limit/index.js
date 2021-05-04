const param = require('./../param');
/**
 * Параметр limit для ограничения количества элементов в списке
 * @param [name] {String} Название параметра
 * @param [where] {String=query|path|header|cookie} Где параметр? В пути, в query, заголовке, куке.
 * @param [description] {String} Краткое описание
 * @param [schema] {Object} Схема параметра. По умолчанию строка
 * @param [example] {String} Пример значения
 * @param [examples] {Object<String>} Множество примеров
 * @param [required] {Boolean} Обязательно ли тело запроса
 * @param [deprecated] {Boolean} Устарел или нет параметр
 * @returns {object}
 */
module.exports = function ({
                             name = 'limit',
                             where = 'query',
                             description = 'Ограничение количества. Число. Без ограничения *',
                             schema = {anyOf: [{type: 'integer', minimum: 0}, {const: '*'}]},
                             example = 10,
                             examples,
                             required,
                             deprecated
                           }) {
  return param({name, where, description, schema, example, examples, required, deprecated, allowReserved: true});
};