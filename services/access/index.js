const mc = require('merge-change');
const Service = require("../service");
const utils = require('../../utils')

/**
 * Сервис контроля доступа
 * Проверяет наличие доступа на "действие"
 * Настройки доступов - это список записей (ACL), содержащие условие на сессию и перечень действий с запретом или разрешением их выполнения.
 * Действия могут быть вложенными и содержать дополнительные параметры для детализации настроек.
 * Например иметь перечень объектов с которыми выполняется действие (и на которые распространяется доступ).
 * В перечне объектов указывается значения их свойств, обычно идентификатора.
 * В условиях можно сослаться на параметр сессии, например objects: [{'author._id': '$session.user._id'}]
 * Разрешение в одной ACL записи перекрывает запреты во всех других.
 *
 * По умолчанию ACL прописываются в общем файле конфигураций, но их также можно добавлять динамически методами сервиса.
 * Например выгружать из базы данных, чтобы реализовывать их настройки через АПИ.
 *
 * Если на действие нет ACL записи, значит его запрещено выполнять.
 * Название действия может быть указано звездочкой *, что означает любое действие.
 */
class Access extends Service {

  async init(config, services) {
    await super.init(config, services);
    this.acl = this.config.acl;
    return this;
  }

  /**
   * Добавление ACL записи по ключу.
   * @param key {*} Уникальный ключ ACL записи. Обычно строка или число
   * @param session {Object} Условие на сессию
   * @param actions {Object} Объект с действиями и параметрами доступа к ним
   * @returns {Object}
   */
  addAcl(key, session, actions) {
    const index = this.acl.findIndex(item => item.key === key);
    if (index === -1) {
      this.acl.push({
        key, session, actions
      });
      return this.acl[this.acl.length - 1];
    } else {
      this.acl[index] = {key, session, actions};
      return this.acl[index];
    }
  }

  /**
   * Удаление ACL записи по ключу
   * @param key {*} Ключ записи. Обычно строка или число
   * @returns {boolean|Object}
   */
  deleteAcl(key) {
    const index = this.acl.findIndex(item => item.key === key);
    if (index !== -1) {
      return this.acl.splice(index, 1);
    }
    return false;
  }

  /**
   * Поиск ACL по ключу
   * @param key {*} Ключ записи. Обычно строка или число
   * @returns {Object}
   */
  findAcl(key) {
    return this.acl.findIndex(item => item.key === key);
  }

  /**
   * Поиск списка ACL по сессии
   * @param session {SessionState}
   * @returns {Array<Object>}
   */
  findAclItemsBySession(session) {
    let result = [];
    if (mc.utils.instanceof(session, 'SessionState')) {
      for (const item of this.acl) {
        if (session.isMatch(item.session)) {
          result.push(item);
        }
      }
    }
    return result;
  }

  /**
   * Поиск списка ACL в которых есть указанное действие
   * @param action {String} Название действия
   */
  findAclItemsByAction(action) {
    let result = [];
    for (const acl of this.acl) {
      // Проверка названий действий с шаблонами *
      const names = action.split('.');
      // Все варианты масок со звездочкой равно 2^(кол-во names)
      const cnt = Math.pow(2, names.length);
      for (let i = 0; i < cnt; i++) {
        // Перебираются шаблон от исходного xx.yy.zz к обобщенному *.*.* до первого найденного
        let template = utils.arrays.fillByBinaryMask(names, '*', i).join('.');
        if (template in acl.actions) {
          if (acl.actions[template] && acl.actions[template].allow !== false) {
            result.push({...acl, match: template});
          }
          break;
        }
      }
    }
    return result;
  }

  /**
   * Проверка запрета на действие
   * При запрете возвращает объект с деталями запрета. Если запрета нет, но возвращается false
   * @param action {String} Свойство доступа по которому сверяются права
   * @param session {SessionState} Сессия
   * @param object {Object} Объект, на который поверяется доступ
   * @param [details] {Object} Если передать объект, то в него добавятся детали проверки доступа.
   * @param [access] {Object} Внутренний параметр для рекурсии
   * @returns {boolean|Object}
   */
  isDeny({action = 'user.create', session = {}, object = null, details = {}, access = undefined}) {
    if (!this.isAllow({action, session, object, details, access})){
      return details;
    } else {
      return false;
    }
  }

  /**
   * Проверка доступа на действие
   * @param action {String} Свойство доступа по которому сверяются права
   * @param session {SessionState} Сессия
   * @param object {Object} Объект, на который поверяется доступ
   * @param [details] {Object} Если передать объект, то в него добавятся детали проверки доступа.
   * @param [access] {Object} Внутренний параметр для рекурсии
   * @returns {boolean|*}
   */
  isAllow({action = 'user.create', session = {}, object = null, details = {}, access = undefined}) {
    if (session.access === false){
      return true;
    }
    // Если не передан объект доступов, то ищем в настройках по сессии
    if (access === undefined) {
      details.key = null;
      details.action = action;
      details.template = null;
      details.objects = false;
      const list = this.findAclItemsBySession(session);
      for (let index = 0; index < list.length; index++){
        const item = list[index];
        details.key = item.key;
        if (this.isAllow({action, session, object, details, access: item || null})) {
          return true;
        }
      }
      return false;
    }
    // Если доступы не определены или явно запрещены
    if (!access || access.allow === false) {
      return false;
    }
    if (access.actions) {
      // Проверка названий действий с шаблонами *
      const names = action.split('.');
      // Все варианты масок со звездочкой равно 2^(кол-во names)
      const cnt = Math.pow(2, names.length);
      for (let i = 0; i < cnt; i++) {
        // Перебираются шаблон от исходного xx.yy.zz к обобщенному *.*.*
        let template = utils.arrays.fillByBinaryMask(names, '*', i).join('.');
        // Если действие по шаблону найдено, то только по нему определяется доступ
        if (template in access.actions) {
          details.template = template;
          const sub = access.actions[template];
          if (!sub || sub.allow === false) {
            return false;
          }
          // Если передан объект в метод и есть параметры доступов по объектам
          if (object && sub.objects) {
            details.objects = true;
            return !!sub.objects.find(item => mc.utils.match(object, item, {session}));
          }
          return true;
        }
      }
      // Шаблоны с двумя звездами на конце
      let newNames = [...names];
      for (let i = 0; i < names.length; i++) {
        newNames.splice(newNames.length - 1, 1);
        const template = newNames.length ? newNames.join('.') + '.**' : '**';
        // @todo Проверка по шаблону **
      }
    }
    return false;
  }

  /**
   * Объекты доступов по названию действия
   * @param action Свойство доступа по которому сверяются права
   * @param session {SessionState} Сессия
   * @param access Для рекурсии
   * @returns {[]}
   */
  getAccess({action = 'user.create', session = {}, access = undefined}) {
    // Если не передан объект доступов, то берем из сесссии
    let result = [];
    if (access === undefined) {
      const list = this.findAclItemsBySession(session);
      for (const item of list) {
        result = result.concat(this.getAccess({action, session, access: item || null}));
      }
      return result;
    }
    // Если доступы не определены или явно запрещены
    if (!access || access.allow === false) {
      return result;
    }
    if (access.actions) {
      // // Доступ на первый уровень есть. Если указан action, то проверка вложенного уровня
      const names = action.split('.');
      // Все варианты масок со звездочкой равно 2^(кол-во names)
      const cnt = Math.pow(2, names.length);
      for (let i = 0; i < cnt; i++) {
        // Перебираются шаблон от исходного xx.yy.zz к обобщенному *.*.*
        let template = utils.arrays.fillByBinaryMask(names, '*', i).join('.');
        // Если действие по шаблону найдено, то только по нему определяется доступ
        if (template in access.actions) {
          const sub = access.actions[template];
          if (sub && sub.allow !== false) {
            result.push(sub);
          }
          break;
        }
      }
      // Шаблоны с двумя звездами на конце
      let newNames = [...names];
      for (let i = 0; i < names.length; i++) {
        newNames.splice(newNames.length - 1, 1);
        const template = newNames.length ? newNames.join('.') + '.**' : '**';
        // @todo Проверка по шаблону **
      }
    }
    return result
  }

  /**
   * Условие для выборки из монги с учётом прав на объекты
   * @param action Свойство доступа по которому сверяются права
   * @param session {SessionState} Сессия
   * @returns {*}
   */
  makeFilterQuery({action = 'user.create', session = {}}) {
    if (session.access === false){
      return true;
    }
    const accessList = this.getAccess({action, session});
    //console.log(accessList);
    let detail = false;
    let query = {$or: []};
    for (const access of accessList) {
      if (access.objects) {
        for (const obj of access.objects) {
          let cond = {};
          let keys = Object.keys(obj);
          let hasCond = keys.length > 0;
          for (const key of keys) {
            let value = obj[key];
            if (typeof value === 'string' && value.substr(0, 1) === '$') {
              value = mc.utils.get({session}, value.substr(1), undefined);
            }
            // Если значение неопределенно, то весь объект убирается из выборки
            if (value === void 0) {
              hasCond = false;
            } else {
              cond[key] = utils.query.type(value);
            }
          }
          if (hasCond) query.$or.push(cond);
          // Так узнаем, есть ли хотя бы одно условие на объект
          detail = detail || hasCond;
        }
      } else {
        // Полностью разрешено без уточнения объектов
        return true;
      }
    }
    return detail ? query : false;
  }

}

module.exports = Access;


