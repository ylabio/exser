/**
 * Схема отношения на другую модель
 * Отношение обязательно содержит идентификатор (_id) и тип (_type) связываемой сущности
 * Через ключевое свойство rel описываются параметры отношения. Параметры обрабатываются сервисом storage
 * Параметры генерируемой схемы
 * @param type {String|Array} - на какую модель устанавливается связь, если на любую то указать пустой массив. Несколько вариантов указать в массиве.
 * @param description {String} - Название (краткое описание) отношения
 * @param copy {String} - какие свойства скопировать в отношение (в формате fields). В отношении окажутся свойства связанной сущности.
 * @param search {String} - какие свойства скопировать в отношение (в формате fields). Копируются значения свойств и помещаются в массив search. Для реализации поиска по множеству свойств без указания по какому (использование фич mongodb)
 * @param inverse {String} - название (путь) свойства в связанной модели, которым устанавливается обратная связь. Взаимосвязи будут автоматически проставляться
 * @param tree {String} - название дерева. Если указано, то создаётся внутри отношения "материализованный путь" до корня - массив родителей. Для поиска по иерархии. В родительской сущности идется отношение с таким же названием tree
 * @param by {Array<String>} - по каким свойствам искать связываемую сущность. По умолчанию поиск по _id или _key. Формируется условие ИЛИ на все указанные свойства
 * @param properties {Object} - описание кастомных свойств отношения. Можно использовать для переопределения значения связываемой сущности.
 * @param required {Array} - обязательные свойства отношения
 * @param additionalProperties {Object} - допустимость свойств, не указанных схемой
 * @param other - другие параметры поддерживаемые JSONSchema для описания схемы объекта (например default, example)
 * @returns {Object} JSONSchema
 */
module.exports = function({
               type = [],
               description = '',
               copy = '',
               search = '',
               inverse = '',
               tree = '',
               by = ['_id', '_key'],
               properties = {},
               required = [],
               additionalProperties = false,
               ...other
             }) {
  let result = {
    type: 'object',
    description: description,
    properties: Object.assign({
        _id: {$ref: '#/components/schemas/object-id'},
        _type: {type: 'string', description: 'Тип объекта'},
        _key: {type: 'string', description: 'Вторичный идентификатор объекта'},
      }, properties,
    ),
    rel: {type, copy, search, inverse, tree, by},
    errors: {rel: 'Not found relation object'},
    additionalProperties: additionalProperties,
    required,
  };
  if (tree) {
    result.properties._tree = {type: 'array', description: 'Массив родителей', items: {type: 'object'}};
  }
  if (typeof other.default !== 'undefined') {
    result.default = other.default;
  } else {
    result.default = {};
  }
  if (typeof other.example !== 'undefined') {
    result.example = other.example;
  }
  if (!type || Array.isArray(type)) {
    result.properties._type = {type: 'string', description: 'Тип объекта'};
    if (Array.isArray(type) && type.length) {
      result.properties._type.enum = type;
    }
  }
  return result;
}
