const Model = require('../model/index.js');
const {errors} = require('../../../utils');
const ObjectID = require('mongodb').ObjectID;
const type = require('../../../utils/schema-utils');

/**
 * Для тестирования
 */
class Test extends Model {

  define() {
    return this.spec.extend(super.define(), type.model({
      title: 'Тестовая модель',
      collection: 'test',
      indexes: {
        title: [{'title': 1}, {}],
      },
      // Полная схема объекта
      properties: {
        name: type.string({maxLength: 100}),
        // index: type.order({description: 'Порядковый номер'}),
        // owner: type.sessionUser({create: true, update: false, delete: false}),
        dateTime: type.date({defaults: new Date()}),
        status: type.string({enums: ['new', 'confirm'], defaults: 'new'}),
        children: type.array({
          description: 'Подчиненные объекты',
          items: type.rel({
            model: 'test',
            inverse: 'parent',
            copy: '_id, _type, name',
            properties: {
              linkTitle: type.stringi18n({description: 'Название отношения'}),
              test: type.string({order: true}),
            },
          }),
        }),
        parent: type.rel({
          description: 'Родительский клуб',
          model: 'test',
          inverse: 'children',
          copy: '_id, _type, name',
          tree: 'custom',
          defaults: {},
        }),
        title: type.stringi18n({
          description: 'Заголовок',
          defaults: 'Пусто',
          maxLength: 250,
        }),
      },
      required: ['name'],
    }));
  }

  schemes() {
    return this.spec.extend(super.schemes(), {});
  }
}

module.exports = Test;
