const fs = require('fs');
const path = require('path');
const mc = require('merge-change');
const os = require('os');
const readline = require('readline');
const Service = require("../service");

/**
 * Сервис экспорта данных в файлы дампа и импорта из этих файлов
 * Используется для экспорта данных, например справочников, чтобы их восстанавливать при инициализации приложения
 * Формат файла дампа - строки json объектов для потоковой обработки.
 */
class Dump extends Service {

  async init(config, services) {
    await super.init(config, services);
    this.storage = await this.services.getStorage();
    return this;
  }

  async start(params = {}) {
    let mode = params['export'] ? 'export' : (params['import'] ? 'import' : undefined);
    if (mode){
      let models = params[mode] === true ? this.config[mode] : params[mode];
      if (typeof models === 'string'){
        models = [models];
      }
      if (!models || models.length === 0){
        console.log(`Model names not specified. Example > node index.js dump --${mode}[]=users,roles`)
      } else {
        let clear = mode === 'import' && params.clear === true;
        let modeParams = mc.merge(this.config, params);
        console.log(`Dump ${mode} for "${models.join('", "')}"`, clear ? 'with collection cleanup!': '');
        for (const model of models){
          modeParams.model = model;
          await this[mode](modeParams);
        }
        console.log(`Dump ${mode} completed`);
      }
    } else {
      console.log(`Dump mode not specified. Example > node index.js dump --export`)
    }
  }

  /**
   * Экспорт объектов указанной модели в файл
   * @param model {String} Название модели
   * @param filter {Object} Фильтр, какие объекты экспортировать
   * @param removeFields {Object} Какие поля удалить рекурсивно. По умолчанию удаляются _id
   * @param dir {String} Директория, куда сохранить файл экспорта. Должна существовать.
   * @returns {Promise<void>}
   */
  async export({
                 model,
                 filter = {_deleted: false},
                 removeFields = {defaults: ['_id']},
                 dir = './service/dump/data/'
               }) {
    const file = `${dir}${model}.txt`;
    await this.backup(file);
    let writeStream = fs.createWriteStream(file);
    const modelStore = this.storage.get(model);
    const cursor = modelStore.native.find(filter);
    let removeFieldsModel = removeFields[model] ? removeFields[model] : removeFields.defaults || [];
    for await (let item of cursor) {
      if (removeFieldsModel) {
        item = this.removeFields(item, removeFieldsModel);
      }
      writeStream.write(JSON.stringify(item) + '\n', 'utf8');
    }
    writeStream.end();
  }

  /**
   * Импорт данных из файлов в storage
   * Каждая линия в файла - JSON объект
   * @param model {String} Название импортируемой модели
   * @param uniqueFields {Object} Уникальные поля
   * @param clear {Boolean} Удалять все записи в коллекции перед импортом?
   * @param dir {String} Путь на директорию с файлом импорт. Имя файла должно соотв. названию модели с расширением txt
   * @returns {Promise<unknown>}
   */
  async import({
                 model,
                 uniqueFields = {defaults: ['code']},
                 clear = false,
                 dir = './service/dump/data/'
               }) {
    const file = `${dir}${model}.txt`;
    this.log(`# Import ${model} from ${file}`, true);
    const modelStore = this.storage.get(model);
    if (!Array.isArray(uniqueFields)) {
      uniqueFields = [uniqueFields];
    }
    let stat = {
      success: 0,
      error: 0,
      errorLines: []
    };
    if (clear){
      // Удалить все записи
      await modelStore.native.deleteMany({});
    }
    let uniqueFieldsModel = uniqueFields[model] ? uniqueFields[model] : uniqueFields.defaults || [];
    const update = async (body) => {
      let filter = {};
      for (const key of uniqueFieldsModel) {
        filter[key] = body[key];
      }
      await modelStore.upsertOne({filter, body});
    };
    return new Promise((resolve, reject) => {
      const input = fs.createReadStream(file);
      input.on('error', (e) => {
        this.log(`- error: ${e}`, true);
        resolve();
      });
      const stream = readline.createInterface({input});
      let cnt = 0;
      let cntLine = 0;
      stream.on('line', async (line) => {
        cntLine++;
        // Поток сразу читает много строк и потом их итерирует.
        // Из-за асинхронной обработки поток нужно ставить на паузу пока не обработается текущая порция линий (иначе завалим mongodb)
        // Технически будут запущены обработчики всех полученных линий без последовательного ожидания их завершения
        // Нужно вызвать паузу при запуске первого обработчика. И возобновить поток после завершения последнего обработчика
        if (0 === cnt++) stream.pause();
        try {
          await update(JSON.parse(line));
          stat.success++;
        } catch (e) {
          stat.error++;
          stat.errorLines.push(cntLine);
        }
        if (--cnt === 0) {
          stream.resume();
          this.log(`- success: ${stat.success} errors: ${stat.error} [${stat.errorLines.join(', ')}]`);
        }
      });
      stream.on('error', (e) => {
        this.log(`- error: ${e}`, true);
        resolve();
      });
      stream.on('close', () => {
        this.log(`- success: ${stat.success} errors: ${stat.error} [${stat.errorLines.join(', ')}]`, true);
        resolve();
      });
    });
  }

  /**
   * Рекурсивное удаление полей из объекта
   * @param value
   * @param fields {Set|Array}
   * @returns {{}|*}
   */
  removeFields(value, fields) {
    if (!(fields instanceof Set)){
      fields = new Set(fields)
    }
    const type = mc.utils.type(value);
    if (type === 'Array') {
      return value.map(item => this.removeFields(item, fields));
    } else if (type === 'Object') {
      let result = {};
      for (const [key, item] of Object.entries(value)) {
        if (!fields.has(key)) {
          result[key] = this.removeFields(item, fields);
        }
      }
      return result;
    } else {
      return value;
    }
  }

  /**
   * Копирование файла в /temp если он есть с добавлением к имени текущей даты
   * @param filePath
   * @returns {Promise<unknown>}
   */
  async backup(filePath) {
    let pathParts = filePath.split('.');
    // Расширение
    const ext = pathParts.pop();
    const pathWithoutExt = pathParts.join('.');
    pathParts = pathWithoutExt.split('/');
    // Имя файла без пути и без расширения
    const name = pathParts.pop();
    // Полный путь в временной папке
    const newPath = path.resolve(`${fs.realpathSync(os.tmpdir())}/${name}_${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`);
    // Копирование фала
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(filePath);
      const writeStream = fs.createWriteStream(newPath);
      readStream.on('error', err => resolve(err));
      writeStream.on('error', err => resolve(err));
      writeStream.on('close', function () {
        resolve();
      });
      readStream.pipe(writeStream);
    });
  }

  log(data, end = false) {
    if (typeof data === 'object') {
      data = JSON.stringify(data, null, 2);
    }
    if (process.stdout.clearLine) {
      process.stdout.clearLine();
    } else {
      process.stdout.write('\r');
    }  // clear current text
    if (process.stdout.cursorTo) {
      process.stdout.cursorTo(0);
    }  // move cursor to beginning of line
    process.stdout.write(data);
    if (end) {
      process.stdout.write('\r\n');
    }
  }
}

module.exports = Dump;
