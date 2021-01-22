const object = require('./../object');
/**
 * Схема отношения на другую модель
 * Отношение - это объект с ключами связанного объекта: идентификатором (_id) и типом (_type).
 * В объекте отношения могут быть определены дополнительные свойства. Автоматически определяются служебные свойства для оптимизации поиска или других задач.
 * Через ключевое свойство rel описываются параметры отношения. Параметры обрабатываются сервисом storage
 * Параметры отношения
 * @param model {String|Array} Тип связанной модели. Можно указать несколько типов или пустым массивом обозначить любой тип. Тогда тип обязательно передать при создании отношения.
 * @param [copy] {String} Какие свойства связанного объекта скопировать в отношение. Указываются в формате fields. В отношении окажутся свойства связанного объекта.
 * @param [search] {String} Значения каких свойств связанного объекта скопировать в отношение в её свойство-массив "search". Указываются в формате fields.
 * @param [inverse] {String} Обратное отношение в связанном объекте. Название свойства (путь на него). Связанный объект будет автоматически проставлять (обновлять) обратное отношение.
 * @param [tree] {String} Связь-иерархия. Указывается название иерархии, чтобы в связанном объекте найти связь с той же иерархией. Если указано, то в отношении создаётся "материализованный путь" до корня - массив родителей. Для поиска по иерархии.
 * @param [own] {Boolean} Связь-композиция. Используется при прототипировании объекта, чтобы создавать новые экземпляры связанных объектов.
 * @param [proto] {Boolean} Связь-прототип. В объект копируются все свойства прототипа (связанного объекта). Фактически объект создаётся копированием прототипа.
 * @param [by] {Array<String>} По каким свойствам искать связанный объект. По умолчанию поиск по _id или _key. Формируется условие ИЛИ на все указанные свойства.
 * Параметры объекта отношения
 * @param [maxProperties] {number} Максимальное количество свойств
 * @param [minProperties] {number} Минимальная количество свойств
 * @param [properties] {Object.<Object>} Дополнительные свойства отношения. Ключ объекта - название свойства. Значение - схема свойства
 * @param [patternProperties] {string} Паттерн для названия свойств отношения.
 * @param [additionalProperties] {Object} Допустимость свойств, не указанных схемой
 * @param [required] {Array} - Обязательные свойства отношения.
 * @param [dependentRequired] {Object.<Array.<string>>} Зависимость свойства от наличия других свойств. Например {dependentRequired: {prop1: ['prop2', 'prop3']}}
 * @param [dependentSchemas] {Object.<Object.<Object>>} Зависимость свойства от соответствии схемам других свойств. Например {dependentSchemas: {prop1: {properties: {'prop2': {type: string}]}}}
 * @param [propertyNames] {Object} Схема на названия свойств
 * @param [description] {string} Краткое описание
 * @param [enums] {Array.<number>} Допустимые значение. Алиас enum
 * @param [constant] {number} Строгое равенство значению
 * @param [examples] {Array.<number>} Примеры значений
 * @param [errors] {Object.<string>} Тексты ошибок на ключевые слова. Например {type: "Неверный тип", maxLength: "Слишком длинная строка"}
 * @param [defaults] {string} Значение по умолчанию. Алиас для default.
 * @param [other] {...*} Другие параметры поддерживаемые JSONSchema для описания объекта
 *
 * @returns {Object} JSONSchema
 */
module.exports = function ({
                             model = [],
                             copy = '',
                             search = '',
                             inverse = '',
                             tree = '',
                             own = false,
                             proto = false,
                             by = ['_id', '_key'],
                             maxProperties,
                             minProperties,
                             properties,
                             patternProperties,
                             additionalProperties = false,
                             required = [],
                             dependentRequired,
                             dependentSchemas,
                             propertyNames,
                             description = '',
                             enums,
                             constant,
                             examples,
                             errors = {},
                             defaults = {},
                             ...other
                           }) {
  let result = object({
    // Метаданные отношения
    rel: {type: model, copy, search, inverse, tree, by},
    //instance: {name: 'RelProperty', emptyToNull: true, createWithNull: true, options: {type: model, copy, search, inverse, tree, by}},
    // Базовые свойства объекта
    maxProperties,
    minProperties,
    properties: {
      _id: {$ref: '#/components/schemas/object-id'},
      _type: {type: 'string', description: 'Тип объекта'},
      _key: {type: 'string', description: 'Вторичный идентификатор объекта'},
      ...properties
    },
    patternProperties,
    additionalProperties,
    required,
    dependentRequired,
    dependentSchemas,
    propertyNames,
    description,
    enums,
    constant,
    examples,
    errors: {rel: 'Not found relation object', ...errors},
    defaults,
    ...other
  });
  // Свойство для индексации дерева
  if (tree) {
    result.properties._tree = {type: 'array', description: 'Массив родителей', items: {type: 'object'}};
  }
  // Допустимые значения для свойство _type если
  if (Array.isArray(model)) {
    if (model.length) result.properties._type.enum = model;
  } else {
    if (model) result.properties._type.enum = ['', model];
  }
  return result;
};
