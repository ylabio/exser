const {utils} = require('merge-change');
const ObjectID = require('mongodb').ObjectID;

describe('Storage.base', () => {
  let s = {};
  let data = {};

  beforeAll(async () => {
    s.services = await require('../../init-spec');
    s.storage = await s.services.getStorage({mode:'clear'});
    s.objects = s.storage.get('test');

    data.session = {
      user: {
        _id: new ObjectID(),
        _type: 'user'
      },
      acceptLang: 'all'
    };
  });

  test('Added simple', async () => {
    const newObj = await s.objects.createOne({
      body: {
        name: 'Test',
        title: 'i18n'
      },
      session: data.session,
      view: false
    });

    expect(newObj).toMatchObject({
      _type: 'test',
      name: 'Test',
      status: 'new',
      title: {
        ru: 'i18n'
      }
    });

    expect(utils.type(newObj.dateCreate)).toBe('Date')
    expect(utils.type(newObj._id)).toBe('ObjectID')
  });

});
