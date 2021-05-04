module.exports = class ValidationUnique extends require('./validation') {
  constructor(data = {}, message = 'Not unique data', code = '100') {
    super(data, message, 400, code);
  }


};
