module.exports = class NotFound extends require('./custom') {
  constructor(data = {}, message = 'Not found', code = '000') {
    // if (Object.keys(data).length){
    //   data = {cond: data};
    // }
    data = {};
    super(data, message, 404, code);
  }
};
