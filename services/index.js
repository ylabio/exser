const utils = require('../utils');
const fs = require('fs');
const path = require('path');
const mc = require('merge-change');
const Service = require('./service');

class Services {

  constructor(){
    this.configs = {};
    this.list = [];
    this.configure([path.join(__dirname, '../configs.js'), path.join(__dirname,'../configs.local.js')]);
  }

  /**
   * @param configs
   * @returns {Promise<Services>}
   */
  async init(configs) {
    this.configure(configs);
    return this;
  }

  /**
   * Запуск сервисов
   * @param commands {Array<{name: {String}, params: {Object}}>} Массив команд с названием и параметрами запускаемого сервиса
   * @returns {Promise<*>}
   */
  async start(commands){
    if (!Array.isArray(commands)) commands = [commands];
    let started = [];
    for (let command of commands){
      const service = await this.get(command.name);
      if (typeof service.start === 'function') {
        started.push(service.start(command.params));
      } else {
        console.log(`Service "${command.name}" has no "start" method`);
      }
    }
    if (started.length === 0){
      console.log('Service name not defined');
    }
    // await all started service
    return Promise.all(started);
  }

  /**
   * Подключение конфигураций
   * Объект конфигурации содержит ключи - названия сервисов, значение ключа - объект с опциями для соотв. сервиса
   * Вместо объекта можно передавать названия файла с конфигурацией.
   * Путь относительно корня приложения.
   * Если указанного файла нет, то ону будет создан с пустым объектом конфигурации.
   * @param configs {Array<Object|String>} Массив с объектами опций или пути на файлы.
   * @returns {Services}
   */
  configure(configs){
    if (configs) {
      for (let i = 0; i < configs.length; i++) {
        if (typeof configs[i] === 'string') {
          const filename = path.resolve(configs[i]);
          if (!fs.existsSync(filename)) {
            fs.writeFileSync(filename, 'module.exports = {};\n');
            console.log(`A configuration file "${filename}" was created`);
          }
          configs[i] = require(filename);
        }
        if (typeof configs === 'object') {
          this.configs = mc.merge(this.configs, configs[i]);
        }
      }
    }
    return this;
  }

  /**
   *
   * @param path {String} Путь на файл сервиса относительно корня приложения
   * @param [params] {Object} Параметры сервису, дополняющие конфиг
   * @return {Promise<Service>}
   */
  async import(path, params = {}) {
    if (!this.list[path]) {
      const ClassName = require(path);
      this.list[path] = new ClassName();
      let configName;
      if (this.list[path].configName === 'function'){
        configName = this.list[path].configName();
      } else {
        configName = path.split(/[\/\\]/).pop();
      }
      this.list[path] = this.list[path].init(mc.merge(this.configs[configName], params), this);
    }
    return this.list[path];
  }

  async get(name, params){
    const method = `get${utils.strings.toUpperFirst(utils.strings.toCamelCase(name))}`;
    if (this[method]){
      return this[method](params);
    } else {
      throw new Error(`Unknown service ${name}`);
    }
  }

  /**
   * @return {Promise<Storage>}
   */
  async getStorage(params) {
    return this.import('./storage', params);
  }

  /**
   * @return {Promise<Spec>}
   */
  async getSpec(params) {
    return this.import('./spec', params);
  }

  /**
   * @return {Promise<RestAPI>}
   */
  async getRestApi(params) {
    return this.import('./rest-api', params);
  }

  /**
   * @return {Promise<Tasks>}
   */
  async getTasks(params) {
    return this.import('./tasks', params);
  }

  /**
   * @return {Promise<Example>}
   */
  async getExample(params) {
    return this.import('./example', params);
  }

  /**
   * @returns {Promise<Logs>}
   */
  async getLogs(params) {
    return this.import(__dirname + '/logs', params);
  }

  /**
   * @returns {Promise<Sessions>}
   */
  async getSessions(params) {
    return this.import(__dirname + '/sessions', params);
  }

  /**
   * @returns {Promise<Dump>}
   */
  async getDump(params) {
    return this.import(__dirname + '/dump', params);
  }

  /**
   * @returns {Promise<Access>}
   */
  async getAccess(params) {
    return this.import(__dirname + '/access', params);
  }

  /**
   * @returns {Promise<Init>}
   */
  async getInit(params) {
    return this.import(__dirname + '/init', params);
  }
}

module.exports = Services;
