const objectUtils = require('./index.js');
const ObjectID = require('mongodb').ObjectID;
const mc = require('merge-change');
const I18nProperty = require('./../../services/storage/properties/i18n');

describe('objectUtils', () => {

  test('convertToOperation №1', () => {
    let sets = objectUtils.toFlat({
      name: 1,
      profile: {
        surname: 'x',
        avatar: {
          code: 1,
          url: 'xxx',
          list: [
            {a: 0},
            1,
            null,
          ],
          i18n: new I18nProperty({x: undefined, ru: 'RU', en: 'EN'}),
        },
      },
      date: new Date('2021-01-26T23:41:59.433Z'),
      _id: new ObjectID('6010a8c75b9b393070e42e68'),
      parent: {_id: 'null'},
      i18n: new I18nProperty({ru: 'RU', en: 'EN'}),
    });

    expect(mc.utils.plain(sets)).toEqual({
      'name': 1,
      'profile.surname': 'x',
      'profile.avatar.code': 1,
      'profile.avatar.url': 'xxx',
      'profile.avatar.list': [{a: 0}, 1, null],
      'profile.avatar.i18n.en': 'EN',
      'profile.avatar.i18n.ru': 'RU',
      'date': '2021-01-26T23:41:59.433Z',
      '_id': '6010a8c75b9b393070e42e68',
      'parent._id': 'null',
      'i18n.en': 'EN',
      'i18n.ru': 'RU',
    });
  });

});

