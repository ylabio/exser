class Access {
  async init(config, services) {
    this.config = config;
    this.services = services;
    this.access = this.config.extension ? this.services.get(this.config.extension) : false;
    this.isAllowDefault = this.config.access.default === 'allow';
    return this;
  }

  get isDisabled() {
    return !this.access;
  }

  isAllow({action = '', session = {}, object = null, access = undefined}) {
    if (this.config.actions[action]) {
      if (this.config.actions[action].allow === false) {
        return false;
      }
      if (this.config.actions[action].auth === false) {
        return true;
      }
    }

    if (this.isDisabled) {
      return this.isAllowDefault;
    }

    return this.access.isAllow({action, session, object, access});
  }

  makeFilterQuery({action = '', session = {}}) {
    this.access.makeFilterQuery({action, session});
  }

  getAccess({action = '', session = {}, access = undefined}) {
    this.access.getAccess({action, session, access});
  }

  getAccessDescription({action = ''}) {
    this.access.getAccessDescription({action});
  }
}

module.exports = Access;
