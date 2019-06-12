const objectUtils = require('./index.js');

describe('objectUtils', () => {

  test('convertForSet - reset relation', () => {
    let sets = objectUtils.convertForSet({
      parent: {_id:'null'}
    });
    expect(sets).toEqual({parent: {}});
  });

  test('mergeAll', () => {
    const obj1 = {
      'a': 1,
      'b': {
        c: 1,
        d: [1,2,3],
        e: [{m:1}, {m:2}],
        i: [{_id:1, _type: 'user'}, {_id:2, _type: 'news'}]
      }
    };
    const obj2 = {
      'a': 2,
      'b': {
        d: [3,4,5],
        e: [{m:2}, {m:3}],
        i: [{_id:1, prop: 'v1'}, {_id:3, _type: 'news', prop: 'v2'}]
      },
      'n': 3
    };
    const result = objectUtils.mergeAll(obj1, obj2);

    expect(result).toEqual({
      'a': 2,
      'b': {
        c: 1,
        d: [1,2,3,4,5],
        e: [{m:1}, {m:2}, {m:2}, {m:3}],
        i: [{_id:1, _type: 'user', prop: 'v1'}, {_id:2, _type: 'news'}, {_id:3, _type: 'news', prop: 'v2'}]
      },
      'n': 3
    });
  });
});

