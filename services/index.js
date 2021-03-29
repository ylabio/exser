const stringUtils = require('../utils/string-utils');
const objectUtils = require('../utils/object-utils');
const fs = require('fs');
const path = require('path');

class Services {

  constructor(){
    this.configs = {};
    this.list = [];
    this.configure([path.join(__dirname, '../configs.js'), path.join(__dirname,'../configs.local.js')]);
  }

  async init(configs) {
    this.configure(configs);
    return this;
  }

  /**
   * Запуск сервисов
   * @param commands {Array<{name: {String}, params: {Object}}>} Массив команд с названием и параметрами запускаемого сервиса
   * @returns {Promise<unknown[]>}
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
   *
   * @param configs {Object|String} Options or filenames with options
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
          this.configs = objectUtils.merge(this.configs, configs[i]);
        }
      }
    }
    return this;
  }

  /**
   *
   * @param {String} path
   * @return {Promise<*>}
   */
  async import(path, params) {
    if (!this.list[path]) {
      const ClassName = require(path);
      this.list[path] = new ClassName();
      const name = path.split(/[\/\\]/).pop();
      await this.list[path].init(Object.assign({}, this.configs[name], params), this);
    }
    return this.list[path];
  }

  async get(name, params){
    const method = `get${stringUtils.tuUpperFirst(stringUtils.toCamelCase(name))}`;
    if (this[method]){
      return this[method](params);
    } else {
      throw new Error(`Unknown service ${name}`);
    }
  }

  /**
   * @return {Promise.<Storage>}
   */
  async getStorage(params) {
    return this.import('./storage', params);
  }

  /**
   * @return {Promise.<Spec>}
   */
  async getSpec(params) {
    return this.import('./spec', params);
  }

  /**
   * @return {Promise.<RestAPI>}
   */
  async getRestApi(params) {
    return this.import('./rest-api', params);
  }

  /**
   * @return {Promise.<Tasks>}
   */
  async getTasks(params) {
    return this.import('./tasks', params);
  }

  /**
   * @return {Promise.<Example>}
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
}

process.on('unhandledRejection', function (reason/*, p*/) {
  console.error(reason);
  process.exit(1);
});

module.exports = Services;
