const {utils} = require('merge-change');

module.exports = (spec, services) => ({
  keyword: 'is',
  compile: (schema, parentSchema) => {
    return function (data, {dataPath, parentData, parentDataProperty, rootData}) {
      return utils.instanceof(data, schema);
    };
  },
  metaSchema: {
    type: 'string'
  },
});
