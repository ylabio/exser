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
          }
        }
      }
    });
  });

  test('get by path', async () => {
    // Путь без #
    const title1 = s.spec.get('info/title');
    expect(title1).toEqual('Exser');
    // Полный путь
    const title2 = s.spec.get('#/info/title');
    expect(title2).toEqual('Exser');
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
    s.spec.set('#/components/schemas/model.aa', {type: 'object', properties: {a: '1'}});
    s.spec.set('#/components/schemas/model.aa', {type: 'object', properties: {b: '2'}});
    const model = s.spec.get('/components/schemas/model.aa');
    expect(model).toStrictEqual({type: 'object', properties: {a: '1', b: '2'}});
  });

  test('reset by path', async () => {
    s.spec.set('#/components/schemas/model.aa', {type: 'object', properties: {a: '1'}});
    s.spec.set('#/components/schemas/model.aa', {$set: {type: 'object', properties: {b: '2'}}});
    const model = s.spec.get('/components/schemas/model.aa');
    expect(model).toStrictEqual({type: 'object', properties: {b: '2'}});
  });

  test('validate 1', async () => {
    s.spec.set('#/components/schemas/test.model', {
      type: 'object',
      properties: {
        name: {type: 'string', maxLength: 10},
        price: {type: 'number', default: 0},
      }
    });
    const result = await s.spec.validate('#/components/schemas/test.model', {
      name: 'value',
      price: '1'
    });
    expect(result).toStrictEqual({
      name: 'value',
      price: 1
    });
  });
});
