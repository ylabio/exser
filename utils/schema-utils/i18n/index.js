/**
 * Мультиязычная строка
 * @param description
 * @param other
 * @returns {Object}
 */
module.exports = function({description, ...other}){
  let result = {
    type: ['string', 'object'],
    patternProperties: {
      '^.*$': {type: 'string'},
    },
    i18n: 'in'
  };
  if (typeof description !== 'undefined') {
    result.description = description;
  }
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
  result.patternProperties['^.*$'] = Object.assign({type: 'string'}, other);
  return result;
};
