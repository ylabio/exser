module.exports = {
  type: 'string',
  //title: 'ObjectId',
  //description: 'Шестнадцатеричная строка из 24 символов',
  anyOf: [
    {pattern: '^[0-9a-fA-F]{24}$', errors: {pattern: false}},
    {const: '', errors: {const: false}}
  ],
  errors: {
    anyOf: {message: 'Incorrect identifier format', rule: 'format'}
  },
};
