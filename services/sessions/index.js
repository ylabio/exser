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
    this.SessionStateCounstrictor = this.config.SessionStateCounstrictor || SessionState;
    return this;
  }

  create(){
    return new this.SessionStateCounstrictor(++this.counter, this.services);
  }
}

module.exports = Sessions;
