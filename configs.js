/**
 * Конфиг всех сервисов
 * @type {Object}
 */
module.exports = {

  'rest-api': {
    protocol: 'http://',
    host: 'localhost',
    port: 8090,
    baseUrl: '/api/v1',
    routers: require('./services/rest-api/routers.js'),
    // Прокси на другой сервер
    proxy: {
      target: 'https://ylab.com',
      secure: false,
    },
    log: true,
    securityAuthorized: [{token: []}], // Способ авторизация в сваггере по умолчанию, если определено условие доступа
    validateResponse: false,
    // Кроссдоменные запросы
    cors: {
      /**
       * С каких хостов допустимы запросы
       * - false для отключения CORS
       * - ['http://localhost:8000', /\.ysa\.com$/]
       * - '*' - все хосты
       */
      origin: [
        'http://localhost:8091',
      ],
      /**
       * Допустмые методы от кросдоменна
       */
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      /**
       *  Для PUT, DELETE запросов и других с нестандартными заголовками ил их значениями
       *  Сервер будет сперва получать OPTION запрос
       */
      preflightContinue: true,
      /**
       * Разрешенные заголовки от клиента. У клиента должен быть Access-Control-Request-Headers
       */
      allowedHeaders: ['X-Token', 'Content-Type', 'Content-Range', 'Content-Disposition', 'X-Requested-With'],
      /**
       * Доступные заголовки для клиента
       */
      exposedHeaders: ['X-Token', 'Content-Type'],
      /**
       * Чтобы работали кросдоменные куки. У клиента должен быть withCredentials:true
       */
      credentials: true,
      /**
       * Сколько секунд браузер может кэшировать OPTION запросы при preflightContinue:true
       */
      maxAge: 100,
      /**
       * Код для OPTIONS запросов
       */
      optionsSuccessStatus: 204,
    },
  },

  storage: {
    db: {
      url: 'mongodb://localhost:27017',
      name: 'exser',
    },
    models: require('./services/storage/models.js'),
  },

  spec: {
    default: {
      servers: [
        {url: '/api/v1', description: 'API server'},
      ],
      components: {
        parameters: require('./services/spec/components/parameters'),
        responses: require('./services/spec/components/responses'),
        schemas: require('./services/spec/components/schemas'),
        securitySchemes: {
          token: {type: 'apiKey', in: 'header', name: 'X-Token'},
        },
      },
      tags: [
        {name: 'Authorize', description: 'Авторизация'},
        {name: 'Tests', description: 'Тестовая модель'},
      ],
      externalDocs: {
        description: 'source.json',
        url: '/api/v1/docs/source.json',
      },
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
};
