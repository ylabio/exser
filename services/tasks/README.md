# Сервис задач

Управляет запуском любого сервиса с указанной периодичностью.

Настройки запусков в общем файле конфигурации или передаются в параметрах.

```js
//config.js
module.exports = {
  
  tasks: {
    // настройка задачи
    example: {
      service: 'example', // название сервиса
      interval: null, // периодичность зарпуска в ms или один раз
      iterations: 1, // количество запусков или бесконечно если задан интервал
      someOption: 'xxx',
      log: false
    }
  }
}
```

```cmd
node task.js example interval=1000 iterations=50 someOption=xxx
```
