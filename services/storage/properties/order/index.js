const mc = require('merge-change');
const Property = require('./../property');

class OrderProperty extends Property{

  constructor({value = 'max', session, services, options}) {
    super({
      value,
      session,
      services,
      options: mc.patch({
        /**
         * Названия свойств для формирования условия на множество объектов среди которых выполнять упорядочивание.
         * Или функция, возвращающая условие поиска (filter) в формате mongodb
         */
        scope: []
      }, options)
    });
  }

  set(value){
    this.value = value;
    this.needBeforeSave = true;
    this.needAfterSave = true;
  }

  getScope({object}){
    return {};
  }

  isNewScope({object, objectPrev}){
    return false;
  }

  /**
   * Подготовка свойства перед сохранением объекта
   * Вычисление реального порядкового значения, если указаны спец коды.
   * @param object Объект с новыми свойствами
   * @param objectPrev Старый объект
   * @param path Путь на свойство
   * @param prev Предыдущее значение
   * @param model Storage модель
   * @returns {Promise<void>}
   */
  async beforeSave({object, objectPrev, path, prev, model}){
    if (this.needBeforeSave) {
      const prop = path.replace('/', '.');
      // Если значение ещё не вычислено
      if (typeof this.value !== 'number') {
        if (typeof prev === 'undefined' || this.isNewScope({object, objectPrev})) {
          if (this.value === '--') this.value = 'min';
          if (this.value === '++') this.value = 'max';
        }
        if (this.value === '++') {
          this.value = prev + 1;
        } else if (this.value === '--') {
          this.value = prev - 1;
        } else {
          // Поиск минимального или максимального order
          const sort = this.value === 'min' ? {[prop]: +1} : {[prop]: -1};
          const orderFilter = this.getScope({object});
          const maxOrder = await model.native.find(orderFilter).sort(sort).limit(1).toArray();
          if (this.value === 'min') {
            this.value = maxOrder.length ? mc.utils.get(maxOrder[0], path, '/') - 1 : 1;
          } else {
            this.value = maxOrder.length ? mc.utils.get(maxOrder[0], path, '/') + 1 : 1;
          }
        }
      } else {
        this.value = parseInt(this.value);
      }
    }
    this.needBeforeSave = false;
  }

  /**
   * Сдвиги порядкового значения у других объектов
   * @param object Объект с новыми свойствами
   * @param objectPrev Старый объект
   * @param path Путь на свойство
   * @param prev Предыдущее значение
   * @param model Storage модель
   * @returns {Promise<void>}
   */
  async afterSave({object, objectPrev, path, prev, model}){
    if (this.needAfterSave) {
      const prop = path.replace('/', '.');
      // Сдвинуть порядок в других записях
      let filter = this.getScope({object});
      filter._id = {$ne: object._id};
      // Смещение если установленное значение было кем-то занято
      filter[prop] =  this.value
      const exists = await model.native.findOne(filter);
      if (exists) {
        delete filter[prop];
        if (typeof prev === 'undefined' || this.isNewScope({object, objectPrev})) {
          if (this.value > 0) {
            // Сдвиг на +1 всех записей, у которых path больше или равен this.value c исключением текущей записи
            filter[prop] = {$gte: this.value};
            await model.native.updateMany(filter, {$inc: {[prop]: +1}});
          } else {
            // Сдвиг на -1 всех записей, у которых path меньше или равен this.value c исключением текущей записи
            filter[prop] = {$lte: this.value};
            await model.native.updateMany(filter, {$inc: {[prop]: -1}});
          }
        } else {
          if (this.value > prev) {
            // сдвиг вверх, чтобы освободить order снизу
            filter[prop] = {$gt: prev, $lte: this.value};
            await model.native.updateMany(filter, {$inc: {[prop]: -1}});
          } else if (this.value < prev) {
            // сдвиг вниз, чтобы освободить order сверху
            filter[prop] = {$gte: this.value, $lt: prev}
            await this.native.updateMany(filter, {$inc: {[prop]: 1}});
          }
        }
      }
    }
    this.needAfterSave = false;
  }
}

module.exports = OrderProperty
