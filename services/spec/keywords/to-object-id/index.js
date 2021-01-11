const Ajv = require('ajv').default;
const ObjectID = require('mongodb').ObjectID;
const {utils} = require('merge-change');

module.exports = (spec, services) => ({
  keyword: 'toObjectId',
  modifying: true,
  compile: (schema, parentSchema) => {
    return function (data, {dataPath, parentData, parentDataProperty, rootData}) {
      const context = this;
      try {
        switch (context.target){
          case 'json':
            if (!data) {
              utils.set(rootData, dataPath, null, false, '/');
            } else if (utils.type(data) === 'ObjectID') {
              utils.set(rootData, dataPath, data.toString(), false, '/');
            }
            break;
          case 'js':
          default:
            if (!data || data === 'null') {
              utils.set(rootData, dataPath, null, false, '/');
            } else if (typeof data === 'string') {
              utils.set(rootData, dataPath, new ObjectID(data), false, '/');
            }
            break;
        }
      }catch (e) {
        return false
      }
      return true;
    };
  },
  errors: 'full',
  metaSchema: {
    type: 'boolean'
  },
});
