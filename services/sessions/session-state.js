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
}

module.exports = SessionState;
