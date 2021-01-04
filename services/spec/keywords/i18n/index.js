const acceptLanguage = require('accept-language');
const languages = require('./languages');
const languagesCodes = Object.keys(languages);
const Ajv = require('ajv').default;

module.exports = (spec, services) => ({
  keyword: 'i18n',
  type: ['string', 'object'],
  //modifying: true,
  compile: (schema, parentSchema) => {
    return function (data, {dataPath, parentData, parentDataProperty, rootData}) {
      //return false;
      if (typeof data === 'object'){
        const keys = Object.keys(data);
        let errors = [];
        for (const key of keys) {
          if (!languages[key]) {
            errors.push({
              keyword: 'i18n',
              dataPath: `${dataPath}/${key}`,
              message: 'Invalid language code',
              //schemaPath,
              params: {},
              schema,
              parentSchema,
              data
            });
          }
        }
        if (errors.length){
          throw new Ajv.ValidationError(errors);
        }
      }
      // const context = this;
      // try {
      //   if (schema === 'in') {
      //     if (typeof data === 'string') {
      //       acceptLanguage.languages(languagesCodes);
      //       const key = acceptLanguage.get(context.session.acceptLang || 'ru');
      //       parentObject[propName] = {[key]: data};
      //     }
      //   } else {
      //     if (typeof data === 'object' && context.session.acceptLang !== 'all') {
      //       acceptLanguage.languages(Object.keys(data));
      //       const key = acceptLanguage.get(context.session.acceptLang || 'ru');
      //       parentObject[propName] = data[key];
      //     }
      //   }
      // } catch (e) {
      //   return false;
      // }
      return true;
    };
  },
  errors: 'full',
  metaSchema: {
    type: 'string',
    enum: ['in', 'out'],
  },
});
