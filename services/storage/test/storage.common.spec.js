const x = require('jest');

const {arrayUtils} = require('../../../utils');
const ObjectID = require('mongodb').ObjectID;

describe('Storage.common', () => {
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

  test('Добавление/удаление объекта', async () => {
    const newObj = await s.objects.createOne({
      body: {
        name: 'Test'
      },
      session: data.session
    });

    expect(newObj).toMatchObject({
      name: 'Test',
    });

    const delObj = await s.objects.deleteOne({
      id: newObj._id,
      session: data.session
    });

    expect(delObj).toMatchObject({
      name: 'Test',
      isDeleted: true
    });
  });

  test('Выборка списка с count', async () => {
    for (let i=0; i<20; i++) {
      await s.objects.createOne({
        body: {
          name: 'Test'+i
        },
        session: data.session
      });
    }

    let list = await s.objects.getList({limit: 2, fields:'items(name),count'});

    expect(list.count).toEqual(20);
    expect(list.items[0]).toMatchObject({
      name: 'Test0'
    });
  });

  test('Установка parent', async () => {
    const root = await s.objects.createOne({
      body: {
        name: 'Root',
      },
    });
    const child1 = await s.objects.createOne({body: {name: 'Child 1', parent: {_id: root._id}}});
    const child2 = await s.objects.createOne({body: {name: 'Child 2', parent: {_id: child1._id}}});
    const child3 = await s.objects.createOne({body: {name: 'Child 3', parent: {_id: child2._id}}});

    expect(child1).toMatchObject({
      name: child1.name,
      parent: {_id: root._id, _type: root._type}
    });

    expect(child2).toMatchObject({
      name: child2.name,
      parent: {_id: child1._id, _type: child1._type}
    });

    expect(child3).toMatchObject({
      name: child3.name,
      parent: {_id: child2._id, _type: child2._type}
    });
  });

  test('Установка parent по _key', async () => {
    const root = await s.objects.createOne({
      body: {
        _key: 'root',
        name: 'Root',
      },
    });
    const child1 = await s.objects.createOne({body: {_key: '1',name: 'Child 1', parent: {_key: 'root'}}});
    const child2 = await s.objects.createOne({body: {_key: '2',name: 'Child 2', parent: {_key: '1'}}});
    const child3 = await s.objects.createOne({body: {_key: '3',name: 'Child 3', parent: {_key: '2'}}});

    expect(child1).toMatchObject({
      name: child1.name,
      parent: {_id: root._id, _type: root._type}
    });

    expect(child2).toMatchObject({
      name: child2.name,
      parent: {_id: child1._id, _type: child1._type}
    });

    expect(child3).toMatchObject({
      name: child3.name,
      parent: {_id: child2._id, _type: child2._type}
    });
  });

  test('Установка parent начиная с листового', async () => {
    const root = await s.objects.createOne({
      body: {
        name: 'Root',
      },
    });

    const child1 = await s.objects.createOne({body: {name: 'Child 1'}});
    const child2 = await s.objects.createOne({body: {name: 'Child 2'}});
    const child3 = await s.objects.createOne({body: {name: 'Child 3'}});

    const child3Upd = await s.objects.updateOne({
      id: child3._id,
      body: {parent: {_id: child2._id}}
    });
    const child2Upd = await s.objects.updateOne({
      id: child2._id,
      body: {parent: {_id: child1._id}}
    });
    const child1Upd = await s.objects.updateOne({id: child1._id, body: {parent: {_id: root._id}}});

    expect(child1Upd).toMatchObject({
      name: child1.name,
      parent: {_id: root._id, _type: root._type}
    });

    expect(child2Upd).toMatchObject({
      name: child2.name,
      parent: {_id: child1._id, _type: child1._type}
    });

    expect(child3Upd).toMatchObject({
      name: child3.name,
      parent: {_id: child2._id, _type: child2._type}
    });
  });


  test('Смнена parent c увеличенивем вложенности', async () => {
    // 1. Создание дерева
    const superRoot = await s.objects.createOne({
      body: {
        name: 'SuperRoot',
      },
    });
    const root = await s.objects.createOne({
      body: {
        name: 'Root',
        parent: {_id: superRoot._id}
      },
    });
    const newRoot = await s.objects.createOne({
      body: {name: 'New Root', parent: {_id: root._id}}
    });
    const child = await s.objects.createOne({
      body: {name: 'Child', parent: {_id: root._id}}
    });
    const childSub = await s.objects.createOne({
      body: {
        name: 'childSub',
        parent: {_id: child._id}
      }
    });
    const childSubSub = await s.objects.createOne({
      body: {
        name: 'childSubSub',
        parent: {_id: childSub._id}
      }
    });

    expect(childSub).toMatchObject({
      name: 'childSub',
      parent: {_id: child._id, _type: child._type}
    });

    // 2. Переносим child в newRoot (увеливание вложенности)
    const child1Upd = await s.objects.updateOne({
      id: child._id,
      body: {parent: {_id: newRoot._id}}
    });
    const childSubUpd = await s.objects.getOne({filter: {_id: new ObjectID(childSub._id)}});
    const childSubSubUpd = await s.objects.getOne({filter: {_id: new ObjectID(childSubSub._id)}});

    expect(child1Upd).toMatchObject({
      name: child.name,
      parent: {_id: newRoot._id, _type: newRoot._type}
    });

    expect(childSubUpd).toMatchObject({
      name: childSub.name,
      parent: {_id: child._id, _type: child._type}
    });

    expect(childSubSubUpd).toMatchObject({
      name: childSubSub.name,
      parent: {_id: childSub._id, _type: childSub._type}
    });
  });

  test('Установка удаленного parent', async () => {
    const root = await s.objects.createOne({
      body: {
        name: 'Root',
      },
    });
    const child = await s.objects.createOne({
      body: {
        name: 'Child 1',
      }
    });
    // Удаление объектов
    await s.objects.deleteOne({id: root._id});
    await s.objects.deleteOne({id: child._id});

    // Установка удаленного родителя
    const child1Upd = await s.objects.updateOne({
      id: child._id,
      body: {
        name: 'Deleted child to deleted parent',
        parent: {_id: root._id}
      },
      fields: '_id, _type, name, parent(_id, _type, name)'
    });

    expect(child1Upd).toMatchObject({
      _id: child1Upd._id,
      _type: child1Upd._type,
      name: child1Upd.name,
      parent: {_id: root._id, _type: root._type, name: root.name, isDeleted: true}
    });
  });

  test('Установка children', async () => {
    // Подготовка объектов в качестве подчиенных
    const children = [
      await s.objects.createOne({body: {name: 'Child 1'}}),
      await s.objects.createOne({body: {name: 'Child 2'}}),
      await s.objects.createOne({body: {name: 'Child 3'}}),
      await s.objects.createOne({body: {name: 'Child 4'}}),
    ];
    /**
     * Добавление children в новый root
     */
      // Создание родительского объекта
    const root = await s.objects.createOne({
        body: {
          name: 'Root',
          children: [
            {_id: children[0]._id},
            {_id: children[1]._id},
            {_id: children[2]._id}
          ]
        },
      });

    // Проверка children
    expect(root).toMatchObject({
      name: 'Root',
      children: [
        {_id: children[0]._id, _type: children[0]._type},
        {_id: children[1]._id, _type: children[1]._type},
        {_id: children[2]._id, _type: children[2]._type}
      ]
    });

    // Проверка parent у children
    const childrenUpd = [
      await s.objects.getOne({filter: {_id: new ObjectID(children[0]._id)}}),
      await s.objects.getOne({filter: {_id: new ObjectID(children[1]._id)}}),
      await s.objects.getOne({filter: {_id: new ObjectID(children[2]._id)}}),
    ];

    expect(childrenUpd[0]).toMatchObject({
      name: children[0].name,
      parent: {_id: root._id, _type: root._type}
    });

    expect(childrenUpd[1]).toMatchObject({
      name: children[1].name,
      parent: {_id: root._id, _type: root._type}
    });

    expect(childrenUpd[2]).toMatchObject({
      name: children[2].name,
      parent: {_id: root._id, _type: root._type}
    });
  });

  test('Изменения children', async () => {
    // Подготовка объектов в качестве подчиенных
    const children = [
      await s.objects.createOne({body: {name: 'Child 1'}}),
      await s.objects.createOne({body: {name: 'Child 2'}}),
      await s.objects.createOne({body: {name: 'Child 3'}}),
      await s.objects.createOne({body: {name: 'Child 4'}}),
    ];
    /**
     * Добавление children в новый root
     */
      // Создание родительского объекта
    const root = await s.objects.createOne({
        body: {
          name: 'Root',
          children: [
            {_id: children[0]._id},
            {_id: children[1]._id},
            {_id: children[2]._id}
          ]
        },
      });

    // Проверка children
    expect(root).toMatchObject({
      name: 'Root',
      children: [
        {_id: children[0]._id, _type: children[0]._type},
        {_id: children[1]._id, _type: children[1]._type},
        {_id: children[2]._id, _type: children[2]._type}
      ]
    });

    // Проверка parent у children
    const childrenUpd = [
      await s.objects.getOne({filter: {_id: new ObjectID(children[0]._id)}}),
      await s.objects.getOne({filter: {_id: new ObjectID(children[1]._id)}}),
      await s.objects.getOne({filter: {_id: new ObjectID(children[2]._id)}}),
    ];

    expect(childrenUpd[0]).toMatchObject({
      name: children[0].name,
      parent: {_id: root._id, _type: root._type}
    });

    expect(childrenUpd[1]).toMatchObject({
      name: children[1].name,
      parent: {_id: root._id, _type: root._type}
    });

    expect(childrenUpd[2]).toMatchObject({
      name: children[2].name,
      parent: {_id: root._id, _type: root._type}
    });

    /**
     * Установка нового children в root
     */
    const rootUpd = await s.objects.updateOne({
      id: root._id,
      body: {
        children: [
          {_id: children[1]._id},
          {_id: children[3]._id},
        ]
      },
    });
    expect(rootUpd).toMatchObject({
      name: 'Root',
      children: [
        {_id: children[1]._id, _type: children[1]._type},
        {_id: children[3]._id, _type: children[3]._type}
      ]
    });
    // Проверка сброса parent и его сохранения/установки
    const childrenUpd2 = [
      await s.objects.getOne({filter: {_id: new ObjectID(children[0]._id)}}),
      await s.objects.getOne({filter: {_id: new ObjectID(children[1]._id)}}),
      await s.objects.getOne({filter: {_id: new ObjectID(children[2]._id)}}),
      await s.objects.getOne({filter: {_id: new ObjectID(children[3]._id)}}),
    ];
    expect(childrenUpd2[0].parent).toEqual({});
    expect(childrenUpd2[1].parent).toEqual(
      {_id: root._id, _type: root._type}
    );
    expect(childrenUpd2[2].parent).toEqual({});
    expect(childrenUpd2[3].parent).toEqual(
      {_id: root._id, _type: root._type}
    );

    /**
     * Установка пустого children
     */
    const rootUpd2 = await s.objects.updateOne({
      id: root._id,
      body: {
        children: []
      },
    });
    expect(rootUpd2.children).toEqual([]);

    const childrenUpd3 = [
      await s.objects.getOne({filter: {_id: new ObjectID(children[0]._id)}}),
      await s.objects.getOne({filter: {_id: new ObjectID(children[1]._id)}}),
      await s.objects.getOne({filter: {_id: new ObjectID(children[2]._id)}}),
      await s.objects.getOne({filter: {_id: new ObjectID(children[3]._id)}}),
    ];
    expect(childrenUpd3[0].parent).toEqual({});
    expect(childrenUpd3[1].parent).toEqual({});
    expect(childrenUpd3[2].parent).toEqual({});
    expect(childrenUpd3[3].parent).toEqual({});
  });

  test('Счётчик', async () => {
    // Создание действия и привязка к игре
    const value1 = await s.storage.newCode();
    expect(value1).toEqual(1);

    const value2 = await s.storage.newCode();
    expect(value2).toEqual(2);

    const value3 = await s.storage.newCode({type: 'some'});
    expect(value3).toEqual(1);
  });
});
