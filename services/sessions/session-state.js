const mc = require('merge-change');
/**
 * Состояние сессии
 */
class SessionState {

  constructor(code, services) {
    this.code = code;
    this.date = new Date();
    this.step = 1;
    this.setAuth({user: null, token: null});
    this.setAcceptLang('ru');
    this.services = services;
  }

  /**
   * Проверка сессии на совпадение свойствам
   * @param match {Object} Сравниваемый объект
   * @param [separator]
   * @returns {boolean}
   */
  isMatch(match = {}, separator = '.'){
    return mc.utils.match(this, match, {}, separator);
  }

  setAuth({user, token}){
    this.user = user;
    this.token = token;
    return this;
  }

  setAcceptLang(lang){
    this.acceptLang = lang;
    return this;
  }

  incStep(){
    this.step++;
  }

  toJSON(){
    return {
      code: this.code,
      date: this.date,
      step: this.step,
      user: this.user,
      token: this.token,
      acceptLang: this.acceptLang
    };
  }
}

module.exports = SessionState;
