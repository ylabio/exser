const cors = require('cors');
const express = require('express');
const expressRouter = require('express').Router;
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const errors = require('../../utils').errors;
const xmlparser = require('express-xml-bodyparser');
const httpProxy = require('http-proxy');

class RestAPI {

  async init(config, services) {
    this.config = config;
    this.config.url = `${this.config.protocol}${this.config.host}${this.config.port ? ':' + this.config.port : ''}${this.config.baseUrl}`;
    this.services = services;
    this.spec = await this.services.getSpec();
    this.app = null;
    return this;
  }

  async start(params = {atFirst: null, atEnd: null, atError: null, atRequest: null, atResponse: null}) {
    const app = await this.getApp(params);
    await new Promise((resolve) => {
      app.listen(this.config.port, this.config.host, function () {
        resolve();
      });
    });
    return app;
  }

  async getApp(params = {atFirst: null, atEnd: null, atError: null, atRequest: null, atResponse: null}) {
    if (this.app) {
      return this.app;
    }
    this.app = express();
    if (params.atFirst) {
      await params.atFirst(this.app);
    }
    //app.use(morgan('combined'));
    this.app.use(cookieParser());
    this.app.use(bodyParser.json());
    this.app.use(xmlparser());
    this.app.use(bodyParser.urlencoded({extended: true}));
    this.app.use(express.static('public'));
    this.app.use(this.config.baseUrl, await this.getRouter({
      atRequest: params.atRequest,
      atResponse: params.atResponse,
    }));
    if (params.atEnd) {
      await params.atEnd(this.app);
    }
    this.app.use(this.getErrorHandler({atError: params.atError}));

    this.proxyResponse = (proxyRes, req, res) => {
      return new Promise((resolve, reject) => {
        const contentType = proxyRes.headers['content-type'] && proxyRes.headers['content-type'].match(/^[^;]+/)[0];
        if (contentType) {
          const chunks = [];
          proxyRes.on('error', (e) => reject(e));
          proxyRes.on('data', (chunk) => chunks.push(chunk));
          proxyRes.on('end', () => {
            let body = Buffer.concat(chunks).toString();
            res.end(body);
            try {
              if (contentType === 'application/json') {
                body = JSON.parse(body);
              }
            } catch (e) {
            }
            resolve(body);
          });
        } else {
          proxyRes.pipe(res);
          resolve();
        }
      });
    };

    this.proxy = httpProxy.createProxyServer({});
    this.proxy.on('proxyRes', (proxyRes, req, res) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      this.proxyResponse(proxyRes, req, res).then((body) => {
        if (this.config.validateResponse) {
          this.validateResponse({
            req,
            status: proxyRes.statusCode,
            headers: proxyRes.headers,
            body,
            schema: req.def,
          });
        }
      });
    });
    return this.app;
  }

  /**
   * Роутер express
   * @returns {Promise.<*>}
   */
  async getRouter({atRequest, atResponse}) {
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
          if (def.session && def.session.properties && def.session.properties.user && def.session.properties.user.summary) {
            def.description = `${def.description || ''} \n\n --- \n\n ${def.session.properties.user.summary}`;
          }
          if (def.session && def.session.needSecurirty && !def.security) {
            def.security = this.config.securityAuthorized;
          }
          this.spec.paths(method, path, def);
        }
        router.origin[method](path, this.callbackWrapper(fun, def, atRequest, atResponse));
      };
    }
    // router.origin.use = router.use.bind(router);
    // router.use = (...params) => {
    //   params = params.map(param => typeof param === 'function'
    //   ? this.callbackWrapper(param) : param);
    //   router.origin.use(...params);
    // };

    // Поддержка кроссдоменных запросов
    router.use(cors(this.config.cors));

    // Подключение всех контроллеров к роутеру
    const routersKeys = Object.keys(this.config.routers);
    for (const key of routersKeys) {
      await
        this.config.routers[key](router, this.services);
    }

    return router;
  }

  callbackWrapper(callback, def, atRequest, atResponse) {
    return async (req, res, next) => {

      if (atRequest) {
        await atRequest(req, res, next);
      }

      req.def = def;
      // if (def.security) {
      //   if (!req.session.user) {
      //     next(new errors.Forbidden({}, 'Access forbidden for guest'));
      //   }
      // } else
      if (def.session) {
        try {
          await this.validateSession({
            req,
            session: req.session,
            schema: def,
          });
        } catch (e) {
          //console.log(JSON.stringify(e.data));
          if (e instanceof errors.Validation) {
            next(new errors.Forbidden(e.data));
          } else {
            next(e);
          }
          return;
        }
      }

      if (def.proxy) {
        this.proxy.web(req, res, Object.assign({}, this.config.proxy, {
          target: this.config.proxy.target + req.baseUrl,
          selfHandleResponse: true,
        }));
      } else {
        try {
          res.statusCode = 0; // Для возможности опредлить статус в контроллере
          let result = await callback(req, res, next);

          if (typeof result !== 'undefined') {
            if (!res.statusCode) {
              res.status(200);
            }

            if (result.response) {
              result = result.response;
            } else if (Array.isArray(result)) {
              result = {result: {items: result}};
            } else {
              result = {result};
            }

            if (atResponse) {
              atResponse(result, req, res, next);
            }

            res.json(result);
            if (this.config.validateResponse) {
              this.validateResponse({
                req,
                status: res.statusCode,
                headers: res.getHeaders(),
                body: result,
                schema: def,
              });
            }
          }
        } catch (e) {
          next(e);
        }
      }
    };
  }

  /**
   * Валидация ответа по схеме свагера
   * И логирование ошибок
   * @param req
   * @param status
   * @param headers
   * @param body
   * @param schema
   * @returns {Promise<void>}
   */
  async validateResponse({req, status, headers, body, schema}) {
    if (schema && schema.responses) {
      if (schema.responses[status]) {
        const defResponse = schema.responses[status];
        if (defResponse.headers) {
          console.log('Validate response headers');
        }
        const contentType = headers['content-type'] && headers['content-type'].match(/^[^;]+/)[0];
        if (defResponse.content) {
          if (defResponse.content[contentType]) {
            //console.log('Validate response body');
            // $ref на схему для body в общем объекте спецификации
            const name = this.spec.makeRef([
              'paths',
              req.route.path,
              req.method.toLowerCase(),
              'responses',
              status,
              'content',
              contentType,
              'schema',
            ]);
            this.spec.validate(name, body).catch(e => {
              console.log('Not valid response body', req.method, req.route.path);
            });
          } else {
            console.log(`Unsupported response content-type "${contentType}"`, req.method, req.route.path);
          }
        } else {
          console.log('Not described response body:', status, req.method, req.route.path);
        }
      } else {
        console.log('Not described response status:', status, req.method, req.route.path);
      }
    } else {
      console.log('Not described response', req.method, req.route.path);
    }
  }

  async validateRequest(params, query, headers, body, schema) {

  }

  /**
   * Валидация ответа по схеме свагера
   * И логирование ошибок
   * @param req
   * @param session
   * @param schema
   * @returns {Promise<void>}
   */
  async validateSession({req, session, schema}) {
    if (schema && schema.session) {
      // $ref на схему для body в общем объекте спецификации
      const name = this.spec.makeRef([
        'paths',
        req.route.path,
        req.method.toLowerCase(),
        'session',
        //'schema'
      ]);
      return this.spec.validate(name, session, {}, 'session');
    }
  }

  getErrorResponse(e) {
    if (e instanceof errors.Custom) {
      return e.toObject();
    } else if (e instanceof SyntaxError) {
      return {
        id: 400.003,
        code: e.name,
        message: e.message,
        data: {},
      };
    } else if (e instanceof Error) {
      return {
        id: 500,
        code: e.name,
        message: e.message,
        data: {},
      };
    }
    return {
      id: 500.000,
      code: 'Unknown error',
      message: JSON.stringify(e),
    };
  }

  /**
   * Обработка всех ошибок для express
   * @returns {function(*=, *, *, *)}
   */
  getErrorHandler({atError}) {
    return async (err, req, res, next) => { // eslint-disable-line no-unused-vars
      if (this.config.log) {
        console.log(err instanceof errors.Validation ? JSON.stringify(err) : err);
      }
      let result = {error: this.getErrorResponse(err)};

      if (atError) {
        atError(result, err, req, res, next);
      }

      res.status(parseInt(result.error.id || 500)).json(result);
      if (this.config.validateResponse) {
        this.validateResponse({
          req,
          status: res.statusCode,
          headers: res.getHeaders(),
          body: result,
          schema: req.def,
        });
      }
    };
  }

  /**
   * Клиент для тестов
   * @see https://www.npmjs.com/package/supertest
   * @param params
   * @returns {Promise<Test>}
   */
  async superTest(params) {
    if (!this._superTest) {
      this._superTest = require('supertest')(await this.getApp(params));
    }
    return this._superTest;
  }
}

module.exports = RestAPI;
