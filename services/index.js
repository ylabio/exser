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

  async init(configs) {
    this.configs = this.configure(configs);
    return this;
  }

  /**
   *
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
          console.log(filename);
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
  async import(path, ...args) {
    if (!this.list[path]) {
      const ClassName = require(path);
      this.list[path] = new ClassName();
      const name = path.split(/[\/\\]/).pop();
      await this.list[path].init(this.configs[name], this, ...args);
    }
    return this.list[path];
  }

  /**
   * @return {Promise.<Storage>}
   */
  async getStorage(mode) {
    return this.import('./storage', mode);
  }

  /**
   * @return {Promise.<Spec>}
   */
  async getSpec() {
    return this.import('./spec');
  }

  /**
   * @return {Promise.<RestAPI>}
   */
  async getRestAPI() {
    return this.import('./rest-api');
  }
}

process.on('unhandledRejection', function (reason/*, p*/) {
  console.error(reason);
  process.exit(1);
});

module.exports = Services;
