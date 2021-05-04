module.exports = class Custom extends Error {
  constructor(data = {}, message = 'Unknown error', status = 500, code = '000') {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.data = data;
  }

  toJSON() {
    return {
      name: this.name,
      status: this.status,
      code: this.code,
      message: this.message,
      data: this.data
    };
  }

  toString() {
    return `${this.name} [${this.status}.${this.code}] ${this.message}`;
  }
};
