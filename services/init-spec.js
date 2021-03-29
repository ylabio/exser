const Services = require('./index');

/**
 * Менеджер сервисов с конфиогом для тестирвоания
 * Импортируется в тестах
 * @type {Promise.<Services>}
 */
module.exports = new Services().configure(['configs.js', 'configs-spec.js']);
