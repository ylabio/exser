const moment = require('moment');

class Tasks {

  async init(config, services) {
    this.config = config;
    this.services = services;
    return this;
  }

  async start({name, ...params}) {
    if (this.config[name]) {

      let params = this.config[name] || {};
      // for (const m of args) {
      //   const pair = m.split('=');
      //   params[pair[0]] = (pair.length > 1) ? (Number(pair[1]) || pair[1]) : true;
      // }
      if (typeof params.log === 'undefined'){
        params.log = true;
      }
      if (params.log === 'false'){
        params.log = false;
      }
      if (typeof params.iterations === 'undefined'){
        params.iterations = 0;
      }
      if (!params.log) {
        console.log(`# Start ${name} (without logs)`);
      }

      const taskService = await this.services.get(this.config[name].service || name, params);

      let iteration = 0;
      const loop = async (resolve, reject) => {
        try {
          if (params.log) {
            console.log(`# Start ${name} at ${moment().format('HH:mm:ss')}`);
          }
          await taskService.start(params);
          if (params.log) {
            console.log(`# Completed ${name} at ${moment().format('HH:mm:ss')}`);
          }
          iteration++;
          if (
            (!params.iterations || iteration < params.iterations) &&
            (params.interval || params.interval === 0)
          ) {
            setTimeout(()=>loop(resolve, reject), params.interval);
          } else {
            resolve();
          }
        } catch (e) {
          if (params.log) {
            console.error(`# Error ${name}: "${e.toString()}" at ${moment().format('HH:mm:ss')}. =`);
          }
          reject(e);
        }
      };

      return new Promise((resolve, reject) => {
        loop(resolve, reject).catch(e => {
          reject(e)
        });
      });
    } else {
      console.error(`Unknown task name "${name}"`);
    }
  }
}

module.exports = Tasks;
