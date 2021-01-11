const any = require('./../any');
/**
 * Массив
 * @param [maxItems] {number} Максимальное длина массива
 * @param [minItems] {number} Минимальная длина массива
 * @param [uniqueItems] {boolean} Уникальность элементов массива.
 * @param [items] {Object|Array.<Object>} Схема для всех элементов, например {type: 'string'}. Массивом можно указать схемы для конкретных элементов
 * @param [additionalItems] {boolean|Object} Схема для остальных элементов, если items задан в виде массива. В ином случаи игнорируется
 * @param [contains] {Object} Схема элемента, который должен присутствовать в массиве
 * @param [maxContains] {number} Максимальное количество элементов по схеме contains.
 * @param [minContains] {number} Минимальное количество элементов по схеме contains.
 * @param [description] {string} Краткое описание
 * @param [enums] {Array.<Array>} Допустимые значение. Алиас enum
 * @param [constant] {Array} Строгое равенство значение
 * @param [examples] {Array.<Array>} Примеры значений
 * @param [errors] {Object.<string>} Тексты ошибок на ключевые слова. Например {type: "Неверный тип", maxLength: "Слишком длинная строка"}
 * @param [defaults] {Array} Значение по умолчанию. Алиас для default.
 * @param [other] {...*} Другие параметры поддерживаемые JSONSchema для описания массива
 * @returns {object}
 */
module.exports = function ({
                             maxItems,
                             minItems,
                             uniqueItems,
                             items,
                             additionalItems,
                             contains,
                             maxContains,
                             minContains,
                             description = '',
                             enums,
                             constant,
                             examples,
                             errors,
                             defaults,
                             ...other
                           }) {
  let result = any({type: 'array', description, enums, constant, examples, errors, defaults, ...other});
  if (maxItems) {
    result.maxItems = maxItems;
  }
  if (minItems) {
    result.minItems = minItems;
  }
  if (uniqueItems) {
    result.uniqueItems = uniqueItems;
  }
  if (items) {
    result.items = items;
  }
  if (additionalItems) {
    result.additionalItems = additionalItems;
  }
  if (contains) {
    result.contains = contains;
  }
  if (maxContains) {
    result.maxContains = maxContains;
  }
  if (minContains) {
    result.minContains = minContains;
  }
  return result;
};
