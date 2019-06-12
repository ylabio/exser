const Services = require('./services');
/**
 * Start REST API
 */
(async () => {
  const services = new Services().configure();

  // Сервис с express сервером и настроенным роутингом
  const restApi = await services.getRestAPI();
  await restApi.start();

  console.log(`Server run on ${restApi.config.url}, swagger: ${restApi.config.url}/docs`);

})();
