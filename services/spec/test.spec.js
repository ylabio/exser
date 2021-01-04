const {schemaUtils} = require('../../utils');

describe('Spec', () => {
  let s = {};
  let data = {};

  beforeAll(async () => {
    s.services = await require('../init-spec');
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


  test('validate i18n', async () => {
    s.spec.set('#/components/schemas/test.i18n', {
      type: 'object',
      properties: {
        name: schemaUtils.i18n({
          maxLength: 10,
          default: '0',
        }),
      },
    });
    // const schema = s.spec.get('#/components/schemas/test.model');
    // console.log(JSON.stringify(schema, null, 2));
    const result = await s.spec.validate('#/components/schemas/test.i18n', {
      name: 'Name',
    });
    expect(result).toStrictEqual({
      name: 'Name',
    });

    const result2 = await s.spec.validate('#/components/schemas/test.i18n', {
      name: {
        ru: 'Русс',
        en: 'Англ',
      },
    });
    expect(result2).toStrictEqual({
      name: {
        ru: 'Русс',
        en: 'Англ',
      },
    });
  });
});
