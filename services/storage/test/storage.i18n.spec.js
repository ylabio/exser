const {utils} = require('merge-change');
const ObjectID = require('mongodb').ObjectID;
const schemaUtils = require('../../../utils/schema-utils');
const I18nProperty = require('../properties/i18n/index');

describe('Storage.i18n', () => {
  let s = {};
  let data = {};

  beforeAll(async () => {
    s.services = await require('../../init-spec');
    s.storage = await s.services.getStorage();
    s.spec = await s.services.getSpec();
    s.objects = s.storage.get('test');
    data.session = {
      user: {
        _id: new ObjectID(),
        _type: 'user',
      },
      acceptLang: 'ru',
    };
  });

  beforeEach(async () => {
    await s.storage.clearStorage();
  });

  test('Validate i18n', async () => {
    const context = {session: data.session};
    s.spec.set('#/components/schemas/test.i18n', {
      type: 'object',
      properties: {
        name: schemaUtils.stringi18n({
          maxLength: 10,
          default: '0',
          defaultLang: 'de'
        }),
      },
    });
    // Simple string
    const result = await s.spec.validate('#/components/schemas/test.i18n', {
      name: 'Name',
    }); // Валидация без сессии, код языка должен установиться по умолчанию
    expect(utils.toPlain(result)).toStrictEqual({
      name: {
        de: 'Name'
      },
    });
    expect(utils.type(result.name)).toBe('I18nProperty');

    // Instance of I18nProperty
    const prop = new I18nProperty({value: 'Some value', session: data.session});
    const result2 = await s.spec.validate('#/components/schemas/test.i18n', {
      name: prop,
    }, context);
    expect(utils.toPlain(result2)).toStrictEqual({
      name: {
        ru: 'Some value'
      },
    });

    // Multi strings
    const result3 = await s.spec.validate('#/components/schemas/test.i18n', {
      name: {
        ru: 'Русс',
        en: 'Англ',
        xxxx: {x: 'любая фигня должна отсекаться'}
      },
    }, context);
    expect(utils.toPlain(result3)).toStrictEqual({
      name: {
        ru: 'Русс',
        en: 'Англ',
      },
    });
    expect(utils.type(result3.name)).toBe('I18nProperty');

    // Get value
    expect(result3.name.valueOf()).toBe('Русс');

  });


  test('Create', async () => {
    const body = {
      name: 'Test',
      i18n1: 'String',
      i18n2: {en: 'StringEN', de: 'StringDE'},
      i18n3: null
    }
    const result = await s.objects.createOne({body, session: data.session});
    expect(utils.toPlain(result)).toMatchObject({
      name: 'Test',
      i18n1: {ru: 'String'},
      i18n2: {en: 'StringEN', de: 'StringDE'},
      i18n3: {ru: ''}
    });
  });

  test('Update', async () => {
    const createBody = {
      name: 'Test',
      i18n1: 'String',
      i18n2: {en: 'StringEN', de: 'StringDE'},
      i18n3: ''
    }
    const object = await s.objects.createOne({body: createBody, session: data.session});

    const updateBody = {
      name: 'TestChange',
      i18n1: 'StringNew',
      i18n2: {en: 'StringEN2', ru: 'StringRU'},
      i18n3: 'SET'
    }

    const result = await s.objects.updateOne({filer: {_id: object._id}, body: updateBody, session: data.session});

    expect(utils.toPlain(result)).toMatchObject({
      name: 'TestChange',
      i18n1: {ru: 'StringNew'},
      i18n2: {en: 'StringEN2', de: 'StringDE', ru: 'StringRU'}, // added value
      i18n3: {ru: 'SET'}
    });

    console.log(result);

  })


});
