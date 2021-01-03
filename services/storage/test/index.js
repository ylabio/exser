const Model = require('../model/index.js');
const {errors} = require('../../../utils/index');
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
            items: this.spec.generate('rel', {
              description: 'Подчиненные объекты',
              type: 'test',
              inverse: 'parent',
              copy: 'name'
            })
          },
          parent: this.spec.generate('rel', {
            description: 'Родительский клуб',
            type: 'test',
            inverse: 'children',
            copy: 'name',
            tree: 'custom',
            default: {}
          }),
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
