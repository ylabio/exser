const mc = require('merge-change');

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
    compile: (schema) => {
      return function (data, {dataPath, rootData}) {
        const context = this;
        try{
          mc.utils.set(rootData, dataPath, keywordMaker.exe(data, schema, context.session), false, '/');
          return true;
        } catch (e){
          return false;
        }
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
          description: 'Опции для экземпляра'
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

/**
 * Преобразование в экземпляр класса
 * Вынесено в отдельную функцию, чтобы использовать отдельно от валидации
 * (Отдельно используется в storage/model для преобразования данных после выборки из базы данных до применения схем view)
 * @param value
 * @param schema
 * @param session
 * @returns {null|*}
 */
keywordMaker.exe = function (value, schema, session = {}){
  const constructor = keywordMaker.CLASS_NAMES[schema.name] || keywordMaker.CLASS_NAMES[schema];
  if (!constructor) {
    throw new Error('Неизвестный конструктор');
  }
  // Замена пустой строки или 'null' на null, если это допускается классом
  if (schema.emptyToNull && (value === 'null' || value === '')) {
    value = null;
  }
  // Замена значения на null, если конструктор класса не принимает null
  if (value === null && !schema.createWithNull) {
    return value;
  }
  // Создание экземпляра, если значение ещё не является им
  if (!(value instanceof constructor)) {
    value = new constructor({value, session, options: schema.options});
  }
  return value;
}

module.exports = keywordMaker;
