'use strict';

const EventHandler = require('@scola/events');

class AbstractModel extends EventHandler {
  constructor() {
    super();

    this.collection = null;
    this.database = null;
    this.name = null;

    this.events = new Map();
  }

  getCollection() {
    return this.collection;
  }

  setCollection(collection) {
    this.collection = collection;
    return this;
  }

  getDatabase() {
    return this.database;
  }

  setDatabase(database) {
    this.database = database;
    return this;
  }

  getName() {
    return this.name;
  }

  setName(name) {
    this.name = name;
    return this;
  }

  register(event) {
    this.events.set(event.connection.getId(), event);
    return this;
  }

  unregister(event) {
    this.events.delete(event.connection.getId());

    if (this.events.size === 0) {
      this.destroy();
    }

    return this;
  }

  notify(method, event) {
    this.collection.send(event, method, this.toObject());
    return this;
  }

  notifyAll(method) {
    const object = this.toObject();

    this.events.forEach((event) => {
      this.collection.send(event, method, object);
    });

    return this;
  }

  query(name, data, handler) {
    return this.database.query(this.name + '.' + name, data).then(handler);
  }

  toObject() {
    return {};
  }
}

module.exports = AbstractModel;
