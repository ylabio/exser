const string = require('./../string');
/**
 * Мультиязычная строка
 * @param [minLength] {number} Минимальная длина
 * @param [maxLength] {number} Максимальная длина
 * @param [pattern] {string} Регулярное выражение, например "[abc]+"
 * @param [format] {string} Название формата.
 * @param [description] {string} Краткое описание
 * @param [enums] {Array.<number>} Допустимые значение. Алиас enum
 * @param [constant] {number} Строгое равенство значение
 * @param [examples] {Array.<number>} Примеры значений
 * @param [errors] {Object.<string>} Тексты ошибок на ключевые слова. Например {type: "Неверный тип", maxLength: "Слишком длинная строка"}
 * @param [defaults] {string} Значение по умолчанию. Алиас для default.
 * @param defaultLang {string} Код языка по умолчанию из @exser/services/storage/properties/i18n/languages.js
 * @param [other] {...*} Другие параметры поддерживаемые JSONSchema для описания строки
 * @returns {object}
 * @returns {Object}
 */
module.exports = function ({
                             minLength,
                             maxLength = 500,
                             pattern,
                             format,
                             description = '',
                             enums,
                             constant,
                             examples,
                             errors,
                             defaults,
                             defaultLang = 'ru',
                             ...other
                           }) {
  let typeString = string({
    minLength,
    maxLength,
    pattern,
    format,
    enums,
    constant,
    errors,
    ...other,
  });

  let result = {
    anyOf: [
      {is: 'I18nProperty', errors: {is: false}}, // Сперва проверка принадлежности классу, чтобы валидатор не удалил свойства в нём из-за других вариантов правил
      typeString, // Значение на текущем (в сессии) языке
      {type: 'object', patternProperties: {'^[a-z]{2}(-[a-zA-Z-]+)?$': typeString}, additionalProperties: false}, // Если передан объект с множеством языков Варианты кодов: ru, en-US, ha-Latn-GH
    ],
    instance: {name: 'I18nProperty', emptyToNull: false, createWithNull: true, options: {default: defaultLang}}, // Конвертация в экземпляр I18nProperty
    errors: {
      anyOf: {message: 'Incorrect type (String, Object<string>)', rule: 'type'}, // Обобщение всех ошибок из anyOf
      ...errors,
    },
    description,
  };
  // if (empty){
  //   result.anyOf.unshift({
  //     enum: ['', null, 'null'], errors: {enum: false}
  //   })
  // }
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
