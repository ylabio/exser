/**
 * Параметр запроса
 * @param name {String} Название параметра
 * @param [where] {String=query|path|header|cookie} Где параметр? В пути, в query, заголовке, куке. Алиас для in
 * @param [description] {String} Краткое описание
 * @param [schema] {Object} Схема параметра. По умолчанию строка
 * @param [example] {*} Пример значения
 * @param [examples] {Object<Object>} Множество примеров
 * @param [required] {Boolean} Обязательно ли тело запроса
 * @param [deprecated] {Boolean} Устарел или нет параметр
 * @param [allowEmptyValue] {Boolean} Допустимо пустое значение
 * @param [style] {string} Способ сериализации. Определяется автоматом. Зависит от типа параметра и где расположен. @see https://swagger.io/specification/#data-type-format
 * @param [explode] {Boolean} Генерировать множество параметров под каждый элемент параметра, если параметр - массив
 * @param [allowReserved] {Boolean} Не экранировать спец символы :/?#[]@!$&'()*+,;=
 * @param [$ref] {String} Ссылка на фрагмент схемы, например #/components/parameters/some
 * @param [wrap] {String} Обернуть название параметра для реализация вложенности
 * @param [other] {...*} Другие параметры поддерживаемые JSONSchema
 * @returns {object}
 */
module.exports = function ({name, where = 'query', description = '', schema = {type: 'string'}, example, examples, required, deprecated, allowEmptyValue, style, explode, allowReserved, $ref, wrap, ...other}) {
  if ($ref){
    return {$ref};
  }
  if (wrap){
    name = `${wrap}[${name}]`
  }
  let result = {
    name,
    description,
    in: other.in || where,
    schema
  };
  if (required){
    result.required = required;
  }
  if (result.in === 'path'){
    result.required = true
  }
  if (example){
    result.example = example;
  }
  if (examples){
    result.examples = examples;
  }
  if (deprecated){
    result.deprecated = deprecated;
  }
  if (allowEmptyValue){
    result.allowEmptyValue = allowEmptyValue;
  }
  if (style){
    result.style = style;
  }
  if (explode){
    result.explode = explode;
  }
  if (allowReserved){
    result.allowReserved = allowReserved;
  }
  return result;
};