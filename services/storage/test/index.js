const Model = require('../model/index.js');
const {errors, schemaUtils} = require('../../../utils/index');
const {rel} = require('../../../utils/schema-utils');
const ObjectID = require('mongodb').ObjectID;

/**
 * Для тестирования
 */
class Test extends Model {

  define() {
    const parent = super.define();
    return {
      collection: 'test',
      indexes: {
        title: [{'title': 1}, {}],
      },
      // Полная схема объекта
      model: this.spec.extend(parent.model, {
        title: 'Тестовая модель',
        properties: {
          name: {type: 'string', maxLength: 100, xxx: 10},
          status: {type: 'string', enum: ['new', 'confirm'], default: 'new'},
          children: {
            type: 'array',
            items: schemaUtils.rel({
              model: 'test',
              description: 'Подчиненные объекты',
              inverse: 'parent',
              copy: '_id, _type, name',
            })
          },
          parent: schemaUtils.rel({
            model: 'test',
            description: 'Родительский клуб',
            inverse: 'children',
            copy: '_id, _type, name',
            tree: 'custom',
            default: {},
          }),
          title: schemaUtils.i18n({
            description: 'Заголовок',
            default: 'Пусто',
            maxLength: 250
          })
        },
        $set: {
          required: [
            'name'
          ]
        },
      })
    };
  }

  schemes() {
    return this.spec.extend(super.schemes(), {});
  }
}

module.exports = Test;
