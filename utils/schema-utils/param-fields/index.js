const param = require('./../param');
/**
 * Параметр fields для указания выбираемых свойств
 * @param [name] {String} Название параметра
 * @param [where] {String=query|path|header|cookie} Где параметр? В пути, в query, заголовке, куке.
 * @param [description] {String} Краткое описание
 * @param [schema] {Object} Схема параметра. По умолчанию строка
 * @param [example] {String} Пример значения
 * @param [examples] {Object<String>} Множество примеров
 * @param [required] {Boolean} Обязательно ли тело запроса
 * @param [deprecated] {Boolean} Устарел или нет параметр
 * @param [allowReserved] {Boolean} Не экранировать спец символы :/?#[]@!$&'()*+,;=
 * @returns {object}
 */
module.exports = function ({
                             name = 'fields',
                             where = 'query',
                             description = 'Выбираемые свойства модели через запятую, вложенность круглыми скобками: [http://query.rest](http://query.rest)',
                             schema = {type: 'string'},
                             example = '*',
                             examples,
                             required,
                             deprecated,
                             allowReserved = true
                           }) {
  return param({name, where, description, schema, example, examples, required, deprecated, allowReserved});
};