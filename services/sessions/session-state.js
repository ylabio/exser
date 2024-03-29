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
   * Переопределить состояния, чтобы потом отменить.
   * Для отмены используется метод revert()
   * Может использоваться для подмены пользовательских значений на системные для выполнения спец. операций
   * @param patch
   * @param pushHistory
   */
  override(patch = {}, pushHistory = true){
    if (patch) {
      let revert = {};
      const keys = Object.keys(patch);
      for (const key of keys) {
        revert[key] = this[key];
        this[key] = patch[key];
      }
      if (pushHistory) {
        this._history.push(revert);
      }
    }
  }

  /**
   * Откат изменений, сделанных методом change()
   */
  revert(){
    this.override(this._history.pop(), false);
  }
}

module.exports = SessionState;
