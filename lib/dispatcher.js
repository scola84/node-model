'use strict';

const lodashGet = require('lodash.get');
const lodashHas = require('lodash.has');

class Dispatcher {
  constructor(models) {
    this.models = models;
  }

  get(name) {
    if (!lodashHas(this.models, name)) {
      throw new Error('@scola.model.not-found');
    }

    return lodashGet(this.models, name).get();
  }
}

module.exports = Dispatcher;
