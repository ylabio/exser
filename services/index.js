const stringUtils = require('../utils/string-utils');
const objectUtils = require('../utils/object-utils');
const fs = require('fs');
const path = require('path');

class Services {

  constructor(){
    this.configs = {};
    this.list = [];
    this.configure(path.join(__dirname, '../configs.js'), path.join(__dirname,'../configs.local.js'));
  }

  /**
   * @param configs
   * @returns {Promise<Services>}
   */
  async init(configs) {
    this.configs = this.configure(configs);
    return this;
  }

  /**
   * @param configsList {Object|String} Options or filenames with options
   * @returns {Services}
   */
  configure(...configsList){
    if (configsList) {
      for (let i = 0; i < configsList.length; i++) {
        if (typeof configsList[i] === 'string') {
          const filename = path.resolve(configsList[i]);
          if (!fs.existsSync(filename)) {
            fs.writeFileSync(filename, 'module.exports = {};\n');
            console.log(`A configuration file "${filename}" was created`);
          }
          configsList[i] = require(filename);
        }
        if (typeof configsList === 'object') {
          this.configs = objectUtils.merge(this.configs, configsList[i]);
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
}

process.on('unhandledRejection', function (reason/*, p*/) {
  console.error(reason);
  process.exit(1);
});

module.exports = Services;
