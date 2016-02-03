'use strict';

class Dispatcher {
  constructor(models, validator) {
    this.models = models;
    this.validator = validator;
  }

  get(name) {
    if (!this.models[name]) {
      throw new Error('@scola.model.not-found');
    }

    return this.models[name]
      .get()
      .setValidator(this.validator);
  }
}

module.exports = Dispatcher;
