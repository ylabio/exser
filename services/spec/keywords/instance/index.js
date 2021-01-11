//const Ajv = require('ajv').default;
const {utils} = require('merge-change');


const keywordMaker = function(spec, services){
  return {
    keyword: 'instance',
    modifying: true,
    compile: (schema, parentSchema) => {
      return function (data, {dataPath, parentData, parentDataProperty, rootData}) {
        const className = keywordMaker.CLASS_NAMES[schema.construct] || keywordMaker.CLASS_NAMES[schema];
        if (!className) {
          return false;
        }
        // Замена пустой строки или 'null' на null, если это допускается классом
        if (className.emptyStringToNull && (data === 'null' || data === '')) {
          data = null;
        }
        // Замена значения на null, если конструктор класса не принимает null
        if (data === null && !className.canCreateWithNull) {
          utils.set(rootData, dataPath, null, false, '/');
          return true;
        }
        // Создание экземпляра, если значение ещё не является им
        if (!(data instanceof className.construct)) {
          data = new className.construct(data);
          utils.set(rootData, dataPath, data, false, '/');
        }
        // Если есть опции и метод опций у класса
        if (schema.options && (typeof data.setOptions === 'function')) {
          data.setOptions(schema.options);
        }
        return true;
      };
    },
    errors: 'full',
    metaSchema: {
      type: 'object',
      properties: {
        name: {type: 'string'},
        options: {type: 'object', additionalProperties: true, default: {}},
      },
    },
  }
}

keywordMaker.CLASS_NAMES = {
  'Date': {construct: Date, emptyStringToNull: true, canCreateWithNull: false},
};

module.exports = keywordMaker;
