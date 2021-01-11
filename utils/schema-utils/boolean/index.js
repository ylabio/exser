const any = require('./../any');
/**
 * Булево значение
 * @param [description] {string} Краткое описание
 * @param [constant] {number} Строгое равенство значение
 * @param [errors] {Object.<string>} Тексты ошибок на ключевые слова. Например {type: "Неверный тип", maxLength: "Слишком длинная строка"}
 * @param [defaults] {string} Значение по умолчанию. Алиас для default.
 * @param [other] {...*} Другие параметры поддерживаемые JSONSchema для описания числа
 * @returns {object}
 */
module.exports = function ({
                             description = '',
                             constant,
                             errors,
                             defaults,
                             ...other
                           }) {
  return  any({type: 'boolean', description, constant, errors, defaults, ...other});
};
