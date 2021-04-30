const {schemaUtils} = require('../../utils');
const Services = require('../index');
const {ObjectID} = require("../../exser");

describe('Access', () => {
  let s = {};

  beforeAll(async () => {
    s.services = new Services().configure(['configs.start.js', 'configs.tests.js']);
    s.sessions = await s.services.getSessions();
    s.access = await s.services.getAccess({
      acl: [
        {
          key: 1,
          session: {'user.role.name': 'admin'},
          actions: {
            '*': true,
            '*.*': true
          }
        },
        {
          key: 2,
          session: {},// Любая сессия
          actions: {
            'test.createOne': false,
            'test.updateOne': true,
            'test.findOne': {
              objects: [
                {_key: "test123"}, // Объект по ключу
                {'author.name': '$session.user.name'} // Объекты, автор которых в сессии
              ],
            },
            'test.*': true,
            '*.*': false
          },
        }
      ]
    });
  });

  test('findAclItemsBySession - empty session', () => {
    const session = s.sessions.create();
    const result = s.access.findAclItemsBySession(session);
    expect(result).toMatchObject([{key: 2}]);
    expect(result).not.toMatchObject([{key: 1}]);
  });

  test('findAclItemsBySession - user session', () => {
    const session = s.sessions.create();
    session.user = {role: {name: 'admin'}};
    const result = s.access.findAclItemsBySession(session);
    expect(result).toMatchObject([{key: 1}, {key: 2}]);
  });

  test('findAclItemsBySession - bad user session', () => {
    const session = s.sessions.create();
    session.user = {role: {name: 'some-name'}};
    const result = s.access.findAclItemsBySession(session);
    expect(result).toMatchObject([{key: 2}]);
    expect(result).not.toMatchObject([{key: 1}]);
  });

  test('findAclItemsByAction', () => {
    const session = s.sessions.create();
    session.user = {role: {name: 'some-name'}};
    const result = s.access.findAclItemsByAction('test.findOne');
    expect(result).toMatchObject([{key: 1, match: '*.*'}, {key: 2, match: 'test.findOne'}]);
  })

  test('isAllow - guest (one acl)', () => {
    const session = s.sessions.create();
    expect(s.access.isAllow({action: 'test.createOne', session})).toBe(false);
    expect(s.access.isAllow({action: 'test.updateOne', session})).toBe(true);
    expect(s.access.isAllow({action: 'test.findOne', session})).toBe(true);
    expect(s.access.isAllow({action: 'test.findOne', session, object: {_key: 'xyz'}})).toBe(false);
    expect(s.access.isAllow({
      action: 'test.findOne',
      session,
      object: {_key: 'test123'}
    })).toBe(true);
    expect(s.access.isAllow({
      action: 'test.findOne',
      session,
      object: {author: {name: 'user'}}
    })).toBe(false);
  });

  test('isAllow - test', () => {
    let details = {};
    const session = s.sessions.create();
    session.user = {role: {name: 'user'}};
    expect(s.access.isAllow({action: 'test.createOne', session, details})).toBe(false);
    console.log(details);
  });

  test('isAllow - admin (two acl)', () => {
    const session = s.sessions.create();
    session.user = {role: {name: 'admin'}};
    expect(s.access.isAllow({action: 'test.createOne', session})).toBe(true);
    expect(s.access.isAllow({action: 'test.updateOne', session})).toBe(true);
    expect(s.access.isAllow({action: 'test.findOne', session})).toBe(true);
    expect(s.access.isAllow({action: 'test.findOne', session, object: {_key: 'xyz'}})).toBe(true);
    expect(s.access.isAllow({
      action: 'test.findOne',
      session,
      object: {_key: 'test123'}
    })).toBe(true);
  });

  test('isAllow - user name from session', () => {
    const session = s.sessions.create();
    session.user = {name: 'user'};
    expect(s.access.isAllow({
      action: 'test.findOne',
      session,
      object: {author: {name: 'user'}}
    })).toBe(true);
    expect(s.access.isAllow({
      action: 'test.findOne',
      session,
      object: {author: {name: 'user2'}}
    })).toBe(false);
  });


  test('getAccess', () => {
    const session = s.sessions.create();
    expect(s.access.getAccess({action: 'test.updateOne', session})).toMatchObject([true]);
    expect(s.access.getAccess({
      action: 'test.findOne',
      session
    })).toMatchObject([{objects: [{_key: "test123"}, {'author.name': '$session.user.name'}]}]);
  });

  test('getAccess admin', () => {
    const session = s.sessions.create();
    session.user = {role: {name: 'admin'}};
    expect(s.access.getAccess({action: 'test.updateOne', session})).toMatchObject([true, true]);
    expect(s.access.getAccess({
      action: 'test.findOne',
      session
    })).toMatchObject([true, {objects: [{_key: "test123"}, {'author.name': '$session.user.name'}]}]);
    expect(s.access.getAccess({
      action: 'test.someAction',
      session
    })).toMatchObject([true, true]);
  });

  test('makeFilterQuery admin', () => {
    const session = s.sessions.create();
    session.user = {role: {name: 'admin'}};
    const result = s.access.makeFilterQuery({action: 'test.findOne', session});
    expect(result).toBe(true);
  });

  test('makeFilterQuery guest', () => {
    const session = s.sessions.create();
    const result = s.access.makeFilterQuery({action: 'test.findOne', session});
    expect(result).toMatchObject({ '$or': [ { _key: 'test123' } ] });
  });

  test('makeFilterQuery guest forbidden', () => {
    const session = s.sessions.create();
    const result = s.access.makeFilterQuery({action: 'test.createOne', session});
    expect(result).toBe(false);
  });

  test('makeFilterQuery user', () => {
    const session = s.sessions.create();
    session.user = {_id: new ObjectID(), name: 'Vova', role: {name: 'user'}};
    const result = s.access.makeFilterQuery({action: 'test.findOne', session});
    expect(result).toMatchObject({ '$or': [ { _key: 'test123' }, { 'author.name': 'Vova' } ] });
  });
});
