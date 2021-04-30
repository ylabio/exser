const Services = require('../index');
const mc = require('merge-change');

describe('Session', () => {

  let s = {};

  beforeAll(async () => {
    s.services = new Services().configure(['configs.start.js', 'configs.tests.js']);
    s.sessions = await s.services.getSessions();
  });

  test('session to JSON', async () => {
    const session = s.sessions.create();
    const plain = session.toJSON();
    expect(mc.utils.type(plain)).toBe('Object');
    expect(plain).toMatchObject({
      code: session.code,
      date: session.date,
      step: 1,
      user: null,
      lang: 'ru'
    });
  });

});