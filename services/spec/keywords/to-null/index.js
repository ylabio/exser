const Ajv = require('ajv').default;
const {utils} = require('merge-change');

module.exports = (spec, services) => ({
  keyword: 'toNull',
  modifying: true,
  compile: (schema, parentSchema) => {
    return function (data, {dataPath, parentData, parentDataProperty, rootData}) {
      console.log('to-null', data);
      if (!data || data === 'null') {
        utils.set(rootData, dataPath, null, false, '/');
      }
      return true;
    };
  },
  errors: false,
  metaSchema: {
    type: 'boolean'
  },
});
