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
        const linkPath = dataPath.substring(1).replace(/\/[0-9]+/, '');
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
                  const link = await storage.get(type).native.findOne(cond);
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
      model: {type: ['string', 'array'], description: 'Тип связанной модели. Можно указать несколько типов или пустым массивом обозначить все (любой тип). Тогда тип обязательно передать при создании отношения'},
      // Сведения о связи
      copy: {type: 'string', description: 'Какие свойства связанного объекта скопировать в отношение. Указываются в формате fields'},
      search: {type: 'string', description: 'Значения каких свойств связанного объекта скопировать в отношение в свойство-массив "search". Указываются в формате fields'},
      inverse: {type: 'string', description: 'Обратная отношение в связанном объекте. Название свойства. Чтобы связанный объект автоматически проставил (обновил) обратное отношение'},
      // По каким полям искать отношение, если они переданы
      by: {type: 'array', description: 'По каким свойствам искать связанный объект. Условие ИЛИ на перечисленные свойства. По умолчанию поиск по _id или _key'},
      own: {type: 'boolean', default: false, description: 'Связь-композиция. Учитывается при прототипировании объекта, чтобы создавать новые экземпляры связанных объектов'},
      proto: {type: 'boolean', default: false, description: 'Связь-прототип. В объект копируются все свойства прототипа'},
      tree: {type: 'string', description: 'Связь-иерархия. Указывается название иерархии, чтобы в связанном объекте найти связь с той же иерархией '},
    },
  }
});

