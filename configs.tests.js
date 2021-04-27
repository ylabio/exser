/**
 * Конфиг для тестирования
 * @type {Object}
 */
module.exports = {
  mode: 'test',
  server: {
    host: 'localhost',
    port: 8010
  },
  storage: {
    db: {
      url: 'mongodb://localhost:27017',
      name: 'exser-test'
    },
  },
  mail: {
  //   transport: {
  //     host: 'smtp.yandex.com',
  //     port: 465,
  //     secure: true, // use SSL
  //     auth: {
  //       user: '',
  //       pass: ''
  //     }
  //   },
  //   defaults: {
  //     from: 'YSA <boolive@yandex.ru>',
  //     replyTo: 'boolive@yandex.ru'
  //   }
    active: false
  }
};
