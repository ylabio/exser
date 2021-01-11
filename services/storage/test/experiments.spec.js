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

  test('Custom class to mongo', async () => {
    class A {
      constructor() {
        this.p1 = 10;
        this.p2 = 20;
      }
      toJSON(){
        return this.p1;
      }
      // valueOf(){
      //   return this.p1;
      // }
      calculate(){
        return 100;
      }
    }

    class B extends A{
      constructor() {
        super();
        this.sub = new A();
      }
    }
    const a = new B();
    console.log(a);
    console.log(JSON.stringify(a));
    console.log(a);
    console.log(a + 0);
    console.log(a.valueOf().calculate());
    const myId = new ObjectID();
    console.log(myId, myId.valueOf(), JSON.stringify(myId));

    await s.objects.native.insertOne({
      property: a.valueOf(),
      myId: myId,
      myId2: myId.valueOf()
    });
  });

  test('Custom number', async () => {
    class Order extends Number{
      constructor(params) {
        super(params);
      }
      toJSON(){
        return this.valueOf();
      }
      toBSON() {
        return this.valueOf();
      }
    }

    const x = new Order(10);
    const y = 12;//new Number(10);

    // console.log(JSON.stringify({x,y}));
    // console.log({x: utils.typeList(x), y: utils.typeList(y)});
    // expect(x === y).toBe(false);
    // expect(x === 10).toBe(false);
    // expect(x*1 === 10).toBe(true);
    // //expect(10 === x).toBe(true);
    // expect(x.valueOf() === 10).toBe(true);

    await s.objects.native.insertOne({
      property: x
    });
  });

  test('Class', async () => {
    class X {
      static toJSON(){
        return 'a'
      }

      toJSON(){
        return 'b'
      }
    }
    console.log(JSON.stringify(X));
  });
});
