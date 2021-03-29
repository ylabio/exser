const arrayUtils = require('./index.js');

describe('arrayUtils.parseCommands', () => {

  test('empty args', () => {
    let result = arrayUtils.parseCommands([]);
    expect(result).toEqual([]);
  });

  test('empty args with default', () => {
    let result = arrayUtils.parseCommands([], 'rest-api');
    expect(result).toEqual([
      {name: 'rest-api', params: {}},
    ]);
  });

  test('type conventions', () => {
    let result = arrayUtils.parseCommands('service=dump --bool number=10 list[]=1,2,3'.split(' '));
    expect(result).toEqual([
        {
          name: '',
          params: {
            service: 'dump',
            bool: true,
            number: 10,
            list: [1, 2, 3],
          },
        },
      ],
    );
  });

  test('without command', () => {
    let result = arrayUtils.parseCommands('service[]=dump,rest --bool num=10'.split(' '));
    expect(result).toEqual([
      {
        name: '',
        params: {
          service: ['dump', 'rest'],
          bool: true,
          num: 10,
        },
      },

    ]);
  });

  test('two groups', () => {
    let result = arrayUtils.parseCommands('dump --bool first x=10 second m=20'.split(' '));
    expect(result).toEqual([
      {name: 'dump', params: {bool: true}},
      {name: 'first', params: {x: 10}},
      {name: 'second', params: {m: 20}},
    ]);
  });

  test('two groups multi', () => {
    let result = arrayUtils.parseCommands('dump --bool first --x=10 rest second --m=20'.split(' '));
    expect(result).toEqual([
      {name: 'dump', params: {bool: true}},
      {name: 'first', params: {x: 10}},
      {name: 'rest', params: {}},
      {name: 'second', params: {m: 20}},
    ]);
  });
});

