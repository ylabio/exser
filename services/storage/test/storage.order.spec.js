const mc = require('merge-change');
const ObjectID = require('mongodb').ObjectID;
const Services = require('../../index');

describe('Storage.order', () => {
  let s = {};
  let data = {};

  beforeAll(async () => {
    s.services = new Services().configure(['configs.start.js', 'configs.tests.js']);
    s.storage = await s.services.getStorage();
    s.objects = s.storage.get('test');
    data.session = {
      user: {
        _id: new ObjectID(),
        _type: 'user',
      },
      lang: '*',
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
      const result = await s.objects.createOne({body, session: data.session});
      expect(mc.utils.plain(result)).toMatchObject({
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
      const result = await s.objects.createOne({body, session: data.session});
    }
    //
    let list = await s.objects.findMany({sort: {'_id': 1}});
    let indexRev = 1;
    let index = 1;
    for (const item of list) {
      expect(mc.utils.plain(item)).toMatchObject({
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
      await s.objects.createOne({body, session: data.session});
    }
    // data from mongo
    let list = await s.objects.findMany({sort: {'_id': 1}});
    for (let i = 0; i < bodyList.length; i++) {
      expect(mc.utils.plain(list[i])).toMatchObject({
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
      await s.objects.createOne({body, session: data.session});
    }
    // data from mongo
    let list = await s.objects.findMany({sort: {'_id': 1}});
    for (let i = 0; i < bodyList.length; i++) {
      expect(mc.utils.plain(list[i])).toMatchObject({
        name: bodyList[i].name,
        order1: bodyList[i]._expect,
      });
    }
  });


  test('change order', async () => {
    // init
    const bodyList = [
      {name: 'Test1', order1: 'max', _expect: 1},
      {name: 'Test2', order1: 'max', _expect: 2},
      {name: 'Test3', order1: 'max', _expect: 3},
      {name: 'Test4', order1: 'max', _expect: 4},
      {name: 'Test5', order1: 'max', _expect: 5},
      {name: 'Test6', order1: 'max', _expect: 6},
      {name: 'Test7', order1: 'max', _expect: 7},
      {name: 'Test8', order1: 'max', _expect: 8},
    ];
    for (const body of bodyList) {
      await s.objects.createOne({body, session: data.session});
    }
    // test init
    let list = await s.objects.findMany({sort: {'_id': 1}});
    for (let i = 0; i < bodyList.length; i++) {
      expect(mc.utils.plain(list[i])).toMatchObject({
        name: bodyList[i].name,
        order1: bodyList[i]._expect,
      });
    }

    // Move Test2 to max
    const changedTest2 = await s.objects.updateOne({
      filter: {name: 'Test2'},
      body: {order1: 8},
      session: data.session,
    });

    expect(mc.utils.plain(changedTest2)).toMatchObject({
      name: 'Test2',
      order1: 8,
    });

    const need = [
      {name: 'Test1', order1: 1},
      {name: 'Test2', order1: 8},
      {name: 'Test3', order1: 2},
      {name: 'Test4', order1: 3},
      {name: 'Test5', order1: 4},
      {name: 'Test6', order1: 5},
      {name: 'Test7', order1: 6},
      {name: 'Test8', order1: 7},
    ];

    // test all
    list = await s.objects.findMany({sort: {'_id': 1}});
    for (let i = 0; i < bodyList.length; i++) {
      expect(mc.utils.plain(list[i])).toMatchObject({
        name: need[i].name,
        order1: need[i].order1,
      });
    }
  });

});
