/**
 * Порядковое значение
 * @param [description] {string} Краткое описание
 * @param [constant] {number} Строгое равенство значение
 * @param [examples] {Array.<number>} Примеры значений
 * @param [errors] {Object.<string>} Тексты ошибок на ключевые слова. Например {type: "Неверный тип", maxLength: "Слишком длинная строка"}
 * @param [defaults] {string} Значение по умолчанию. Алиас для default.
 * @param [other] {...*} Другие параметры поддерживаемые JSONSchema
 * @returns {object}
 * @returns {Object}
 */
module.exports = function ({
                             description = 'Порядковый номер',
                             constant,
                             examples = ['min', '+1', '-1', 'max', 1, 10, 100],
                             errors,
                             defaults = 'max',
                             ...other
                           }) {
  let result = {
    anyOf: [
      {
        type: 'string',
        enum: ['min', '+1', '-1', 'max'],
        description: 'Относительная установка'
      },
      {type: 'integer', minimum: 1},
    ],
    title: description,
    ...other
  };
  if (constant) {
    result.constant = constant;
  }
  if (examples) {
    result.examples = examples;
  }
  if (errors) {
    result.errors = errors;
  }
  if (defaults) {
    result.default = defaults;
  }
  return result;
};
