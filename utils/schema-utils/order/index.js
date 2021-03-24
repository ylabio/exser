/**
 * Порядковое значение
 * @param [description] {string} Краткое описание
 * @param [constant] {number} Строгое равенство значение
 * @param [examples] {Array.<number>} Примеры значений
 * @param [errors] {Object.<string>} Тексты ошибок на ключевые слова. Например {type: "Неверный тип", maxLength: "Слишком длинная строка"}
 * @param [defaults] {string} Значение по умолчанию. Алиас для default.
 * @param [scope] {Array.string | function} Названия свойств по которым определяется множество объектов для упорядочивания. Или функция, возвращающая условие поиска в формате mongodb
 * @param [other] {...*} Другие параметры поддерживаемые JSONSchema
 * @returns {object}
 * @returns {Object}
 */
module.exports = function ({
                             description = 'Порядковый номер',
                             constant,
                             examples = ['max', 'min', '++', '--', 1, 10, -100],
                             errors = {},
                             defaults = 'max',
                             scope = [],
                             ...other
                           }) {
  let result = {
    anyOf: [
      {is: 'OrderProperty', errors: {is: false}},
      {
        type: 'string',
        enum: ['min', '++', '--', 'max'],
        description: 'Относительная установка',
        errors: {type: false, enum: false}
      },
      {type: 'integer', errors: {type: false, minimum: false}}
    ],
    instance: {name: 'OrderProperty', emptyToNull: true, createWithNull: true, options: {scope}},
    title: description,
    errors: {
      anyOf: {message: "Incorrect type (Integer, 'max', 'min', '++', '--')", rule: 'type'},
      ...errors
    },
    ...other
  };
  if (constant) {
    result.constant = constant;
  }
  if (examples) {
    result.examples = examples;
  }
  // if (errors) {
  //   result.errors = errors;
  // }
  if (defaults) {
    result.default = defaults;
  }
  return result;
};
