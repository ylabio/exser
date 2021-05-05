const Model = require('../model/index.js');
const {errors, schema} = require('../../../utils');
const ObjectID = require('mongodb').ObjectID;
const mc = require('merge-change');

/**
 * Для тестирования
 */
class Test extends Model {

  define() {
    return this.extend(super.define(), schema.model({
      title: 'Тестовая модель',
      collection: 'test',
      indexes: {
        title: [{'title': 1}, {}],
      },
      // Полная схема объекта
      properties: {
        name: schema.string({maxLength: 100, example: '999'}),
        _id1: schema.objectId({description: 'Идентификатор ObjectId'}),
        _id2: schema.objectId({description: 'Идентификатор ObjectId'}),
        _id3: schema.objectId({description: 'Идентификатор ObjectId', empty: true}),
        dateTime: schema.date({defaults: new Date()}),
        dateTime2: schema.date({}),
        dateTime3: schema.date({empty: true}),
        i18n1: schema.stringi18n({}),
        i18n2: schema.stringi18n({}),
        i18n3: schema.stringi18n({}),
        order1: schema.order({}),
        order2: schema.order({}),
        order3: schema.order({}),

        relCopy: schema.rel({
          description: 'Тест связи',
          model: 'test',
          copy: '_id, _type, name, i18n1',
          search: 'name, i18n1'
        }),

        // index: schema.order({description: 'Порядковый номер'}),
        // owner: schema.sessionUser({create: true, update: false, delete: false}),
        status: schema.string({enums: ['new', 'confirm'], defaults: 'new'}),
        children: schema.array({
          description: 'Подчиненные объекты',
          items: schema.rel({
            model: 'test',
            inverse: 'parent',
            copy: '_id, _type, name',
            properties: {
              linkTitle: schema.stringi18n({description: 'Название отношения'}),
              test: schema.string({order: true}),
            },
          }),
        }),
        parent: schema.rel({
          description: 'Родительский клуб',
          model: 'test',
          inverse: 'children',
          copy: '_id, _type, name',
          tree: 'custom',
          defaults: {},
        }),
        title: schema.stringi18n({
          description: 'Заголовок',
          defaults: 'Пусто',
          maxLength: 250,
        }),
      },
      required: ['name'],
    }));
  }

  // schemes() {
  //   return this.spec.extend(super.schemes(), {});
  // }
}

module.exports = Test;
