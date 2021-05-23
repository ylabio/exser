const mc = require('merge-change');
/**
 * Состояние сессии
 */
class SessionState {

  constructor(code) {
    this.code = code;
    this.date = new Date();
    this.step = 1;
    this.user = null;
    this.lang = 'ru';
    this.access = true;
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

  incStep(){
    this.step++;
  }

  toJSON(){
    return Object.assign({}, this);
  }
}

module.exports = SessionState;
