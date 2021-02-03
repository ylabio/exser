const languages = require('./languages');
const objectUtils = require('./../../../../utils/object-utils')

class I18nProperty {

  constructor(value, options) {
    this.value = value;
  }

  setValue(value){
    this.value = value;
  }

  /**
   * Установка опций свойства
   * @param options {Object}
   */
  setOptions(options){
    this.options = options;
  }

  /**
   * С учётом локали возвращает строчное значение
   * @returns {*}
   */
  valueOf(){
    return this.value;
  }

  /**
   * С учётом локали возвращает строчное значение или объекта
   * @returns {*}
   */
  toJSON(){
    return this.value;
  }

  /**
   * Структура для сохранения в mongodb
   * @returns {*}
   */
  toBSON(){
    return this.value;
  }

  /**
   * Конвертация в структуру для обновления свойств в mongodb
   * Вместо полной перезаписи объекта, обновляются только измененные свойства i18n
   * @param path {string} Путь на родительское свойство
   * @param result {Object} Объект, в которой прописываются операции на изменение свойств
   * @param clearUndefined {Boolean} Игнорировать или нет undefined свойства
   * @returns {{$set: {}}} Возвращается аргумент result
   */
  toFlat(path = '', result = {}, clearUndefined = false){
    for (const [lang, text] of Object.entries(this.value)) {
      if (!clearUndefined || typeof text !== 'undefined') {
        result[path ? `${path}.${lang}` : lang] = text;
      }
    }
    return result;
  }

  /**
   * Валидация свойства
   * @param storage
   * @param session
   * @param object
   * @param path
   */
  validate({session, object, path}){
    if (typeof this.value === 'object') {
      const keys = Object.keys(this.value);
      let errors = [];
      for (const key of keys) {
        if (!languages[key]) {
          errors.push({
            keyword: 'i18n',
            dataPath: `${path}/${key}`,
            message: 'Invalid language code',
            //schemaPath,
            params: {},
            //schema,
            //parentSchema,
            //data
          });
        }
      }
      if (errors.length) {
        //throw new Ajv.ValidationError(errors);
      }
    }
  }

  /**
   * Подготовка свойства или чего-либо перед сохранением объекта
   */
  beforeSave({storage, session, object, path}){
    // Если валидация не выполнялась, то выполнить.
    //console.log('beforeSave', path);
  }

  /**
   * Постобработка свойства после успешного сохранения объекта
   */
  afterSave({storage, session, object, path}){
    // Какие-то дополнительные операции в базе
    //console.log('afterSave', path);
  }
}

module.exports = I18nProperty;
