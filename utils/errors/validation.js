module.exports = class Validation extends require('./custom') {
  constructor(data = {}, message = 'Incorrect data', code = '000') {
    if (data) {
      data = {issues: Array.isArray(data) ? data : [data]};
    }
    super(data, message, 400, code);
  }
};
