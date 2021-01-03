/**
 * Схема отношения на другую модель
 * Отношение обязательно содержит идентификатор (_id) и тип (_type) связываемой сущности
 * Через ключевое свойство rel описываются параметры отношения
 * @param params {Object} {description='', _type, inverse, copy, search, properties = {}, default, required = [], example={}, by=['_id', '_key']}
 * Параметры генерируемой схемы
 * type {String|Array} - на какую модель устанавливается, если на любую то указать пустой массив
 * copy {String} - какие свойства скопировать в отношение (в формате fields). В отношении окажутся свойства связанной сущности.
 * search {String} - какие свойства скопировать в отношение (в формате fields). Копируются значения свойств и помещаются в массив search. Для реализации поиска по множеству свойств (использование фич mongodb)
 * by {Array<String>} - по каким свойствам искать связываемую сущность (by). По умолчанию поиск по _id или _key
 * tree {String} - название дерева. Если указано, то создаётся внутри отношения материализованный путь на всех родителей до корня. Для поиска по иерархии. В родительской сущности используется отношение с таким же названием tree
 * inverse {String} - название (путь) свойства в связанной модели, которым устанавливается обратная связь. Взаимосвязи будут автоматически проставляться
 * properties {Object} - описание кастомных свойств отношения
 * description {String} - Название (краткое описание) отношения
 * default {Object} - Значение по умолчанию
 * required {Array} - Обязательные свойства отношения
 * example {Object} - Пример значения отношения
 * @returns {{type: string, description: *, properties: *, rel: *, errors: {rel: string}, additionalProperties: boolean}}
 */
module.exports = (spec, params) => {
  //{description='', rel={}, properties = {}, default, required = [], example={}}
  let result = {
    type: 'object',
    description: params.description || '',
    properties: Object.assign({
      _id: {$ref: '#/components/schemas/object-id'},
      _type: {type: 'string', description: 'Тип объекта'},
      _tree: {type: 'array', description: 'Массив родителей', items: {type: 'object'}},
      _key: {type: 'string', description: 'Вторичный идентификатор объекта'}
    }, params.properties || {}
    ),
    rel: params,
    errors: {rel: 'Not found relation object'},
    additionalProperties: params.additionalProperties || false
  };
  result.required = params.required || [];
  //result.required.push('_id');

  if (params.default) {
    result.default = params.default;
  }
  if (typeof params.example !== 'undefined') {
    result.example = params.example;
  }

  if (params.type) {
    params._type = params.type;
    delete params.type;
  }

  if (!params.by) {
    params.by = ['_id', '_key'];
  }

  if (!params._type || Array.isArray(params._type)) {
    result.properties._type = {type: 'string', description: 'Тип объекта'};
    if (Array.isArray(params._type) && params._type.length) {
      result.properties._type.enum = params._type;
    }
    //result.required.push('_type');
  }
  return result;
};
