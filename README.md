# Exser

Легкий фреймворк для Node.js приложений.

Логика приложения определяется композицией сервисов. Сервис — это простейший javascript класс с любым набором 
методов для реализации логики приложения.

Связующим звеном между сервисами является менеджер сервисов. Менеджер сервисов - это объект
с набором методов для доступа к любому сервису приложения. Методы менеджера возвращают
экземпляр конкретного сервиса. 

Каждый сервис создаётся в единственном экземпляре при первом обращении 
к нему. Если у сервиса реализован асинхронный метод `async init()`, то он будет вызван при первом 
обращении к сервису. Метод `init()` позволит выполнить асинхронную логику перед использованием сервиса,
в этот метод передаются параметры конфигурации сервиса и менеджер сервисов. 

Через менеджер сервисов можно обратиться к любому другому сервису не задумываясь о его инициализации. 
Разработав новый сервис, необходимо прописать типовой метод доступа к нему в менеджере сервисов.

При старте приложения осуществляется инициализация менеджера сервисов, передача ему всех конфигураций
про все сервисы. Далее выполняется обращение к конкретному сервису и вызов его методов. 
Первый вызванный сервис оказывается входной точкой логики приложения. 
Например, запускается сервер REST API.

Универсальная логика старта приложения - это запустить сервис по параметрам CLI, в этих параметрах и 
название вызываемого сервиса. По сути можно запустить любой сервис. Для универсального старта 
сервисов используется метод `async start()`. Если этот метод есть в сервисе, значит сервис можно 
запустить из командной строки ничего дополнительно не настраивая.

Главный файл приложения:

*index.js*
```js
const Services = require('./services'); // Менеджер сервисов
const {parseCommands} = require('./utils/array-utils'); // Парсер парамтров CLI

(async () => {
  // 1. Создаём менеджер сервисов
  const services = new Services();
  // 2. Иницализируем менеджер с передачей массива конфигурации 
  //    Вместо параметров можно указать строку - путь на файл с конфигурацией 
  //    Конфигурация - это параметры для каждого сервиса, сгруппированные по названиям
  await services.init(['configs.js', 'configs.local.js', {'rest-api': {exampleOption: true}}]);
  // 3. Запуск сервиса по параметрам CLI
  await services.start(parseCommands(process.argv.slice(2)));
})();
```

Для разбора параметров командой строки используется парсер без декларирования схемы параметров. 
Например:

```
> node index.js name --log mode=super list[]=10,20 second --log=false
```

- `name` - название первого сервиса и его параметры `{log: true, mode: 'super', list: [10,20]}`.
- `second` - название второго запускаемого сервиса и его параметр `{log: false}`

Вместо запуска по параметрам CLI, можно явно вызвать желаемый сервис

```js
(async () => {
  //...
  // 3. Явный запуск сервиса rest-api
  const restApi = await services.getRestAPI();
  await restApi.start();
})();
```

## Сервисы в exser

В exser реализованы часто используемые сервисы для типового REST API приложения.

### storage

`const storage = await services.getStorage()`

Хранилище данных в MongoDB. Позволяет задекларировать схемы моделей по спецификации JSONScheme, 
валидировать, сохранять, выбирать, удалять объекты из mongodb. 
Реализует отношения между объектами, мультиязычные свойства, упорядочивание, древовидные структуры, 
подтягивание свойств связанных объектов и другое.

Каждая модель описывается отдельным javascript классом, по сути тоже сервисом, разве что доступ к 
ним осуществляется через storage. Подключение классов моделей осуществляется в параметре models 
сервиса storage. Для удобства файлы моделей можно вынести в отдельную папку `/models` и подключать её. 

```js
const users = storage.get('user'); // указывается название (тип) модели
const list = await users.getList({filetr: {name: 'admin'}});
```

### rest-api

`const restApi = await services.getRestAPI()`

HTTP сервер с описанием роутеров под REST API. Используется библиотека express, сервис 
декорирует её. При объявлении роутеров в методах get, post, put, patch, delete введен дополнительный 
параметр для описания спецификации роутера в OpenAPI 3.0. Автоматически собирается докуменатция
в swagger, она становится доступной по адресу /api/v1/docs.

Реализована спецификация **[Query REST](http://query.rest)**, с 
возможностью указывать, какие поля объекта выбирать или не выбирать, подтягивать свойства связанных 
объектов в рамках одного запроса, гибко указывать параметры фильтра, сортировки и другое.

Сервисом rest-api стандартизируется формат ответа и обработка ошибок, реализуется первичный контроль доступа.

Роутеры описываюся отдельными файлами в функции для замыкания в ней менеджера сервисов. 
Обработка запроса - это вызов методов какого-либо сервиса. 

```js
module.exports = async (router, services) => {

  const spec = await services.getSpec();
  const storage = await services.getStorage();
  const users = storage.get('user');

  /**
   * Создание/регистрация
   */
  router.post('/users', {
    // OpenAPI 3.0 сецификация роута
    operationId: 'users.create',
    summary: 'Регистрация (создание)',
    description: 'Создание нового пользователя (регистарция).',
    tags: ['Users'],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/user.create'
          }
        }
      }
    },
    parameters: [],
    responses: {
      201: spec.generate('success', {$ref: '#/components/schemas/user.view'}),
      400: spec.generate('error', 'Bad Request', 400)
    }
  }, async (req, res) => {
    return await users.createOne({
      body: req.body,
      session: req.session
    });
  });
  
  // ..остальные роуты про user
};

```

Файлы с описанием роутеров подключаются к сервису rest-api через конфигурацию в параметре `routers`.
Роутеры можно кастомизировать не затрагивая класс самого сервиса. 

### spec

`const spec = await services.getSpec()`

Сервис для описания спецификаций и валидации данных по ним. Спецификация — это схема в формате JSONScheme. 
Сервис группирует все объявленные схемы в единую структуру. Предоставляет утилиты, готовые фрагменты
схем для упрощения описания целевой схемы. Используется в описании моделей сервиса storage, а 
также в роутера сервиcа rest-api и генерации спецификации openapi 3.0.

Расширение сервиса - это добавление своих утилит, заготовок. Все они прописываются в параметрах
конфигурации сервиса.

### sessions

`const sessions = await services.getSessions()`

Сервис для работы с сессией. Одно приложение может одновременно обрабатывать запросы от 
разных клиентов. Сервис сессий используется для создания объекта состояния сессии. В состояние 
обычно попадает объект текущего авторизованного пользователя, параметры локали и 
любые другие данные, специфичные для приложения. Состояние сессии обычно создаётся в обработчике 
всех http запросов и присваивается к объекту запроса. Объект состояния сессии передаётся практически
во все методы сервисов. 

### tasks

`const restApi = await services.getTasks()`

Сервис для периодического запуска сервисов. В конфигурации описывается задача - название сервиса,
сколько раз запускать или с какой периодичностью. Используется для выполнения плановых задач,
например синхронизации с внешними службами каждые 5 минут. При старте сервиса tasks указывается название
выполняемой задачи.

`> node index.js tasks --name=example`

В конфигурации

```
  tasks: {
    example: {
      service: 'example', // сервис
      interval: 500, // интервал ms
      iterations: 3, // кол-во
      someOption: 'xxx', // переопределение параметра для сервиса example
      log: true
    },
  },
```


### dump

`const restApi = await services.getDump()`

Сервис экспорта данных из storage в файлы и обратно. В дамп не попадают суррогатные ключи (_id),
чтобы восстановление происходило по постоянным ключам. При повторном экспорте данных в файл, сущесвующий
файл будет перемещен во временную папку операционной системы. При особых случаях можно обратится к 
прошлым дампам. Дамп создают и обрабатываются в потоковом режиме. Формат файла: одна строка - один объект в JSON. 

*Экспорт в файл*

`> node index.js dump --export[]=user,role`

*Импорт в storage*

`> node index.js dump --import[]=user,role`

Какие модели экспортировать или импортировать по умолчанию можно указать в конфигурации сервиса. 

### logs

`const restApi = await services.getLogs()`

Сервис логирования с учётом сессии. Альтернатива классическому console.log(). Отличительная осбенность -
вывод лога одной строкой и группировка логово по сессии. Удобен при сборе логов консоли в графану.

## Кастомизация сервисов

Фреймворк exser используется через наследование его менеджера сервисов и при необходимости его
встроенных сервисов. Для этого в проекте объявляется свой класс менеджера сервисов наследованием 
менеджера exser. Именно его нужно создавать и через него запускать сервисы приложения, в нем объявлять
методы доступа к своим сервисам или переопределять методы доступа к встроенным сервисам. 

Например, для расширения сервиса rest-api с целью подключение дополнительных middleware к express,
необходимо объявить свой класс RestAPI наследованием из exser, его прописать в методе getRestAPI в 
менеджере сервисов. В классе RestAPI переопределить метод start.

```js
const exserRestApi = require('exser/services/rest-api');

class RestAPI extends exserRestApi{

  async start(params = {atFirst: null, atEnd: null, atError: null, atRequest: null, atResponse: null}) {
    return super.start({
      atFirst: async app => {
        // здесь можно подклчить middleware к app перед всеми другими middleware
      },
      atEnd: async app => {
        // здесь можно подклчить middleware к app после всех других middleware
      },
    })
  }
}

module.exports = RestAPI;

```

## Каркас под новый проект

https://github.com/ylabio/exser-skeleton


