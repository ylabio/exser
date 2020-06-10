# Exser

Сервис ориентированный движок для построения backend логики web-проектов. 

Exser состоит из типовых и создаваемых под свой проект сервисов. Вся логика определяется сервисами. 
Сервис - это простейший класс с асинхронным методом `async init()`. Каждый сервис создаётся в единсвтенном
экземпляре, инициализируется при первом обращении к нему и доступен через мендежер сервисов по его
имени. К любому сервису можно обратиться из любой части кода.

## Быстрый старт

Установить пакет exser

```npm i exser --save```

В корневом index.js своего проекта импортировать exser и запустить необходимый сервис, обычно это RestAPI

```js
const Services = require('exser').Services;

(async () => {
  // Относительные пути на файлы конфигурации, которые сливаются в один объект.
  const services = new Services().configure('configs.js', 'configs.local.js');
  
  // HTTP сервер
  const restApi = await services.getRestApi();
  await restApi.start();
  console.log(`REST API: ${restApi.config.url}, docs: ${restApi.config.url}/docs`);

})();
```

## Расширения

Exser дополняется сервисами через расширение менеджера сервисов. Для этого необходимо унаследовать
класс менеджера сервисов и в нём определить асинхронные методы для доступа к новым сервисам. 

```js
// services/index.js
const {Services} = require('exser');

module.exports = class MyServices extends Services {
  /**
   * Сервис отправки писем, созданный в рамках своего проекта
   * @returns {Promise.<Mailer>}
   */
  async getMail() {
    return this.import(__dirname + '/mail');
  }
};
```

Новый сервис в проекте. Метод `init()` получает конфигурацию сервиса и экземпляр менеджера сервисов.
```js
// services/mail/index.js
const nodemailer = require('nodemailer');

class Mail {

  async init(config, services) {
    this.config = config;
    this.services = services;
    this.tranport = nodemailer.createTransport(config.transport, config.defaults);
  }
}

module.exports = Mail;
```

В итоге в index.js подключается расшиенный сервис менеджер вместо исходного exser.
В примере ниже также учитываются параметры запуска, чтобы с их учётом запускать иные сервисы.

```js
// Импорт расширенного менеджера сервисов.
const Services = require('./services');

(async () => {
  const services = new Services().configure('configs.js', 'configs.local.js');
  const args = process.argv.slice(2);
  
  if (args.length && args[0] === '--task') {
      // Управление задачами сервисом задач (запуск через CLI)
    const tasks = await services.getTasks();
    await tasks.start(...args.slice(1));
    process.exit(0);
    
  } else {
      // HTTP сервер
    const restApi = await services.getRestApi();
    await restApi.start();
    console.log(`REST API: ${restApi.config.url}, docs: ${restApi.config.url}/docs`);
    
  }
})();
```

## Заготовка под новый проект

https://github.com/ylabio/exser-skeleton


