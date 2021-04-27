const date = require('./index');
const {utils} = require('merge-change');
const Services = require('../../../services');

describe('schema-utils.date', () => {
  let s = {};

  beforeAll(async () => {
    s.services = new Services().configure(['configs.start.js', 'configs.tests.js']);
    s.spec = await s.services.getSpec();
    s.spec.set('#/components/schemas/model.withDate', {
      type: 'object',
      properties: {
        date: date({empty: true}),
        dateList: {type: 'array', items: date({})},
        sub: {
          type: 'object',
          properties: {
            inner: {
              type: 'object',
              properties: {
                deeperList: {type: 'array', items: date({})},
              },
            },
          },
        },
      },
    });
  });

  test('string date', async () => {
    const body = {
      date: '2020-01-07T13:25:00.008Z',
      dateList: [
        '2020-01-07T13:25:00.008Z',
        '2020-01-07T13:25:00.008Z',
      ],
      sub: {
        inner: {
          deeperList: [
            '1020-01-07T13:25:00.008Z',
          ],
        },
      },
    };
    const result = await s.spec.validate('#/components/schemas/model.withDate', body);
    //console.log(result);
    expect(result).toEqual({
      date: new Date('2020-01-07T13:25:00.008Z'),
      dateList: [
        new Date('2020-01-07T13:25:00.008Z'),
        new Date('2020-01-07T13:25:00.008Z'),
      ],
      sub: {
        inner: {
          deeperList: [
            new Date('1020-01-07T13:25:00.008Z'),
          ],
        },
      },
    });
    expect(utils.type(result.date)).toBe('Date');
    expect(utils.type(result.dateList[1])).toBe('Date');
  });

  test('object date', async () => {
    const body = {
      date: new Date('2020-01-07T13:25:00.008Z'),
      dateList: [
        new Date('2020-01-07T13:25:00.008Z'),
        new Date('2020-01-07T13:25:00.008Z')],
    };
    const result = await s.spec.validate('#/components/schemas/model.withDate', body);
    //console.log(result);
    expect(result).toEqual({
      date: new Date('2020-01-07T13:25:00.008Z'),
      dateList: [
        new Date('2020-01-07T13:25:00.008Z'),
        new Date('2020-01-07T13:25:00.008Z')],
    });
    expect(utils.type(result.date)).toBe('Date');
    expect(utils.type(result.dateList[1])).toBe('Date');
  });

  test('empty date', async () => {
    const body = {
      date: '',
    };
    const result = await s.spec.validate('#/components/schemas/model.withDate', body);
    //console.log(result);
    expect(result).toEqual({
      date: null,
    });
  });

  test('null date', async () => {
    const body = {
      date: null,
    };
    const result = await s.spec.validate('#/components/schemas/model.withDate', body);
    //console.log(result);
    expect(result).toEqual({
      date: null,
    });
  });

  test('default date', async () => {
    s.spec.set('#/components/schemas/model.withDateDefault', {
      type: 'object',
      properties: {
        date1: date({defaults: 'null', empty: true}), // '' или null в качестве значения по умолчанию игнорится валидаторм :(
        date2: date({defaults: '2020-01-07T13:25:00.008Z'}),
        date3: date({defaults: new Date('2020-01-07T13:25:00.008Z')}),
      },
    });
    const body = {};
    const result = await s.spec.validate('#/components/schemas/model.withDateDefault', body);
    expect(result).toEqual({
      date1: null,
      date2: new Date('2020-01-07T13:25:00.008Z'),
      date3: new Date('2020-01-07T13:25:00.008Z')
    });
  });
});
