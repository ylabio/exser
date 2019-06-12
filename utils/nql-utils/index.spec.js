const nqlUtils = require('./index.js');

describe('Test NQL', () => {

  test('$and $or $not', () => {
    const filter = {
      $and: [{prop1: 10}, {prop2: 20}],
      $or: [{xx: 1}, {yy: 2}],
      $not: {ggg: 30}
    };
    const nql = nqlUtils.buildWhere({bucket: 'main', filter});

    expect(nql).toEqual('((`prop1` = 10 AND `prop2` = 20) AND (`xx` = 1 OR `yy` = 2) AND NOT(`ggg` = 30))');
  });

  test('$eq, $ne, $in, $gt, $lt', () => {
    const filter = {
      prop1: 10,
      prop11: 'string10',
      prop2: {$eq: 20},
      prop22: {$eq: 'string20'},
      prop4: {$ne: 100},
      prop5: {$in: [10, 20, 'string', true]},
      prop6: {$gt: 5},
      prop7: {$lt: 5}
    };
    const nql = nqlUtils.buildWhere({bucket: 'main', filter});

    console.log(nql);

    expect(nql).toEqual('(`prop1` = 10 AND `prop11` = "string10" AND `prop2` = 20 AND `prop22` = "string20")');
  });
});
