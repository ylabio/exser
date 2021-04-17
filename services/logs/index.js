const mc = require('merge-change');
/**
 * Сервис логирования
 * Используется для логирования логических шагов с учётом сессии
 */
class Logs {

  async init(config, services) {
    this.config = config;
    this.services = services;
    this.lastLogCode = null;
    this.lastLog = {rn: true};
    return this;
  }

  log({text, data, session, level = '', rn = true}){
    let line = [`${level}`];
    let isNewGroup = true;
    if (session){
      if (this.lastLog.code === session.code){
        line.push(`└─`);
        isNewGroup = false;
      }
      line.push(`${session.code}.${session.step}@${session.user ? session.user.username : 'guest'}`);
      if (level === '#'){
        session.incStep();
      }
      this.lastLog.code = session.code;
    }
    line.push(text);
    if (typeof data !== 'undefined') {
      if (typeof data === 'object'){
        data = mc.merge(data, {$unset: this.config.unsetFields});
        line.push(JSON.stringify(data));
      } else {
        line.push(data);
      }
    }
    // Если новая группа или тип сообщения, но в прошлом не было переноса строки
    if (isNewGroup && level!== this.lastLog.level && this.lastLog.rn === false ){
      process.stdout.write('\r\n');
    } else {
      // Если в прошлом логе переноса не было, то будет очищена строка
      if (process.stdout.clearLine) {
        process.stdout.clearLine();
      } else {
        process.stdout.write('\r');
      }
      if (process.stdout.cursorTo) {
        process.stdout.cursorTo(0);
      }
    }
    process.stdout.write(line.join(' '));
    if (rn) {
      process.stdout.write('\r\n');
    }
    this.lastLog.level = level;
    this.lastLog.text = text;
    this.lastLog.rn = rn;
  }

  /**
   * Логирование шага
   * @param name
   * @param data
   * @param session
   */
  step({text, data, session, rn = true}) {
    this.log({text, data, session, level: '#', rn});
  }

  /**
   * Логирование ошибки
   * @param name
   * @param error
   * @param session
   */
  error({text, data, error, session, rn}) {
    if (!text && error){
      text = error.message;
    }
    if (error) {
      let stack = error.stack.split(/\s*\n\s*/);
      stack.shift();
      if (stack.length) {
        text += ' ' + stack[0];
      }
      this.log({text, data: error.data || data, session, level: '!', rn});
    } else {
      this.log({text, data, session, level: '!', rn});
    }
  }

  /**
   * Логирование прогресса
   * Удаляется предыдущая строка лога с прогрессом
   * @param text
   * @param data
   * @param session
   * @param current
   * @param total
   * @param stop
   */
  progress({text, data, session, current, total, stop = false}) {
    if (total){
      let percent = (current / total * 100).toFixed(1);
      text = (text ? text + ' ' : '') + `${current}/${total} [${percent}%]`;
    }
    this.log({text, data, session, level: '%', rn: current >= total || stop});
  }
}

module.exports = Logs;