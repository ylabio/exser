class Access {
  async init(config, services) {
    this.config = config;
    this.services = services;
    this.accessService = this.services.get(this.config.accessService);
    return this;
  }

  async isAllow(params) {
    if (this.config.access[params.action]) {
      // TODO...
    }
    if (!this.accessService) {
      return true;
    }
    return this.accessService.isAllow(params);
  }

  getAccess() {

  }
}

module.exports = Access;
