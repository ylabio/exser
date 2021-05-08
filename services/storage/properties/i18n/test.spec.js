const Services = require('./../../../index');
const I18nProperty = require('./index');
const acceptLanguage = require('accept-language');
const languages = require('./languages');

describe('Spec', () => {
  let s = {};
  let data = {};

  beforeAll(async () => {
    s.services = new Services().configure(['configs.start.js', 'configs.tests.js']);

  });

  test('get lang', async () => {
    const accept = acceptLanguage.create();
    accept.languages(Object.keys(languages))
    expect(accept.get('en-US')).toEqual('en-US');
    expect(accept.get('ru')).toEqual('ru');
  });

  test('get lang 2', async () => {
    const accept = acceptLanguage.create();
    accept.languages(['ru', 'en'])
    expect(accept.get('en-US')).toEqual('en');
    expect(accept.get('ru')).toEqual('ru');
    expect(accept.get('gb')).toEqual('ru');
  });
});