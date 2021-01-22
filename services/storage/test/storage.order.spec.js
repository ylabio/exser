const {utils} = require('merge-change');
const ObjectID = require('mongodb').ObjectID;

describe('Storage.order', () => {
  let s = {};
  let data = {};

  beforeAll(async () => {
    s.services = await require('../../init-spec');
    s.storage = await s.services.getStorage();
    s.objects = s.storage.get('test');
    data.session = {
      user: {
        _id: new ObjectID(),
        _type: 'user',
      },
      acceptLang: 'all',
    };
  });

  beforeEach(async () => {
    await s.storage.clearStorage();
  });

  test('order "max"', async () => {
    const bodyList = [
      {name: 'Test1', order1: 'max'},
      {name: 'Test2', order1: 'max'},
      {name: 'Test3', order1: '++'},
      {name: 'Test4', order1: '++'},
    ];
    let index = 1;
    for (const body of bodyList) {
      const result = await s.objects.createOne({body, session: data.session, view: false});
      expect(utils.plain(result)).toMatchObject({
        _type: 'test',
        name: `Test${index}`,
        order1: index,
      });
      index++;
    }
  });

  test('order "min"', async () => {
    const bodyList = [
      {name: 'Test1', order1: 'min'},
      {name: 'Test2', order1: 'min'},
      {name: 'Test3', order1: '--'},
      {name: 'Test4', order1: '--'},
    ];
    for (const body of bodyList) {
      const result = await s.objects.createOne({body, session: data.session, view: false});
    }
    //
    let list = await s.objects.getList({sort: {'_id': 1}, view: false});
    let indexRev = 1;
    let index = 1;
    for (const item of list.items) {
      expect(utils.plain(item)).toMatchObject({
        name: `Test${index}`,
        order1: indexRev,
      });
      indexRev--;
      index++;
    }
  });

  test('order unique', async () => {
    const bodyList = [
      {name: 'Test1', order1: 2},
      {name: 'Test2', order1: 1},
      {name: 'Test3', order1: -1},
      {name: 'Test4', order1: 0},
      {name: 'Test5', order1: 100},
      {name: 'Test6', order1: 50},
      {name: 'Test7', order1: -5},
      {name: 'Test8', order1: -4},
    ];
    for (const body of bodyList) {
      await s.objects.createOne({body, session: data.session, view: false});
    }
    // data from mongo
    let list = await s.objects.getList({sort: {'_id': 1}, view: false});
    for (let i = 0; i < bodyList.length; i++) {
      expect(utils.plain(list.items[i])).toMatchObject({
        name: bodyList[i].name,
        order1: bodyList[i].order1,
      });
    }
  });

  test('order not unique', async () => {
    const bodyList = [
      {name: 'Test1', order1: 2, _expect: 3},
      {name: 'Test2', order1: 2, _expect: 2},
      {name: 'Test3', order1: -1, _expect: -5},
      {name: 'Test4', order1: 0, _expect: -1},
      {name: 'Test5', order1: -1, _expect: -4},
      {name: 'Test6', order1: 0, _expect: 0},
      {name: 'Test7', order1: -2, _expect: -3},
      {name: 'Test8', order1: -2, _expect: -2},
    ];
    for (const body of bodyList) {
      await s.objects.createOne({body, session: data.session, view: false});
    }
    // data from mongo
    let list = await s.objects.getList({sort: {'_id': 1}, view: false});
    for (let i = 0; i < bodyList.length; i++) {
      expect(utils.plain(list.items[i])).toMatchObject({
        name: bodyList[i].name,
        order1: bodyList[i]._expect,
      });
    }
  });

});
