const Ajv = require('ajv').default;
const {utils} = require('merge-change');

module.exports = (spec, services) => ({
  keyword: 'toDate',
  modifying: true,
  compile: (schema, parentSchema) => {
    return function (data, {dataPath, parentData, parentDataProperty, rootData}) {
      const context = this;
      try {
        switch (context.target){
          case 'json':
            if (!data) {
              utils.set(rootData, dataPath, null, false, '/');
            } else if (utils.type(data) === 'Date') {
              utils.set(rootData, dataPath, data.toISOString(), false, '/');
            }
            break;
          case 'js':
          default:
            if (!data || data === 'null') {
              utils.set(rootData, dataPath, null, false, '/');
            } else if (typeof data === 'string') {
              utils.set(rootData, dataPath, new Date(data), false, '/');
            }
            break;
        }
      }catch (e) {
        console.log(e);
        throw new Ajv.ValidationError([{
          keyword: 'toDate',
          dataPath: `${dataPath}/${key}`,
          message: 'Не удалось обработать дату',
          //schemaPath,
          params: {},
          schema,
          parentSchema,
          data
        }]);
      }
      return true;
    };
  },
  errors: 'full',
  metaSchema: {
    type: 'boolean'
  },
});
