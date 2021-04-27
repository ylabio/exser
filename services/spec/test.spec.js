const {schemaUtils} = require('../../utils');
const Services = require('../index');

describe('Spec', () => {
  let s = {};
  let data = {};

  beforeAll(async () => {
    s.services = new Services().configure(['configs.start.js', 'configs.tests.js']);
    // s.test = await s.services.getTest();
    s.spec = await s.services.getSpec();
  });

  test('get all', async () => {
    const root = s.spec.get();
    expect(root).toMatchObject({
      openapi: '3.0.0',
      //...
      components: {
        schemas: {
          'object-id': {
            type: 'string',
            //..
          },
        },
      },
    });
  });

  test('get by path', async () => {
    // Путь без #
    const title1 = s.spec.get('info/title');
    expect(title1).toEqual('API');
    // Полный путь
    const title2 = s.spec.get('#/info/title');
    expect(title2).toEqual('API');
    // Неверный путь
    const title3 = s.spec.get('#/info.title');
    expect(title3).toEqual(undefined);

  });

  test('set by path', async () => {
    s.spec.set('#/components/schemas/model.aa', {type: 'object', properties: {}});
    const model = s.spec.get('/components/schemas/model.aa');
    expect(model).toStrictEqual({type: 'object', properties: {}});
  });

  test('set by path with merge', async () => {
    s.spec.set('#/components/schemas/model.bb', {type: 'object', properties: {a: '1'}});
    s.spec.set('#/components/schemas/model.bb', {type: 'object', properties: {b: '2'}});
    const model = s.spec.get('/components/schemas/model.bb');
    expect(model).toStrictEqual({type: 'object', properties: {a: '1', b: '2'}});
  });

  test('reset by path', async () => {
    s.spec.set('#/components/schemas/model.cc', {type: 'object', properties: {a: '1'}});
    s.spec.set('#/components/schemas/model.cc', {$set: {type: 'object', properties: {b: '2'}}});
    const model = s.spec.get('/components/schemas/model.cc');
    expect(model).toStrictEqual({type: 'object', properties: {b: '2'}});
  });

  test('validate simple', async () => {
    s.spec.set('#/components/schemas/test.simple', {
      type: 'object',
      properties: {
        name: {type: 'string', maxLength: 10},
        price: {type: 'number', default: 0},
      },
    });
    const result = await s.spec.validate('#/components/schemas/test.simple', {
      name: 'value',
      price: '1',
    });
    expect(result).toStrictEqual({
      name: 'value',
      price: 1,
    });
  });

  test('validate instance', async () => {
    s.spec.set('#/components/schemas/test.object', {
      type: 'object',
      properties: {
        name: schemaUtils.string({}),
        value: schemaUtils.number({})
      },
      additionalProperties: false
      //required: ['options']
    });

    class X {
      constructor(name, value) {
        this.name = name;
        this.value = value;
        this.sime = 10;
      }
    }

    const x = new X('x', 0);
    const result = await s.spec.validate('#/components/schemas/test.object', x);

    console.log(x, result, x === result, x.constructor.name);
  })
});
