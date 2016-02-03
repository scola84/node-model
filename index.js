'use strict';

const DI = require('@scola/di');

const Abstract = require('./lib/abstract');
const Dispatcher = require('./lib/dispatcher');
const Messenger = require('./lib/messenger');
const Database = require('./lib/database');

class Module extends DI.Module {
  configure() {
    this.inject(Messenger).with(
      this.singleton(Dispatcher)
    );
  }
}

module.exports = {
  Abstract,
  Database,
  Dispatcher,
  Messenger,
  Module
};
