const cors = require('cors');
const express = require('express');
const expressRouter = require('express').Router;
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const errors = require('../../utils').errors;
const xmlparser = require('express-xml-bodyparser');
const Service = require('../service');
const utils = require('../../utils');

class RestAPI extends Service {

  async init(config, services) {
    await super.init(config, services);
    this.config.url = `${this.config.protocol}${this.config.host}${this.config.port ? ':' + this.config.port : ''}`;
    this.spec = await this.services.getSpec();
    this.access = await this.services.getAccess();
    this.logs = await this.services.getLogs();
    this.app = null;
    return this;
  }

  /**
   * Запуск сервиса - запуск RestAPI сервера
   * @param params {Object} Колбэки, чтобы подключить к приложению middleware на разных стадиях
   * @returns {Promise<Express>}
   */
  async start(params = {
    atFirst: null,
    atEnd: null,
    atError: null,
    atRequest: null,
    atResponse: null
  }) {
    const app = await this.getApp(params);
    await new Promise((resolve) => {
      app.listen(this.config.port, this.config.host, function () {
        resolve();
      });
    });
    this.logStart(app);
    return app;
  }

  /**
   * Вывод лога после запуска приложения
   * В отдельном методе для возможности переопределения
   * @param app
   */
  logStart(app) {
    console.log(`REST API: ${this.config.url}${this.config.path}`);
  }

  /**
   * Experss приложение
   * Инициализация, если его ещё нет
   * @param params {Object} Колбэки, чтобы подключить к приложению middleware на разных стадиях
   * @returns {Promise<Express>}
   */
  async getApp(params = {
    atFirst: null,
    atEnd: null,
    atError: null,
    atRequest: null,
    atResponse: null
  }) {
    if (this.app) {
      return this.app;
    }
    this.app = express();
    if (params.atFirst) {
      await params.atFirst(this.app);
    }
    this.app.use(cookieParser());
    this.app.use(bodyParser.json());
    this.app.use(xmlparser());
    this.app.use(bodyParser.urlencoded({extended: true}));
    this.app.use(express.static('public'));
    this.app.use(this.config.path, await this.getRouter({
      pathUrl: this.config.path,
      routers: this.config.routers,
      atRequest: params.atRequest,
      atResponse: params.atResponse,
    }));
    if (params.atEnd) {
      await params.atEnd(this.app);
    }
    this.app.use(this.errorHandler({atError: params.atError}));
    return this.app;
  }

  /**
   * Создание роутеров
   * @returns {Promise.<*>}
   */
  async getRouter({pathUrl, routers, atRequest, atResponse}) {
    // Переопределение методов роутера для документирования и обработки ответа
    const router = expressRouter();
    const methods = ['get', 'post', 'put', 'delete', 'options', 'patch', 'head'];
    router.origin = {};
    for (let method of methods) {
      router.origin[method] = router[method].bind(router);
      router[method] = (path, def, fun) => {
        if (typeof def === 'function') {
          fun = def;
        } else {
          if (def && def.action && !def.operationId){
            def.operationId = def.action;
          }
          // Добавление роута в спецификацию
          if (def && !def.hidden) {
            // Требуется ли авторизация?
            if (def.operationId) {
              if (!def.action) def.action = def.operationId; // operationId будет использоваться для вывода emoji про доступ в ui
              // Узнаем настройки доступов для действия
              const aclList = this.access.findAclItemsByAction(def.action);
              // Трансформация настроек в параметр сваггера
              if (aclList.length === 0) {
                // Вообще нет доступа - уведомляем об этом!
                def.summary = `${def.summary || ''} ⛔️`;
              } else {
                // По умолчанию доступа нет вообще
                let needAuth = false;
                let canPublic = false;
                // Проверяем, какие условия на сессию.
                // Если есть поля в 'session' - то применяется авторизация
                // Если полей нет в 'session' - то возможен публичный доступ
                for (const acl of aclList) {
                  if (acl.session && Object.keys(acl.session).length) {
                    // Есть условие на сессию
                    // @todo Поля в session не всегда означает требование авторизации
                    needAuth = true;
                  } else {
                    canPublic = true;
                  }
                }
                if (needAuth) {
                  // Возможна авторизация
                  if (!def.security) {
                    def.security = this.config.defaultSecurity;
                  }
                }
                if (canPublic) {
                  // Возможен доступ без авторизации
                  def.summary = `${def.summary || ''} 👀`;
                }
              }
            }
            const pathEscape = this.getSpecPath('paths', def.path || path, method);
            this.spec.set(pathEscape, def);
          } else {
            def = {};
          }
        }
        router.origin[method](path, this.responseHandler(fun, def, atRequest, atResponse));
      };
    }
    // Поддержка кроссдоменных запросов
    if (this.config.cors.active) {
      router.use(cors(this.config.cors));
    }

    if (!this.spec.get('servers') || !this.spec.get('servers').length) {
      this.spec.set('servers', [{url: `${pathUrl}`, description: ''}]);
    }

    // Подключение всех контроллеров к роутеру
    const routersKeys = Object.keys(routers);
    for (const key of routersKeys) {
      await routers[key](router, this.services, {base: this.config.url, path: this.config.path});
    }
    return router;
  }

  /**
   * Обработчик запросов
   * Проверяет доступ на роут, если в нем указан action (operationId)
   * Форматирует результат роутера в общий форма {result, errors}
   * @param callback
   * @param def
   * @param atRequest
   * @param atResponse
   * @returns {(function(req, res, next): Promise<void>)}
   */
  responseHandler(callback, def, atRequest, atResponse) {
    return async (req, res, next) => {
      req.def = def;
      req.action = def.action;
      if (atRequest) {
        await atRequest(req, res, next);
      }
      // Проверка доступа на действие
      if (def.action) {
        const details = {};
        const isAllow = this.access.isAllow({action: def.action, session: req.session, details});
        if (!isAllow){
          if (details.key === null){
            // Не найдены acl для сессии, считаем что сессия не авторизована
            next(new errors.Unauthorized(details));
          } else {
            // Запрет на действие или отсутствие настроек доступа
            next(new errors.Forbidden(details));
          }
          return;
        }
      }

      try {
        let isSendStatus = false;
        res.originStatus = res.status;
        res.status = status => {
          res.originStatus(status);
          isSendStatus = true;
          return res;
        };
        let result = await callback(req, res, next);
        // Если в роутере свой алгоритм отправки ответа, то он должен вернуть undefined
        // Иначе отправка ответа в JSON
        if (typeof result !== 'undefined') {
          // Если статус не установлен вручную
          if (!isSendStatus) {
            res.status(res.statusCode || 200);
          }
          // Массив оборачивается в свойство items
          // Любой результат в свойство result, чтобы отличать от ответа с ошибками валидации
          if (Array.isArray(result)) {
            result = {result: {items: result}};
          } else {
            result = {result};
          }
          if (atResponse) {
            atResponse(result, req, res, next);
          }
          if (!req.stopLoadByFields && !res.stopLoadByFields) {
            result.result = await utils.query.loadByFields({
              object: result.result,
              fields: req.query.fields || '*',
              action: req.action
            });
          }
          res.json(result);
        }
      } catch (e) {
        next(e);
      }
    };
  }

  /**
   * Обработка ошибок роутера
   * @returns {function(err, req, res, next)}
   */
  errorHandler({atError}) {
    return async (err, req, res, next) => { // eslint-disable-line no-unused-vars
      this.logs.error({error: err, session: req.session})
      let result = {error: this.errorTrnasform(err)};
      res.status(parseInt(result.error.status || 500)).json(result);
      if (atError) {
        atError(result, err, req, res, next);
      }
    };
  }

  /**
   * Конвертация ошибки для ответа
   * @param error {Error|*}
   * @returns {Object}
   */
  errorTrnasform(error) {
    if (typeof error.toJSON === 'function') {
      return error.toJSON();
    } else if (error instanceof SyntaxError) {
      return {
        id: 400.003,
        code: error.name,
        message: error.message,
        data: {},
      };
    } else if (error instanceof Error) {
      return {
        id: 500,
        code: error.name,
        message: error.message,
        data: {},
      };
    }
    return {
      id: 500.000,
      code: 'Unknown error',
      message: JSON.stringify(error),
    };
  }

  /**
   * Путь на роутера в спецификации
   * @param names Фрагменты пути
   * @returns {string}
   */
  getSpecPath(...names) {
    if (names.length === 1 && Array.isArray(names[0])) {
      names = names[0];
    }
    let result = names.map(item => {
      if (item instanceof RegExp) {
        item = item.toString();
      }
      if (typeof item === 'string') {
        item = item.replace(/\//g, '\\')
      }
      return item;
    }).join('/');
    result = '#/' + result.replace(/:([a-z0-9]+)/gi, '{$1}');
    return result;
  }

  /**
   * Клиент для тестов
   * @see https://www.npmjs.com/package/supertest
   * @param params
   * @returns {Promise<Test>}
   */
  async supertest(params) {
    if (!this._supertestInstance) {
      this._supertestInstance = require('supertest')(await this.getApp(params));
    }
    return this._supertestInstance;
  }
}

module.exports = RestAPI;
