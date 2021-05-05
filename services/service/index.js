const utils = require('../../utils');

/**
 * Абстрактный класс сервиса
 * Реализация типовых методов сервиса
 * Наследуется в реальных сервисах
 */
class Service {

  /**
   * Название сервиса.
   * Определяется по названию класса. Составное название разделяется дефисом ServiceName => service-name
   * @returns {String}
   */
  name() {
    if (!this._name) this._name = utils.strings.toDash(this.constructor.name);
    return this._name;
  }

  /**
   * Название сервиса для опции в общей конфигурации.
   * По молчанию это this.name()
   * @returns {String}
   */
  configName() {
    return this.name();
  }

  /**
   * Инициализация сервиса
   * @param config {Object} Опции конфигурации для сервиса.
   * @param services {Services} Менеджер сервисов для доступа к другим сервисам
   * @returns {Promise<Service>}
   */
  async init(config, services) {
    this.config = config;
    this.services = services;
    return this;
  }

  /**
   * Запуск сервиса
   * Используется, если сервис может исполняться через CLI
   * @param params
   * @returns {Promise<void>}
   */
  async start(params = {}) {

  }
}

module.exports = Service;