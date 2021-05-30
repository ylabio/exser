const mc = require('merge-change');
const Ajv = require('ajv').default;

/**
 * Если значение не соответствует указанному классу (конструктору), то создаётся новый экземпляр.
 * В конструктор передаётся текущее значение.
 * Если есть опции и у экземпляра метод setOptions(), то они будут установлены
 * @param spec {Spec} Сервис спецификаций
 * @param services {Services} Менеджер сервисов
 * @returns {Function}
 */
const instanceKeywordMaker = function(spec, services){
  return {
    keyword: 'instance',
    modifying: true,
    async: true,
    compile: (schema, parentSchema) => {
      return async function (data, {instancePath, rootData}) {
        const context = this;
        try{
          const instance = instanceKeywordMaker.exe(data, schema, context.session, services)
          mc.utils.set(rootData, instancePath, instance, false, '/');
          if (instance && typeof instance.validate === 'function'){
            await instance.validate();
          }
          return true;
        } catch (e){
          if (e instanceof Ajv.ValidationError){
            throw e;
          } else {
            throw new Ajv.ValidationError([
              {keyword: 'instance', message: e.message, parentSchema, params: {}}
            ])
          }
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
instanceKeywordMaker.CLASS_NAMES = {
  'Date': Date,
};

/**
 * Преобразование в экземпляр класса
 * Вынесено в отдельную функцию, чтобы использовать отдельно от валидации
 * (Отдельно используется в storage/model для преобразования данных после выборки из базы данных до применения схем view)
 * @param value
 * @param schema
 * @param session
 * @param services
 * @returns {null|*}
 */
instanceKeywordMaker.exe = function (value, schema, session = {}, services){
  const constructor = instanceKeywordMaker.CLASS_NAMES[schema.name] || instanceKeywordMaker.CLASS_NAMES[schema];
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
    if (schema.options) {
      value = new constructor({value, session, services, options: schema.options});
    } else {
      value = new constructor(value);
    }
  }
  return value;
}

module.exports = instanceKeywordMaker;
