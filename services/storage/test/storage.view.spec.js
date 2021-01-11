const ObjectID = require('mongodb').ObjectID;
const {utils} = require('merge-change');

describe('Storage.view', () => {
  let s = {};
  let data = {};

  beforeAll(async () => {
    s.services = await require('../../init-spec');
    // s.test = await s.services.getTest();
    s.storage = await s.services.getStorage({mode:'clear'});
    s.test = s.storage.get('test');

    data.session = {
      user: {
        _id: new ObjectID(),
        _type: 'user'
      }
    };
  });

  test('_id, dateTime строкой?', async () => {
    const newObj = await s.test.createOne({
      body: {
        name: 'Test date',
        dateTime: new Date('2021-01-07T19:10:21.759Z'),
      },
      session: data.session,
      view: true
    });
    //console.log(newObj);
    expect(newObj).toMatchObject({
      dateTime: '2021-01-07T19:10:21.759Z',
      name: 'Test date',
    });
    expect(utils.type(newObj._id)).toBe('String');
  });

  test('_id, dateTime не строкой', async () => {
    const newObj = await s.test.createOne({
      body: {
        name: 'Test date',
        dateTime: new Date('2021-01-07T19:10:21.759Z'),
      },
      session: data.session,
      view: false
    });
    expect(newObj).toMatchObject({
      dateTime: new Date('2021-01-07T19:10:21.759Z'),
      name: 'Test date',
    });
    expect(utils.type(newObj._id)).toBe('ObjectID');
  });

  test('json', async () => {
    // Date.prototype.toJSON = () => {
    //   return 'A1'
    // }
    const x = new Date();
    console.log(JSON.stringify(x));

  })
});
