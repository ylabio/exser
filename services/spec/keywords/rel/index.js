const ObjectID = require('mongodb').ObjectID;
/**
 * Ключевое слово rel - отношение на модель
 * Проверка наличия связываемого объекта и инициализация свойств отношения по заданным в схеме параметрам
 * @param spec {Spec}
 * @param services {Services}
 * @returns {Object}
 */
module.exports = (spec, services) => ({
  keyword: 'rel',
  type: 'object',
  modifying: true,
  async: true,
  compile: (sch, parentSchema) => {
    return async function (data, {dataPath, parentData, parentDataProperty, rootData}) {
      const context = this;
      const storage = await services.getStorage();
      try {
        let types = sch.type || sch._type; // тип в схеме (может быть массивом)
        // Если по схеме тип не опредлен, то берем переданный
        if ((!types || (Array.isArray(types) && !types.length)) && data._type) {
          types = [data._type];
        }
        //console.log(data, dataPath, parentObject, propName, rootData);
        const linkPath = dataPath.substring(1).replace(/\/[0-9]+/, '');
        console.log(linkPath);
        if (context.collection) {
          const linkMeta = context.collection._links && context.collection._links[linkPath];
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
                  const link = await storage.get(type).native.findOne(cond);
                  if (link) {
                    const rel = await context.collection.onLinkPrepare({
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
      } catch (e) {
        //console.log(data);
        console.log(e);
        return false;
      }
    };
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

