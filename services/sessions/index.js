const SessionState = require('./session-state');

/**
 * Сервис сессий
 * Фабрика состояний сессии. Состояние создаётся на обработку запросов клиента или внутрисистемной логики.
 */
class Sessions {

  async init(config, services) {
    this.config = config;
    this.services = services;
    this.counter = 0;
    this.SessionStateCounstrictor = this.config.SessionStateCounstrictor || SessionState;
  }

  create(){
    return new this.SessionStateCounstrictor(++this.counter, this.services);
  }
}

module.exports = Sessions;
