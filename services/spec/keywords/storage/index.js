module.exports = (spec, services) => ({
  name: 'rel',
  type: 'object',
  modifying: true,
  async: true,
  callback: async ({data, path, schema, parentSchema, parentObject, propName, rootData, context = {}}) => {
    let types = schema.type || schema._type; // тип в схеме (может быть массивом)
    // Если по схеме тип не опредлен, то берем переданный
    if ((!types || (Array.isArray(types) && !types.length)) && data._type) {
      types = [data._type];
    }
    const linkPath = path.substring(1).replace(/\[[0-9]+\]/, '');
    if (context.model) {
      const linkMeta = context.model._links && context.model._links[linkPath];
      if (linkMeta) {
        let cond = {};
        for (const field of linkMeta.by) {
          if (data[field]) {
            cond[field] = field === '_id' ? new ObjectID(data[field]) : data[field];
          }
        }
        if (Object.keys(cond).length) {
          if (types) {
            if (!Array.isArray(types)) {
              types = [types];
            }
            // Выборка из коллекции
            for (let type of types) {
              const link = await self.storage.get(type).native.findOne(cond);
              if (link) {
                const rel = await context.model.onLinkPrepare({
                  path: linkPath,
                  link
                });
                data._type = type;
                if (rel) {
                  data = Object.assign(data, rel);
                }
                return true;
              }
            }
          }
          //console.log(data);
          return false;
        }
      }
    }
    return true;
  },
  errors: 'full',
  metaSchema: {
    type: 'object',
    properties: {
      // Условия на связываемый объект
      type: {type: ['string', 'array']},
      _type: {type: ['string', 'array']},
      // Сведения о связи
      copy: {type: 'string'},
      search: {type: 'string'},
      inverse: {type: 'string'},
      tree: {type: 'string'},
      // По каким полям искать отношение, если они переданы
      by: {type: 'array'}
    },
  }
});

