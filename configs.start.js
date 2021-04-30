/**
 * Конфиг для запуска контексте exser (не экспортируется вместе с пакетом)
 * @type {Object}
 */
module.exports = {

  'rest-api': {
    routers: require('./services/rest-api/routers.start.js')
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
