const bluebird = require('bluebird');
const crypto = require('crypto');
bluebird.promisifyAll(crypto);
const camelCase = require('lodash.camelcase');
const upperFirst = require('lodash.upperfirst');

const stringUtils = {

  random (length = 6,
           chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'){
    let text = '';
    for (let i = 0; i < length; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
  },

  hash(value) {
    return crypto.createHash('md5').update(value).digest('hex');
  },

  isHash(value){
    return /^[a-f0-9]{32}$/.test(value);
  },

  async generateToken() {
    return await crypto.randomBytes(32).toString('hex');
  },

  escapeRegex (s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  },

  toDash(value) {
    return value.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase();
  },

  toCamelCase(value) {
    return camelCase(value);
  },

  toUpperFirst(value){
    return upperFirst(value);
  }
};

module.exports = stringUtils;
