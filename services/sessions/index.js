const SessionState = require('./session-state');
const Service = require("../service");

/**
 * Сервис сессий
 * Фабрика состояний сессии. Состояние создаётся на обработку запросов клиента или внутрисистемной логики.
 */
class Sessions extends Service {

  async init(config, services) {
    await super.init(config, services);
    this.counter = 0;
    this.SessionStateCounstructor = this.config.SessionStateCounstructor || SessionState;
    return this;
  }

  create(){
    return new this.SessionStateCounstructor(++this.counter);
  }
}

module.exports = Sessions;
