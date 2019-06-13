const {stringUtils} = require('../../utils');

class Example {

  async init(config, services) {
    this.config = config;
    this.services = services;
    return this;
  }

  async start(params) {
    console.log('- Work example');
    //console.log('Params:', params);
    // console.log('Config:', this.config);
    return 'Result of example task';
  }
}

module.exports = Example;
