const x = require('jest');

const {arrayUtils} = require('../../../utils');
const ObjectID = require('mongodb').ObjectID;

describe('Storage.order', () => {
  let s = {};
  let data = {};

  beforeAll(async () => {
    s.services = await require('../../init-spec');
    // s.test = await s.services.getTest();
    s.storage = await s.services.getStorage({mode:'clear'});
    s.objects = s.storage.get('test');

    data.session = {
      user: {
        _id: new ObjectID(),
        _type: 'user'
      }
    };
  });

  test('Order', async () => {
    // Создание нескольких объектов
    const list = {};
    for (let i = 0; i < 10; i++) {
      list[(i + 1)] = await s.objects.createOne({body: {name: (i + 1).toString()}});
    }

    expect(list[1]).toMatchObject({
      name: '1',
      order: 1
    });
    expect(list[10]).toMatchObject({
      name: '10',
      order: 10
    });

    // Перемещение 1 -> 4
    await s.objects.updateOne({id: list[1]._id, body: {order: 4}});
    // проверка списка
    const list1 = await s.objects.getList({sort: {'order': 1}, fields: '_id,name,order'});

    expect(list1.items[0]).toMatchObject({name: '2', order: 1});
    expect(list1.items[1]).toMatchObject({name: '3', order: 2});
    expect(list1.items[2]).toMatchObject({name: '4', order: 3});
    expect(list1.items[3]).toMatchObject({name: '1', order: 4});
    expect(list1.items[4]).toMatchObject({name: '5', order: 5});
    expect(list1.items[5]).toMatchObject({name: '6', order: 6});
    expect(list1.items[6]).toMatchObject({name: '7', order: 7});
    expect(list1.items[7]).toMatchObject({name: '8', order: 8});
    expect(list1.items[8]).toMatchObject({name: '9', order: 9});
    expect(list1.items[9]).toMatchObject({name: '10', order: 10});

    // Перемещение 9 -> 3
    await s.objects.updateOne({id: list1.items[8]._id, body: {order: 3}});
    // проверка списка
    const list2 = await s.objects.getList({sort: {'order': 1}, fields: '_id,name,order'});
    expect(list2.items[0]).toMatchObject({name: '2', order: 1});
    expect(list2.items[1]).toMatchObject({name: '3', order: 2});
    expect(list2.items[3]).toMatchObject({name: '4', order: 4});
    expect(list2.items[4]).toMatchObject({name: '1', order: 5});
    expect(list2.items[5]).toMatchObject({name: '5', order: 6});
    expect(list2.items[6]).toMatchObject({name: '6', order: 7});
    expect(list2.items[7]).toMatchObject({name: '7', order: 8});
    expect(list2.items[8]).toMatchObject({name: '8', order: 9});
    expect(list2.items[2]).toMatchObject({name: '9', order: 3});
    expect(list2.items[9]).toMatchObject({name: '10', order: 10});
  });

});
