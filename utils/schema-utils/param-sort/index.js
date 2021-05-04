const param = require('./../param');
/**
 * Параметр сортировки списка
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
                             name = 'sort',
                             where = 'query',
                             description = 'Сортировка. Название полей через запятую. ' +
                             'Со знаком минус - по убыванию. ' +
                             'Пример: title,-price',
                             schema = {type: 'string'},
                             example = '',
                             examples,
                             required,
                             deprecated
                           }) {
  return param({name, where, description, schema, example, examples, required, deprecated});
};