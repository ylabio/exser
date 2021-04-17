const {utils} = require('merge-change');
const ObjectID = require('mongodb').ObjectID;

describe('Storage.base', () => {
  let s = {};
  let data = {};

  beforeAll(async () => {
    s.services = await require('../../init-spec');
    s.storage = await s.services.getStorage();
    s.objects = s.storage.get('test');

    data.session = {
      user: {
        _id: new ObjectID(),
        _type: 'user'
      },
      acceptLang: 'ru'
    };
  });

  beforeEach(async () => {
    await s.storage.clearStorage();
  });

  test('Test types', async () => {
    // console.log(utils.type(new ObjectID()));
    // console.log(utils.typeList(new ObjectID()));
    // console.log(utils.instanceof(new ObjectID(), 'ObjectID'));
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
    // //expect(utils.type(newObj.dateCreate)).toBe('Date')
    // expect(utils.type(newObj._id)).toBe('ObjectID')
  });

  test('Create simple', async () => {
    const newObj = await s.objects.createOne({
      body: {
        name: 'Test',
        title: 'i18n'
      },
      session: data.session,
    });

    console.log(utils.plain(newObj));

    expect(utils.plain(newObj)).toMatchObject({
      _type: 'test',
      name: 'Test',
      status: 'new',
      title: {
        ru: 'i18n'
      }
    });

    //expect(utils.type(newObj.dateCreate)).toBe('Date')
    expect(utils.type(newObj._id)).toBe('ObjectID')
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

    expect(utils.plain(newObj)).toMatchObject({
      _type: 'test',
      name: 'Test',
      status: 'new',
      title: {
        ru: 'i18n'
      }
    });

    //expect(utils.type(newObj.dateCreate)).toBe('Date')
    expect(utils.type(newObj._id)).toBe('ObjectID')
  });

});
