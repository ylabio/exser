const mc = require('merge-change');
/**
 * Состояние сессии
 */
class SessionState {

  constructor(code) {
    this._history = []; // История изменения методом change()
    this.code = code; // Код состояния присваиваемый сервисом Sessions
    this.date = new Date(); // Дата создания состояния
    this.step = 1; // Счётчик шагов для логирования сервисом Logs
    this.user = null; // Авторизованный пользователь
    this.lang = 'ru'; // Локаль, возможен формате Accept-Lang
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

  /**
   * Данные для конвертации в JSON
   * @returns {SessionState}
   */
  toJSON(){
    return Object.assign({}, this);
  }

  /**
   * Изменение состояния с записью текущего в историю.
   * Для отката используется метод revert()
   * @param patch
   * @param pushHistory
   */
  change(patch = {}, pushHistory = true){
    if (patch) {
      if (pushHistory) {
        this._history.push(this.toJSON());
      }
      const keys = Object.keys(patch);
      for (const key of keys) {
        this[key] = patch[key];
      }
    }
  }

  /**
   * Откат изменений, сделанных методом change()
   */
  restore(){
    this.change(this._history.pop(), false);
  }
}

module.exports = SessionState;
