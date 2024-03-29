const {Service} = require("exser");
const InitState = require('./init-state');

class Init extends Service {

  async init(config, services) {
    await super.init(config, services);
    this.states = {};
    return this;
  }

  async start(params = {}){
    // Здесь запускаются все требуемые методы инициализации
    //await this.example();
  }

  /**
   * Инициализация примера
   * @returns {Promise<InitState>}
   */
  async example(){
    const state = this.getState('example');
    // Чтобы повторно не инициализировать
    if (state.isEmpty()){
      state.append({id: 1, title: 'example'});
    }
    return state;
  }

  /**
   * Состояние по ключу
   * @param key {String} Ключ состояния
   * @returns {InitState}
   */
  getState(key){
    if (!this.states[key]) this.states[key] = new InitState(key);
    return this.states[key];
  }

  /**
   * Удаление состояния по ключу
   * @param key {String} Ключ состояния
   */
  deleteState(key){
    if (this.states[key]) delete this.states[key];
  }

  /**
   * Удаление всех состояний
   */
  deleteAllState(){
    this.states = {};
  }
}

module.exports = Init;
