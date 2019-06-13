const moment = require('moment');

class Tasks {

  async init(config, services) {
    this.config = config;
    this.services = services;
    return this;
  }

  async start(taskName, ...args) {
    if (this.config[taskName]) {

      let params = this.config[taskName] || {};
      for (const m of args) {
        const pair = m.split('=');
        params[pair[0]] = (pair.length > 1) ? (Number(pair[1]) || pair[1]) : true;
      }
      if (typeof params.log === 'undefined'){
        params.log = true;
      }
      if (typeof params.iterations === 'undefined'){
        params.log = 0;
      }

      const taskService = await this.services.get(this.config[taskName].service || taskName, params);

      let iteration = 0;
      const loop = async (resolve, reject) => {
        try {
          if (params.log) {
            console.log(`# Start ${taskName} at ${moment().format('HH:mm:ss')}`);
          }
          await taskService.start(params);
          if (params.log) {
            console.log(`# Completed ${taskName} at ${moment().format('HH:mm:ss')}`);
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
            console.error(`# Error ${taskName}: "${e.toString()}" at ${moment().format('HH:mm:ss')}. =`);
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
      console.error(`Unknown task name "${taskName}"`);
    }
  }
}

module.exports = Tasks;
