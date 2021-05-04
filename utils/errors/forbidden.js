module.exports = class Forbidden extends require('./custom') {
  constructor(data = {}, message = 'Access forbidden', code = '000') {
    super(data, message, 403, code);
  }
};
