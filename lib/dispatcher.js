'use strict';

const lodashGet = require('lodash.get');
const lodashHas = require('lodash.has');

class Dispatcher {
  constructor(models, validator) {
    this.models = models;
    this.validator = validator;
  }

  get(name) {
    if (!lodashHas(this.models, name)) {
      throw new Error('@scola.model.not-found');
    }

    return lodashGet(this.models, name)
      .get()
      .setValidator(this.validator);
  }
}

module.exports = Dispatcher;
