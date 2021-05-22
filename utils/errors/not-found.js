module.exports = class NotFound extends require('./custom') {
  constructor(data = {}, message = 'Not found', code = '000') {
    super(data, message, 404, code);
  }
};
