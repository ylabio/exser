module.exports = {
  //title: 'UID',
  //description: 'Шестнадцатеричная строка из 24 символов',
  type: 'string',
  anyOf: [
    {pattern: '^[0-9a-fA-F-]{36}$'},
    {type: 'string', const: ''},
  ],
  errors: {
    pattern: 'Incorrect identifier format'
  },
};
