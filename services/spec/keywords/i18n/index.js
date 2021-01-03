const acceptLanguage = require('accept-language');
const languagesCodes = Object.keys(require('./languages'));

module.exports = (spec, services) => ({
  keyword: 'i18n',
  type: ['string', 'object'],
  modifying: true,
  compile: (sch, parentSchema) => {
    return function (data, dataPath, parentObject, propName, rootData) {
      const context = this;
      try {
        if (sch === 'in') {
          if (typeof data === 'string') {
            acceptLanguage.languages(languagesCodes);
            const key = acceptLanguage.get(context.session.acceptLang || 'ru');
            parentObject[propName] = {[key]: data};
          }
        } else {
          if (typeof data === 'object' && context.session.acceptLang !== 'all') {
            acceptLanguage.languages(Object.keys(data));
            const key = acceptLanguage.get(context.session.acceptLang || 'ru');
            parentObject[propName] = data[key];
          }
        }
      } catch (e) {
        return false;
      }
      return true;
    };
  },
  errors: false,
  metaSchema: {
    type: 'string',
    enum: ['in', 'out'],
  },
});
