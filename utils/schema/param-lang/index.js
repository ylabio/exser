const param = require('./../param');
/**
 * Параметр языка для мультиязычных свойств
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
                             name = 'lang',
                             where = 'query',
                             description = 'Язык для мультиязычных свойств. ' +
                             //'Если указать "*", то вернутся все варианты. ' +
                             'По-умолчанию определяется заголовком AcceptLanguage или X-Lang.',
                             schema = {type: 'string'},
                             example = 'ru',
                             examples/* = {
                               ru: {summary: 'Русский', value: 'ru'},
                               en: {summary: 'Английский', value: 'en'},
                               *: {summary: 'Все', value: '*'}
                             }*/,
                             required,
                             deprecated
                           }) {
  return param({name, where, description, schema, example, examples, required, deprecated, allowReserved: true});
};