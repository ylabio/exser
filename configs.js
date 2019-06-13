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
      secure: false
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
      optionsSuccessStatus: 204
    },
  },

  storage: {
    db: {
      url: 'mongodb://localhost:27017',
      name: 'exser'
    },
    models: require('./services/storage/models.js')
  },

  spec: {
    default: {
      openapi: '3.0.0',
      info: {
        title: 'Exser',
        description: 'Exser REST API',
        termsOfService: '',//url
        // contact: {
        // name: 'API Support',
        // url: 'http://www.example.com/support',
        // email: 'support@example.com'
        // },
        // license:{
        // name: 'Apache 2.0',
        // url: 'http://www.apache.org/licenses/LICENSE-2.0.html'
        // },
        version: '1.0.0',
      },
      servers: [
        {
          url: '/api/v1',
          description: 'API server',
          // variables: {
          //   version: {
          //     enum: [
          //       'v1',
          //       'v2'
          //     ],
          //     default: 'v1'
          //   },
          // }
        }
      ],
      paths: {},
      components: {
        schemas: {},
        responses: {},
        parameters: {},
        examples: {},
        requestBodies: {},
        headers: {},
        securitySchemes: {
          token: {
            type: 'apiKey',
            in: 'header',
            name: 'X-Token'
          },
        },
        links: {},
        callbacks: {}
      },
      security: [
        //{token: []}, //global
      ],
      tags: [
        {name: 'Authorize', description: 'Авторизация'},
      ],
      // externalDocs: {
      //   description: 'Исходник для импорта в postman',
      //   url: '/api/v1/docs/source.json'
      // },
    }
  },

  example: {
    xxx: 0
  },

  tasks: {
    example: {
      service: 'example',
      interval: 500, // ms
      iterations: 3,
      someOption: 'xxx',
      log: true
    }
  },
};
