/**
 * Конфиг всех сервисов
 * @type {Object}
 */
module.exports = {

  'rest-api': {
    routers: require('./services/rest-api/routers.start.js'),
    // Прокси на другой сервер
  },
  storage: {
    models: {
      test: require('./services/storage/test'),
    },
  },

  spec: {
    default: {
      $concat: {
        tags: [
          {name: 'Tests', description: 'Тестовая модель'},
        ],
      },
    },
  },

};
