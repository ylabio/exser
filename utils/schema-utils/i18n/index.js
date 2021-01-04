/**
 * Мультиязычная строка
 * @param description
 * @param minLength
 * @param maxLength
 * @param defaultValue
 * @param other
 * @returns {Object}
 */
module.exports = function({description = '', minLength = 0, maxLength = 1000, defaultValue = '', ...other}){
  let s = {
    type: 'string',
    minLength,
    maxLength,
  }

  let result = {
    anyOf:[s, {type: 'object', patternProperties: {'^.*$': s}}],
    i18n: 'in',
    description
  };
  if (typeof other.example !== 'undefined') {
    result.example = other.example;
    delete other.example;
  }
  if (typeof other.defaultValue !== 'undefined') {
    result.default = other.defaultValue;
    delete other.defaultValue;
  }
  if (typeof other.default !== 'undefined') {
    result.default = other.default;
    delete other.default;
  }
  Object.assign(s, other);
  return result;
};
