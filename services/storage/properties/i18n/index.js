const languages = require('./languages');
const acceptLanguage = require('accept-language');
const mc = require('merge-change');
const Property = require('./../property');

const acceptFull = acceptLanguage.create();
acceptFull.languages(Object.keys(languages));

class I18nProperty extends Property {

  constructor({value, session, services, options}) {
    super({
      value,
      session,
      services,
      options: mc.patch({
        default: 'ru',
      }, options)
    });
  }

  set(value) {
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
      const key = acceptFull.get(this.session.lang && this.session.lang !== '*' ? this.session.lang : this.options.default);
      this.value = {[key]: value};
    }
  }

  /**
   * С учётом локали возвращает строчное значение или объект всех переводов
   * @returns {*}
   */
  valueOf() {
    if (this.session.lang === '*') {
      return this.value;
    }
    const accept = acceptLanguage.create();
    const langList = Object.keys(this.value);
    if (langList.length) {
      accept.languages(Object.keys(this.value));
      const key = accept.get(this.session.lang ? this.session.lang : this.options.default);
      return this.value[key];
    } else {
      return ''
    }
  }

  isContain(value) {
    const keys = Object.keys(this.value);
    for (const key of keys) {
      if (this.value[key] === value) {
        return true;
      }
    }
    return false;
  }

  mergeString(value, kind) {
    const key = acceptFull.get(this.session.lang && this.session.lang !== '*' ? this.session.lang : this.options.default);
    const second = {[key]: value};
    if (kind === mc.KINDS.MERGE || kind === mc.KINDS.UPDATE) {
      return new I18nProperty({
        value: mc.merge(this.value, second),
        options: this.options,
        session: this.session
      });
    }
    if (kind === mc.KINDS.PATCH) {
      this.set(
        mc.patch(this.value, second)
      )
    }
    return this;
  }

  mergeObject(value, kind) {
    if (kind === mc.KINDS.MERGE || kind === mc.KINDS.UPDATE) {
      return new I18nProperty({
        value: mc.merge(this.value, value),
        options: this.options,
        session: this.session
      });
    }
    if (kind === mc.KINDS.PATCH) {
      this.set(
        mc.patch(this.value, value)
      )
    }
    return this;
  }
}

/**
 * Расширение библиотеки merge-change для слияния I18nProperty со строкой и простым объектом
 */
mc.addMerge('I18nProperty', 'String', (first, second, kind) => {
  return first.mergeString(second, kind);
});

mc.addMerge('I18nProperty', 'Object', (first, second, kind) => {
  return first.mergeObject(second, kind);
});

mc.addMerge('I18nProperty', 'I18nProperty', (first, second, kind) => {
  return first.mergeObject(second.get(), kind);
});

module.exports = I18nProperty;
