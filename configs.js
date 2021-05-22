/**
 * Основной конфиг всех сервисов
 * @type {Object}
 */
module.exports = {

  'rest-api': {
    protocol: 'http://',
    host: 'localhost',
    port: 8090,
    path: '/api/v1',
    routers: require('./services/rest-api/routers.js'),
    // Кроссдоменные запросы
    cors: {
      active: true,
      // С каких хостов допустимы запросы
      // - ['http://localhost:8000', /\.ysa\.com$/]
      // - '*' - все хосты
      origin: [
        'http://localhost:8091',
      ],
      // Допустимые методы от кросдомена
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      //  Для PUT, DELETE запросов и других с нестандартными заголовками ил их значениями
      //  Сервер будет сперва получать OPTION запрос
      preflightContinue: true,
      // Разрешенные заголовки от клиента. У клиента должен быть Access-Control-Request-Headers
      allowedHeaders: ['X-Token', 'Content-Type', 'Content-Range', 'Content-Disposition', 'X-Requested-With'],
      // Доступные заголовки для клиента
      exposedHeaders: ['X-Token', 'Content-Type'],
      // Чтобы работали кроссдоменные куки. У клиента должен быть withCredentials:true
      credentials: true,
      // Сколько секунд браузер может кэшировать OPTION запросы при preflightContinue:true
      maxAge: 100,
      // Код для OPTIONS запросов
      optionsSuccessStatus: 204,
    },
    log: true,
    defaultSecurity: [{token: []}], // Способ авторизация в swagger по умолчанию, если определено условие доступа
  },

  storage: {
    db: {
      //url: 'mongodb://user:passw@localhost:27017', // Может быть строкой
      url: {
        host: 'localhost',
        port: '27017',
        user: '',
        password: '',
      },
      name: 'exser',
    },
    models: {},
    properties: require('./services/storage/properties'),
  },

  logs: {
    unsetFields: [
      'password'
    ],
    all: true,
    process: true,
    step: true,
    error: false,
  },

  dump: {
    models: [],
    filter: {_deleted: false},
    uniqueFields: {
      defaults: ['code'],
    },
    removeFields: {
      defaults: ['_id'],
    },
    clear: false,
    dir: './services/dump/data/'
  },

  spec: {
    default: {
      // servers: [
      //   {url: '/api/v1', description: 'API server'},
      // ],
      components: {
        parameters: require('./services/spec/components/parameters'),
        responses: require('./services/spec/components/responses'),
        schemas: require('./services/spec/components/schemas'),
        securitySchemes: {
          token: {type: 'apiKey', in: 'header', name: 'X-Token'},
        },
      },
      tags: [
        //{name: 'Authorize', description: 'Авторизация'},
      ],
      // externalDocs: {
      //   description: 'source.json',
      //   url: '/api/v1/docs/source.json',
      // },
    },
    keywords: require('./services/spec/keywords')
  },

  example: {
    xxx: 0,
  },

  tasks: {
    example: {
      service: 'example',
      interval: 500, // ms
      iterations: 3,
      someOption: 'xxx',
      log: true,
    },
  },

  access: {
    acl: [
      {
        key: 1,
        session: {'user.role.name': 'admin'},
        actions: {
          '*': true,
          '*.*': true,
          '*.*.*': true
        }
      },
      {
        key: 2,
        session: {},// Любая сессия
        actions: {
          'test.create': true,
          'test.update': false,
          //'test.find.*': false,
          'test.find.*': {},
          'test.delete': false,
        }
      },
      // {
      //   key: 3,
      //   session: {'session.user._deleted': false},// Авторизован
      //   actions: {
      //     'tests.create': true,
      //     'tests.update': true,
      //     'tests.find.*': true,
      //     'tests.delete': false,
      //   }
      // }
    ],
  }
};
