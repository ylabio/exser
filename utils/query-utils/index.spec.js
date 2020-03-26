const queryUtils = require('./index.js');
const ObjectID = require('mongodb').ObjectID;

describe('Parse fields parameter', () => {
  test('parse one field', () => {
    let fields = queryUtils.parseFields('name');
    expect(fields).toEqual({name: 1});
  });

  test('parse empty field', () => {
    let fields = queryUtils.parseFields('');
    expect(fields).toEqual(undefined);
  });

  test('parse two plain fields', () => {
    let fields = queryUtils.parseFields('name1, name2');
    expect(fields).toEqual({name1: 1, name2: 1});
  });

  test('parse sub fields', () => {
    let fields = queryUtils.parseFields('name1, name2(object(property, _id))');
    expect(fields).toEqual({name1: 1, name2: {object: {property: 1, _id: 1}}});
  });

  test('parse sub fields with {}}', () => {
    let fields = queryUtils.parseFields('name1, name2{object{property, _id}}');
    expect(fields).toEqual({name1: 1, name2: {object: {property: 1, _id: 1}}});
  });

  test('parse !', () => {
    let fields = queryUtils.parseFields('!name1, !name2(object(!property, _id))');
    expect(fields).toEqual({name1: 0, name2: 0});
  });

  test('parse with namespaces', () => {
    let fields = queryUtils.parseFields('news:name, user-admin:name.2(object(some:property, _id))');
    expect(fields).toEqual({
      "news:name": 1,
      "user-admin:name.2": {object: {"some:property": 1, _id: 1}}
    });
  });

  test('parse with spec symbols', () => {
    let fields = queryUtils.parseFields('^%$+*name1, #@*-($1,_!@#$%^&*=+~?<>:;|/\\\\-)');
    expect(fields).toEqual({'^%$+*name1': 1, '#@*-': {'$1': 1, '_!@#$%^&*=+~?<>:;|/\\-': 1}});
  });

  test('parse multiple sub fields', () => {
    let fields = queryUtils.parseFields(
      'name1, name2(object(property, _id)), name3(object(property, _id))'
    );
    expect(fields).toEqual({
      name1: 1,
      name2: {object: {property: 1, _id: 1}},
      name3: {object: {property: 1, _id: 1}}
    });
  });

  test('parse multiple sub fields with {}', () => {
    let fields = queryUtils.parseFields(
      'name1, name2{object{property, _id}}, name3{object{property, _id}}'
    );
    expect(fields).toEqual({
      name1: 1,
      name2: {object: {property: 1, _id: 1}},
      name3: {object: {property: 1, _id: 1}}
    });
  });

  test('parse with many spaces', () => {
    let fields = queryUtils.parseFields(
      '  name1  ,   name2 (   object(    property, _id  ) )       '
    );
    expect(fields).toEqual({name1: 1, name2: {object: {property: 1, _id: 1}}});
  });

  test('parse with \n', () => {
    let fields = queryUtils.parseFields(
      '  name1  ,   ' +
      '   name2 (   object(    property, _id  ' +
      ') )       '
    );
    expect(fields).toEqual({name1: 1, name2: {object: {property: 1, _id: 1}}});
  });

  test('parse without spaces', () => {
    let fields = queryUtils.parseFields('name1,name2(object(property,_id))');
    expect(fields).toEqual({name1: 1, name2: {object: {property: 1, _id: 1}}});
  });

  test('parse with quotes and spaces', () => {
    let fields = queryUtils.parseFields('"name1", "name2" (  "object"("property","_id"))');
    expect(fields).toEqual({name1: 1, name2: {object: {property: 1, _id: 1}}});
  });

  test('parse bad query', () => {
    try {
      queryUtils.parseFields('name-sub,^()jkd.sdsd(object(property,_id))');
    } catch (e) {
      expect(e.name).toBe('ParseFieldsException');
    }
  });

  test('* query', () => {
    let fields = queryUtils.parseFields('*,profile(*)');
    expect(fields).toEqual({'*': 1, profile: {'*': 1}});
  });
});


describe('Formatting search parameter', () => {
  test('formatting simple text', () => {
    let search = queryUtils.formattingSimpleSearch('search string');
    expect(search).toEqual([{title: /search string/i}]);
  });

  test('parse array with $or', () => {
    let search = queryUtils.formattingSearch(
      {'series': 'single|episodes', 'origin': 'avatar'},
      {series: {}, origin: {}}
    );
    expect(search).toEqual({
      $and: [
        {
          series: {
            $in: [/single/i, /episodes/i]
          }
        },
        {origin: /avatar/i}
      ]
    });
  });

  test('parse array with $or and const', () => {
    let search = queryUtils.formattingSearch(
      {'series': 'single|episodes', 'origin': 'avatar'},
      {series: {kind: 'const'}, origin: {kind: 'const'}}
    );
    expect(search).toEqual({
      $and: [{
        series: {
          $in: ['single', 'episodes']
        }
      },
        {origin: 'avatar'}]
    });
  });

  test('if search is array', () => {
    let search = queryUtils.formattingSearch(['search1', 'search2']);
    expect(search).toEqual({});
  });

  test('multy fields', () => {
    let search = queryUtils.formattingSimpleSearch('text1|text2', {
      kind: 'const',
      fields: ['name', 'surname']
    });
    expect(search).toEqual([{
        $or: [
          {name: {$in: ['text1', 'text2']}},
          {surname: {$in: ['text1', 'text2']}}
        ]
      }]
    );
  });

  test('multy fields for object', () => {
    // поле search заменяется на name и surname
    let search = queryUtils.formattingSearch(
      {search: 'text1|text2'},
      {search: {kind: 'const', fields: ['name', 'surname']}}
    );
    expect(search).toEqual({
      $and: [{
        $or: [
          {name: {$in: ['text1', 'text2']}},
          {surname: {$in: ['text1', 'text2']}}
        ]
      }]
    });
  });

  test('Type convert', () => {

    let searchField = {
      _id: '5c2f3ed1fee590496c93779d',
      _idBad: ' bad ',
      _idNull: '  null ',

      _idAuto: '  5c2f3ed1fee590496c93779d   ',
      numberAuto: ' 300.3 ',
      numberAutoComma: '  400,44 44  ',
      dateAuto: ' 2019-12-31T21:29:43.000Z ',
      boolAuto: ' false ',
      nullAuto: '  null  ',
      stringAuto: '  string  ',
      stringAutoNotTrim: '  string  '
    };
    let search = queryUtils.formattingSearch(searchField, {
        //_id: {kind: '$eq', fields: ['_id'], type: 'ObjectId'},
        _idBad: {kind: '$eq', field: '_idBad', types: ['ObjectId', 'Number']},
        _idNull: {kind: '$eq', field: '_idNull', types: ['ObjectId', 'Null']},
        //_idAuto: {kind: '$eq', fields: ['_idAuto']},
        numberAuto: {kind: '$eq', field: 'numberAuto'},
        numberAutoComma: {kind: '$eq', field: 'numberAutoComma'},
        dateAuto: {kind: '$eq', field: 'dateAuto'},
        boolAuto: {kind: '$eq', field: 'boolAuto'},
        nullAuto: {kind: '$eq', field: 'nullAuto'},
        stringAuto: {kind: '$eq', field: 'stringAuto'},
        stringAutoNotTrim: {kind: '$eq', field: 'stringAutoNotTrim', trim: false},
      }
    );
    expect(search).toEqual({
      $and: [
        //{_id: {'$eq': '5c2f3ed1fee590496c93779d'}},
        {_idBad: {'$eq': 'bad'}},
        {_idNull: {'$eq': null}},
        //{_idAuto: {'$eq': '5c2f3ed1fee590496c93779d'}},
        {numberAuto: {'$eq': 300.3}},
        {numberAutoComma: {'$eq': 400.4444}},
        {dateAuto: {'$eq': new Date('2019-12-31T21:29:43.000Z')}},
        {boolAuto: {'$eq': false}},
        {nullAuto: {'$eq': null}},
        {stringAuto: {'$eq': 'string'}},
        {stringAutoNotTrim: {'$eq': '  string  '}}]
    });

    // ObjectID
    let search2 = queryUtils.formattingSearch(searchField, {
        _id: {kind: '$eq', fields: ['_id'], type: 'ObjectId'},
        _idAuto: {kind: '$eq', fields: ['_idAuto']},
      }
    );
    expect(search2.$and[0]._id.$eq).toBeInstanceOf(ObjectID);
    expect(search2.$and[1]._idAuto.$eq).toBeInstanceOf(ObjectID);

    console.log(/*JSON.stringify(search), */search.$and);
  });

  test('Custom keys', () => {

    let searchField = {
      objectId: ' 5c2f3ed1fee590496c93779d ',
      like: 'name|surname'
    };
    let search = queryUtils.formattingSearch(searchField, {
        objectId: {kind: 'ObjectId', fields: ['_id']},
        like: {kind: 'like', fields: ['name']},
      }
    );
    console.log(JSON.stringify(search, null, 2), search.$and);
  });
});

describe('Formatting sort parameter', () => {
  test('asc sort', () => {
    let sort = queryUtils.formattingSort('name');
    expect(sort).toEqual({name: 1});
  });

  test('desc sort', () => {
    let sort = queryUtils.formattingSort('-name');
    expect(sort).toEqual({name: -1});
  });

  test('multiple asc and desc sort', () => {
    let sort = queryUtils.formattingSort('name,-title,price,-create');
    expect(sort).toEqual({name: 1, title: -1, price: 1, create: -1});
  });

  test('multiple sort with spaces', () => {
    let sort = queryUtils.formattingSort(' name, -title  , price,-create  ');
    expect(sort).toEqual({name: 1, title: -1, price: 1, create: -1});
  });

  test('empty asc sort', () => {
    let sort = queryUtils.formattingSort('');
    expect(sort).toEqual(null);
  });

  test('empty desc sort', () => {
    let sort = queryUtils.formattingSort('-');
    expect(sort).toEqual(null);
  });
});

describe('Parse condition flex', () => {
  test('search[prop]=value', () => {
    let cond = queryUtils.parseConditionFlex('value', 'field');
    expect(cond).toEqual({field: {$eq: 'value'}});
  });
  test('search[prop]=*value', () => {
    let cond = queryUtils.parseConditionFlex('*value', 'field');
    expect(cond).toEqual({field: {$regex: /value/i}});
  });
  test('search[prop]=^value', () => {
    let cond = queryUtils.parseConditionFlex('^value', 'field');
    expect(cond).toEqual({field: {$regex: /^value/i}});
  });
  // test('search[prop]=~value', () => {
  //   let cond = queryUtils.  parseConditionFlex('~value');
  //   expect(cond).toEqual('value');
  // });

  // test('search[prop]=/value/', () => {
  //   let cond = queryUtils.  parseConditionFlex('/value/');
  //   expect(cond).toEqual(/value/);
  // });
  test('search[prop]=!value', () => {
    let cond = queryUtils.parseConditionFlex('!value', 'field');
    expect(cond).toEqual({field: {$ne: 'value'}});
  });
  test('search[prop]="value-with!~^*<>;|', () => {
    let cond = queryUtils.parseConditionFlex('"value-with!~^*<>;|', 'field');
    expect(cond).toEqual({field: {$eq: 'value-with!~^*<>;|'}});
  });
  test('search[prop]=>value', () => {
    let cond = queryUtils.parseConditionFlex('>10', 'field');
    expect(cond).toEqual({field: {$gt: 10}});
  });
  test('search[prop]=<value', () => {
    let cond = queryUtils.parseConditionFlex('<10', 'field');
    expect(cond).toEqual({field: {$lt: 10}});
  });
  test('search[prop]=>>value', () => {
    let cond = queryUtils.parseConditionFlex('>>10', 'field');
    expect(cond).toEqual({field: {$gte: 10}});
  });
  test('search[prop]=<<value', () => {
    let cond = queryUtils.parseConditionFlex('<<10', 'field');
    expect(cond).toEqual({field: {$lte: 10}});
  });

  test('search[prop]=min;max', () => {
    let cond = queryUtils.parseConditionFlex('10;20', 'field');
    expect(cond).toEqual({field: {$gte: 10, $lte: 20}});
  });
  test('search[prop]=min~max', () => {
    let cond = queryUtils.parseConditionFlex('10~20', 'field');
    expect(cond).toEqual({field: {$gt: 10, $lt: 20}});
  });
  test('search[prop]=!min;max', () => {
    let cond = queryUtils.parseConditionFlex('!10;20', 'field');
    expect(cond).toEqual({field: {$lt: 10, $gt: 20}});
  });
  test('search[prop]=!min~max', () => {
    let cond = queryUtils.parseConditionFlex('!10~20', 'field');
    expect(cond).toEqual({field: {$lte: 10, $gte: 20}});
  });
  test('search[prop]=null', () => {
    let cond = queryUtils.parseConditionFlex('null', 'field');
    expect(cond).toEqual({field: {$exists: false}});
  });
  test('search[prop]=exp1|exp2', () => {
    let cond = queryUtils.parseConditionFlex('exp1|exp2', 'field');
    expect(cond).toEqual({$or: [{field: {$eq: 'exp1'}}, {field: {$eq: 'exp2'}}]});
  });
  test('search[prop]=>exp1|!exp2', () => {
    let cond = queryUtils.parseConditionFlex('>exp1|!exp2', 'field');
    expect(cond).toEqual({$or: [{field: {$gt: 'exp1'}}, {field: {$ne: 'exp2'}}]});
  });

  test('search[prop]=exp1&exp2', () => {
    let cond = queryUtils.parseConditionFlex('exp1+exp2', 'field');
    expect(cond).toEqual({$and: [{field: {$eq: 'exp1'}}, {field: {$eq: 'exp2'}}]});
  });

  test('search[prop]=!exp1&!exp2', () => {
    let cond = queryUtils.parseConditionFlex('!exp1+!exp2', 'field');
    expect(cond).toEqual({$and: [{field: {$ne: 'exp1'}}, {field: {$ne: 'exp2'}}]});
  });

  test('search[prop]=^exp1&!exp2', () => {
    let cond = queryUtils.parseConditionFlex('^exp1+!exp2', 'field');
    expect(cond).toEqual({$and: [{field: {$regex: /^exp1/i}}, {field: {$ne: 'exp2'}}]});
  });
});


describe('Make filter', () => {

  test('Simple field', () => {
    let search = queryUtils.makeFilter({'series': 'single', 'origin': '10'},
      {
        series: {},
        origin: {field: 'correct'}
      }
    );
    expect(search).toEqual({
      $and: [
        {series: 'single'},
        {correct: 10}
      ]
    });
  });

  test('Value and function', () => {
    let search = queryUtils.makeFilter({f2: '10'},
      {
        f1: {value: 10, cond: 'eq'},
        f2: (value, key) => ({[key]: queryUtils.type(value)})
      }
    );
    expect(search).toEqual({
      $and: [
        {f1: 10},
        {f2: 10}
      ]
    });
  });

  test('Multiple fields', () => {
    let search = queryUtils.makeFilter({f1: '20', f2: '10'},
      {
        f0: {fields: ['a0', 'b0'], cond: 'eq', join: '$not', default: 10},
        f1: {fields: ['a1', 'b1'], cond: 'eq', join: '$and'},
        f2: {fields: ['a2', 'b2'], cond: 'eq', join: '$or'},
        f3: {fields: ['a3', 'b3'], cond: 'eq', default: 30}
      }
    );
    expect(search).toEqual({
      $and: [
        {$not: [{a0: 10}, {b0: 10}]},
        {$and: [{a1: 20}, {b1: 20}]},
        {$or: [{a2: 10}, {b2: 10}]},
        {$or: [{a3: 30}, {b3: 30}]}
      ]
    });
  });

  test('Flex fields', () => {
    let search = queryUtils.makeFilter({f1: '!10', f2: '>>20', f3: '"!>10', f4: '1~2|4;8'},
      {
        f1: {cond: 'flex'},
        f2: {},
        f3: {cond: 'flex'},
        f4: {},
        f5: {cond: 'flex'},
        f6: {},
      }
    );
    expect(search).toEqual({
      $and: [
        {f1: {$ne: 10}},
        {f2: {$gte: 20}},
        {f3: '!>10'},
        {$or: [{f4: {$gt: 1, $lt: 2}}, {f4: {$gte: 4, $lte: 8}}]},
      ]
    });
  });

  test('Fulltext search', () => {
    let search = queryUtils.makeFilter({f1: 'search1', f2: 'search2'},
      {
        f1: {cond: 'fulltext'},
        f2: {cond: 'fulltext', lang: 'en'},
      }
    );
    expect(search).toEqual({
      $and: [
        {$text: {$search: 'search1'}},
        {$text: {$search: 'search2'}},
      ]
    });
  });
});
