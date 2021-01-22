//const Ajv = require('ajv').default;
const {utils} = require('merge-change');

/**
 * Если значение не соответствует указанному классу (конструктору), то создаётся новый экземпляр.
 * В конструктор передаётся текущее значение.
 * Если есть опции и у экземпляра метод setOptions(), то они будут установлены
 * @param spec {Spec} Сервис спецификаций
 * @param services {Services} Менеджер сервисов
 * @returns {Function}
 */
const keywordMaker = function(spec, services){
  return {
    keyword: 'instance',
    modifying: true,
    compile: (schema, parentSchema) => {
      return function (data, {dataPath, parentData, parentDataProperty, rootData}) {
        const constructor = keywordMaker.CLASS_NAMES[schema.name] || keywordMaker.CLASS_NAMES[schema];
        if (!constructor) {
          return false;
        }
        // Замена пустой строки или 'null' на null, если это допускается классом
        if (schema.emptyToNull && (data === 'null' || data === '')) {
          data = null;
        }
        // Замена значения на null, если конструктор класса не принимает null
        if (data === null && !schema.createWithNull) {
          utils.set(rootData, dataPath, null, false, '/');
          return true;
        }
        // Создание экземпляра, если значение ещё не является им
        if (!(data instanceof constructor)) {
          data = new constructor(data);
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
    // Схема ключевого слова
    metaSchema: {
      type: 'object',
      properties: {
        name: {type: 'string', description: 'Название класса (конструктора)'},
        emptyToNull: {type: 'boolean', description: 'Пустую строку или "null" конвертировать в Null?', default: false},
        createWithNull: {type: 'boolean', description: 'Создавать экземпляр если Null?', default: false},
        options: {
          type: 'object',
          additionalProperties: true,
          default: {},
          description: 'Опции для экземпляра, если у него есть метод setOptions()'
        },
      },
    },
  }
}

/**
 * Поддерживаемые классы
 * @type {Object}
 */
keywordMaker.CLASS_NAMES = {
  'Date': Date,
};

module.exports = keywordMaker;
