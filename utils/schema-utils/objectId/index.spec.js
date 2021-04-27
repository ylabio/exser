const objectId = require('./index');
const {utils} = require('merge-change');
const ObjectId = require('mongodb').ObjectID;
const Services = require('../../../services');

describe('schema-utils.objectId', () => {
  let s = {};

  beforeAll(async () => {
    s.services = new Services().configure(['configs.start.js', 'configs.tests.js']);
    s.spec = await s.services.getSpec();
    s.storage = await s.services.getStorage(); // нужно для регистрации objectId свойства в instance
    s.spec.set('#/components/schemas/model.objectId', {
      type: 'object',
      properties: {
        id: objectId({empty: true}),
        idList: {type: 'array', items: objectId({})},
        sub: {
          type: 'object',
          properties: {
            inner: {
              type: 'object',
              properties: {
                deeperList: {type: 'array', items: objectId({})},
              },
            },
          },
        },
      },
    });
  });

  test('string objectId', async () => {
    const body = {
      id: '54759eb3c090d83494e2d804',
      idList: [
        '54759eb3c090d83494e2d804',
        '54759eb3c090d83494e2d804',
      ],
      sub: {
        inner: {
          deeperList: [
            '54759eb3c090d83494e2d804',
          ],
        },
      },
    };
    const result = await s.spec.validate('#/components/schemas/model.objectId', body);
    expect(utils.type(result.id)).toBe('ObjectID');
    expect(utils.type(result.idList[1])).toBe('ObjectID');
    expect(utils.type(result.sub.inner.deeperList[0])).toBe('ObjectID');
  });

  test('object objectId', async () => {
    const body = {
      id: new ObjectId('54759eb3c090d83494e2d804'),
      idList: [
        new ObjectId('54759eb3c090d83494e2d804'),
        new ObjectId('54759eb3c090d83494e2d804')],
    };
    const result = await s.spec.validate('#/components/schemas/model.objectId', body);
    expect(utils.type(result.id)).toBe('ObjectID');
    expect(utils.type(result.idList[1])).toBe('ObjectID');
  });

  test('empty objectId', async () => {
    const body = {
      id: '',
    };
    const result = await s.spec.validate('#/components/schemas/model.objectId', body);
    //console.log(result);
    expect(result).toEqual({
      id: null,
    });
  });

  test('null objectId', async () => {
    const body = {
      id: null,
    };
    const result = await s.spec.validate('#/components/schemas/model.objectId', body);
    expect(result).toEqual({
      id: null,
    });
  });

  test('default objectId', async () => {
    s.spec.set('#/components/schemas/model.objectIdDefault', {
      type: 'object',
      properties: {
        id1: objectId({defaults: 'null', empty: true}), // '' или null в качестве значения по умолчанию игнорится валидаторм :(
        id2: objectId({defaults: '54759eb3c090d83494e2d804'}),
        id3: objectId({defaults: new ObjectId('54759eb3c090d83494e2d804')}),
      },
    });
    const body = {};
    const result = await s.spec.validate('#/components/schemas/model.objectIdDefault', body);
    expect(utils.type(result.id1)).toBe('Null');
    expect(utils.type(result.id2)).toBe('ObjectID');
    expect(utils.type(result.id3)).toBe('ObjectID');
  });
});
