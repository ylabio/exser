/**
 * Состояние сессии
 */
class SessionState {

  constructor(code) {
    this.code = code;
    this.date = new Date();
    this.step = 1;
    this.setAuth({user: null, token: null});
    this.setAcceptLang('ru');
  }

  setAuth({user, token}){
    this.user = user;
    this.token = token;
  }

  setAcceptLang(lang){
    this.acceptLang = lang;
  }

  incStep(){
    this.step++;
  }
}

module.exports = SessionState;
