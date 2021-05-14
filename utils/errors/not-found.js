module.exports = class NotFound extends require('./custom') {
  constructor(data = {}, message = 'Not found') {
    super(data, message, 404, '000');
  }
};
