const Services = require('./services');
const args = process.argv.slice(2);

(async () => {
  const services = new Services().configure('configs.js', 'configs.start.js', 'configs.local.js');
  if (args.length && args[0] === '--task') {
    // Управление задачами
    const tasks = await services.getTasks();
    await tasks.start(...args.slice(1));
  } else {
    // API сервер
    const restApi = await services.getRestApi();
    await restApi.start();
    console.log(`REST API: ${restApi.config.url}, docs: ${restApi.config.url}/docs`);
  }
})();

process.on('unhandledRejection', function (reason/*, p*/) {
  console.error(reason);
  process.exit(1);
});
