module.exports = class Unauthorized extends require('./custom') {
  constructor(data = {}, message = 'Unauthorized request', code = '000') {
    super(data, message, 401, code);
  }
};
