'use strict';

const DI = require('@scola/di');

const Dispatcher = require('./lib/dispatcher');
const Messenger = require('./lib/messenger');
const Model = require('./lib/model');

class Module extends DI.Module {
  configure() {
    this.inject(Messenger).with(
      this.singleton(Dispatcher)
    );
  }
}

module.exports = {
  Dispatcher,
  Messenger,
  Model,
  Module
};
