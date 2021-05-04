module.exports = class BadRequest extends require('./custom') {
  constructor(data = {}, message = 'Bad request params', code = '200') {
    super(data, message, 400, code);
  }
};
