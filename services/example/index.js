const Service = require("../service");

class Example extends Service {

  async start(params) {
    console.log('- Work example');
    //console.log('Params:', params);
    // console.log('Config:', this.config);
    return 'Result of example task';
  }
}

module.exports = Example;
