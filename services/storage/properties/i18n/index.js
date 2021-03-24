const languages = require('./languages');
const acceptLanguage = require('accept-language');
const mc = require('merge-change');
const Property = require('./../property');

acceptLanguage.languages(Object.keys(languages));

class I18nProperty extends Property{

  constructor({value, session, options}) {
    super({
      value,
      session,
      options: mc.patch({
        default: 'ru',
      }, options)
    })
  }

  setValue(value) {
    if (mc.utils.type(value) === 'Object') {
      // Возможно переданы значения на нескольких языках
      // Нужно проверить ключи объекта, являются ли они кодами языков
      const keys = Object.keys(value);
      for (let key of keys) {
        if (!languages[key]) {
          throw new Error('Invalid language code');
        }
      }
      this.value = value;
    } else {
      // Установка языка по локали
      const key = acceptLanguage.get(this.session.acceptLang && this.session.acceptLang!=='all' ? this.session.acceptLang : this.options.default);
      this.value = {[key]: value};
    }
  }

  /**
   * С учётом локали возвращает строчное значение
   * @returns {*}
   */
  valueOf() {
    if (this.session.acceptLang === 'all'){
      return this.value;
    }
    const key = acceptLanguage.get(this.session.acceptLang ? this.session.acceptLang : this.options.default);
    return this.value[key]; // @todo Ели нет key, то вернуть иное доступное значение?
  }

  isContain(value){
    const keys = Object.keys(this.value);
    for (const key of keys){
      if (this.value[key] === value){
        return true;
      }
    }
    return false;
  }

  mergeString(value ,kind){
    const key = acceptLanguage.get(this.session.acceptLang && this.session.acceptLang !=='all' ? this.session.acceptLang : this.options.default);
    const second = {[key]: value};
    if (kind === 'merge' || kind === 'update'){
      return new I18nProperty({value: mc.merge(this.value, second), options: this.options, session: this.session});
    }
    if (kind === 'patch'){
      this.setValue(
        mc.patch(this.value, second)
      )
    }
    return this;
  }

  mergeObject(value, kind){
    if (kind === 'merge' || kind === 'update'){
      return new I18nProperty({value: mc.merge(this.value, value), options: this.options, session: this.session});
    }
    if (kind === 'patch'){
      this.setValue(
        mc.patch(this.value, value)
      )
    }
    return this;
  }
}

mc.addMerge('I18nProperty', 'String', (first, second, kind) => {
  return first.mergeString(second, kind);
});

mc.addMerge('I18nProperty', 'Object', (first, second, kind) => {
  return first.mergeObject(second, kind);
});

module.exports = I18nProperty;
