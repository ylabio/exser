const mc = require('merge-change');
const ObjectID = require('mongodb').ObjectID;
const {schema} = require('../../../utils');
const RelProperty = require('../properties/rel/index');
const SessionState = require('../../sessions/session-state');
const Services = require('../../index');

describe('Storage.rel', () => {
  let s = {};
  let data = {};

  beforeAll(async () => {
    s.services = new Services().configure(['configs.start.js', 'configs.tests.js']);
    s.storage = await s.services.getStorage();
    s.spec = await s.services.getSpec();
    s.sessions = await s.services.getSessions();
    s.objects = s.storage.get('test');
    /** @type {SessionState} */
    data.session = s.sessions.create();
    data.session.lang = 'ru';
    data.session.access = false;
    data.session.user = {
      _id: new ObjectID(),
      _type: 'user',
    };
    s.spec.set('#/components/schemas/test.rel', {
      type: 'object',
      properties: {
        user: schema.rel({
          model: 'test',
          copy: '_id,_type,name'
        }),
      },
    });
  });

  beforeEach(async () => {
    await s.storage.clearStorage();
  });

  test('Validate rel', async () => {
    const context = {session: data.session};

    const result = await s.spec.validate('#/components/schemas/test.rel', {
      user: {_id: '6059c9379ccd9835d0431a19'},
    }); // Валидация без сессии, код языка должен установиться по умолчанию
    expect(mc.utils.plain(result)).toStrictEqual({
      user: {_id: '6059c9379ccd9835d0431a19'},
    });
    expect(mc.utils.type(result.user)).toBe('RelProperty');
    expect(mc.utils.type(result.user._id)).toBe('ObjectID');
    expect('_id' in result.user).toBe(true);
    expect('_key' in result.user).toBe(false);

    // Instance of RelProperty
    const prop = new RelProperty({value: {_key: '1', _type: 'user'}, session: data.session});
    const result2 = await s.spec.validate('#/components/schemas/test.rel', {
      user: prop,
    }, context);
    expect(mc.utils.plain(result2)).toStrictEqual({
      user: {_key: '1', _type: 'user'},
    });
    expect(mc.utils.type(result2.user)).toBe('RelProperty');
  });

  test('Load related object', async () => {
    // Создаём тестовый объект
    const body = {
      name: 'Related object',
    }
    const object = await s.objects.createOne({body, session: data.session});
    // Ссылаемся на тестовый объект
    const result = await s.spec.validate('#/components/schemas/test.rel',
      {user: {_id: object._id}},
      {session: data.session}
    );
    // Вытаскиваем свойства связанного объекта
    const rel = await result.user.load();
    expect(mc.utils.plain(rel)).toMatchObject({
      name: 'Related object',
    });
    expect(result.user.$rel.name).toBe('Related object');
    // Проверка повторной Не загрузки
    result.user.$rel.name = 'New name';
    await result.user.load();
    expect(result.user.$rel.name).toBe('New name');
    await result.user.load(true);
    expect(result.user.$rel.name).toBe('Related object');
  });

  test('Create with copy and update', async () => {
    // Создаём первый объект
    const testBody = {
      name: 'Related object',
      i18n1: {
        ru: 'Рус',
        en: 'En'
      }
    }
    const test = await s.objects.createOne({body: testBody, session: data.session});
    // Создаём второй объект со связью на первый
    const body = {
      name: 'Test object',
      relCopy: {_id: test._id},
    }
    const result = await s.objects.createOne({body, session: data.session});

    expect(mc.utils.plain(result)).toMatchObject({
      name: 'Test object',
      relCopy: {
        _id: test._id.toString(),
        _type: 'test',
        name: 'Related object',
        i18n1: {ru: 'Рус', en: 'En'}
      }
    });

    const result2 = await s.objects.updateOne({
      filter: {_id: result._id},
      body: {name: 'Test object2'},
      session: data.session
    });

    expect(mc.utils.plain(result2)).toMatchObject({
      name: 'Test object2',
      relCopy: {
        _id: test._id.toString(),
        _type: 'test',
        name: 'Related object',
        i18n1: {ru: 'Рус', en: 'En'}
      }
    });
  });


});
