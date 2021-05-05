const mc = require('merge-change');
const ObjectID = require('mongodb').ObjectID;
const Services = require('../../index');

describe('Storage.base', () => {
  let s = {};
  let data = {};

  beforeAll(async () => {
    s.services = new Services().configure(['configs.start.js', 'configs.tests.js']);
    s.storage = await s.services.getStorage();
    s.objects = s.storage.get('test');

    data.session = {
      user: {
        _id: new ObjectID(),
        _type: 'user'
      },
      lang: 'ru'
    };
  });

  beforeEach(async () => {
    await s.storage.clearStorage();
  });

  test('Test types', async () => {
    // console.log(mc.utils.type(new ObjectID()));
    // console.log(mc.utils.typeList(new ObjectID()));
    // console.log(mc.utils.instanceof(new ObjectID(), 'ObjectID'));
    const newObj = await s.objects.createOne({
      body: {
        name: 'Test',
        _id1: new ObjectID(),
        _id2: '5fe9dd7fe386d55258a27d40',
        _id3: null,
        dateTime: '2021-01-07T19:10:21.759Z',
        dateTime2: new Date('2021-01-07T19:10:21.759Z'),
        dateTime3: null,
        // i18n1: 'Строка',
        // i18n2: {ru: 'Строка', en: 'String'},
        // i18n3: null,
        order1: 1,
        order2: 'max',
        order3: '-1'
      },
      session: data.session,
    });

    expect(newObj).toMatchObject({
      _type: 'test',
      name: 'Test',
    });

    //console.log(newObj);
    //
    // //expect(mc.utils.type(newObj.dateCreate)).toBe('Date')
    // expect(mc.utils.type(newObj._id)).toBe('ObjectID')
  });

  test('Create simple', async () => {
    const newObj = await s.objects.createOne({
      body: {
        name: 'Test',
        title: 'i18n'
      },
      session: data.session,
    });

    // console.log(mc.utils.plain(newObj));

    expect(mc.utils.plain(newObj)).toMatchObject({
      _type: 'test',
      name: 'Test',
      status: 'new',
      title: {
        ru: 'i18n'
      }
    });

    //expect(mc.utils.type(newObj.dateCreate)).toBe('Date')
    expect(mc.utils.type(newObj._id)).toBe('ObjectID')
  });

  test('Update simple', async () => {
    const newObj = await s.objects.createOne({
      body: {
        name: 'Test',
        title: 'i18n'
      },
      session: data.session,
    });

    const chgObj = await s.objects.updateOne({
      body: {
        name: 'Test2',
        title: 'i18n'
      },
      session: data.session,
    });

    expect(mc.utils.plain(newObj)).toMatchObject({
      _type: 'test',
      name: 'Test',
      status: 'new',
      title: {
        ru: 'i18n'
      }
    });

    //expect(mc.utils.type(newObj.dateCreate)).toBe('Date')
    expect(mc.utils.type(newObj._id)).toBe('ObjectID')
  });

});
