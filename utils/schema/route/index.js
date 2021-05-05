const body = require('./../body');
/**
 * Роутер express
 * @param [tags] {Array} Массив с названиями тегов для группировки ротуров
 * @param [summary] {String} Краткое описания
 * @param [description] {String} Подробное описание с markdown
 * @param [externalDocs] {{description, url}} Ссылка на внешнюю документацию
 * @param [operationId] {String} Строковый код действия
 * @param [action] {String} Строковый код действия. Алиас operationId
 * @param [parameters] {Array<Object>} Массив параметров запроса
 * @param [requestBody] {Object} Схема тела запроса
 * @param [responses] {Object<Object>} Схемы ответов
 * @param [callbacks] {Object} Автоматически исполняемые запросы @see https://swagger.io/specification/#operation-object
 * @param [deprecated] {Boolean} Признак устаревшего роутера
 * @param [security] {Object} Тип авторизации для запроса. По умолчанию устанавливается автоматом
 * @param [servers] {Object} Список серверов (хостов) куда слать запрос. По умолчанию текущий хост.
 * @param [other] {...*} Другие параметры поддерживаемые JSONSchema для описания массива
 * @returns {object}
 */
module.exports = function ({
                             tags,
                             summary,
                             description,
                             externalDocs,
                             operationId,
                             action,
                             parameters,
                             requestBody,
                             responses,
                             callbacks,
                             deprecated,
                             security,
                             servers,
                             ...other
                           }) {
  if (responses){
    responses = {
      200: body({})
    }
  }
  let result = {
    responses,
    ...other
  };
  if (tags) {
    result.tags = tags;
  }
  if (summary) {
    result.summary = summary;
  }
  if (description) {
    result.description = description;
  }
  if (externalDocs) {
    result.externalDocs = externalDocs;
  }
  if (operationId) {
    result.operationId = operationId;
  }
  if (action) {
    result.action = action;
  }
  if (parameters) {
    result.parameters = parameters;
  }
  if (requestBody) {
    result.requestBody = requestBody;
  }
  if (responses) {
    result.responses = responses;
  }
  if (callbacks) {
    result.callbacks = callbacks;
  }
  if (deprecated) {
    result.deprecated = deprecated;
  }
  if (security) {
    result.security = security;
  }
  if (servers) {
    result.servers = servers;
  }
  return result;
};
