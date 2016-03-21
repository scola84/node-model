'use strict';

const scolaAssign = require('@scola/assign');

class Dispatcher {
  constructor(models, validator) {
    this.models = models;
    this.validator = validator;
  }

  addModels(models) {
    scolaAssign(this.models, models);
    return this;
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
