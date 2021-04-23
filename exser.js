module.exports = {
  utils: require('./utils'),
  // Класс сервиса
  Service: require('./services/service/index.js'),
  // Менеджер сервисов
  services: require('./services'),
  Services: require('./services'),
  configs: require('./configs.js'),
  // Класс модели
  Model: require('./services/storage/model/index.js'),
  ObjectID: require('mongodb').ObjectID,
  ObjectId: require('mongodb').ObjectID
};
