'use strict';

const EventHandler = require('@scola/events');

class Model extends EventHandler {
  constructor(database) {
    super();

    this.database = database;
    this.messenger = null;

    this.data = null;
    this.result = null;

    this.events = new Map();
  }

  getName() {
    throw new Error('not_implemented');
  }

  getQualifiedName(postfix) {
    return this.getName() + (postfix ? '.' + postfix : '');
  }

  getMessenger() {
    return this.messenger;
  }

  setMessenger(messenger) {
    this.messenger = messenger;
    return this;
  }

  addHandlers() {
    this.bindListener(
      this.getQualifiedName('change'),
      this.messenger,
      this.handleChange
    );

    return this;
  }

  removeHandlers() {
    this.unbindListener(
      this.getQualifiedName('change'),
      this.messenger,
      this.handleChange
    );

    return this;
  }

  destroy() {
    this.removeHandlers();
    this.messenger.deleteModel(this);

    return this;
  }

  bind(event) {
    if (this.events.size === 0) {
      this.addHandlers();
    }

    this.events.set(event.connection.getId(), event);
    return this;
  }

  unbind(event) {
    this.events.delete(event.connection.getId());

    if (this.events.size === 0) {
      this.destroy();
    }

    return this;
  }

  read(data, event) {
    if (data.bind === true) {
      this.bind(event);
    } else if (data.bind === false) {
      this.unbind(event);
    }

    if (!this.data) {
      this.setData(data);
      this.messenger.setModel(this);
    }

    if (!this.result) {
      return this
        .readDatabase(this.data.name, this.data, this.handleRead, event);
    }

    this.send(event, 'read', this.toObject());

    return Promise.resolve(this);
  }

  write(data, event) {
    return this
      .writeDatabase(data.name, data, this.handleWrite, event);
  }

  delete(data, event) {
    return this
      .writeDatabase(data.name, data, this.handleDelete, event);
  }

  handleRead(data, event, result) {
    this
      .setResult(result)
      .send(event, 'read', this.toObject());
  }

  handleWrite(data, event, result) {
    return this
      .assignResult(result)
      .send(event, 'write')
      .notifyModels('write', data);
  }

  handleDelete(data, event) {
    return this
      .destroy()
      .send(event, 'delete')
      .notifyModels('delete', data);
  }

  handleChange(event) {
    return this
      .readDatabase(this.data.name, this.data, this.handleChangeRead, event);
  }

  handleChangeRead(data, event, result) {
    return this
      .setResult(result)
      .notifyConnections('read', event.reason);
  }

  readDatabase(query, data, handler, event) {
    return this.database.read(
      this.getQualifiedName(query),
      data
    ).then(handler.bind(this, data, event));
  }

  writeDatabase(query, data, handler, event) {
    return this.database.write(
      this.getQualifiedName(query),
      data
    ).then(handler.bind(this, data, event));
  }

  notifyModels(method, reason) {
    this.messenger.emit(this.getQualifiedName('change'), {
      method,
      model: this,
        reason
    });

    return this;
  }

  notifyConnections(method, reason) {
    if (this.events.size === 0) {
      return this;
    }

    const object = this.toObject();
    object.reason = reason;

    this.events.forEach((event) => {
      this.messenger.send(event, method, object);
    });

    return this;
  }

  send(event, method, data) {
    this.messenger.send(event, method, data);
    return this;
  }

  setResult(result) {
    this.result = result;
    return this;
  }

  assignResult(result) {
    this.result = Object.assign(this.result || {}, result);
    return this;
  }

  setData(data) {
    if (data.id) {
      this.data = {
        bind: data.bind || false,
        name: data.name,
        id: data.id
      };
    } else {
      this.data = {
        bind: data.bind || false,
        name: data.name,
        filter: data.filter || {},
        order: data.order || {}
      };
    }

    return this;
  }

  getIdentifier() {
    if (!this.data) {
      return null;
    }

    let data = {};

    if (this.data.id) {
      data = {
        id: this.data.id
      };
    } else {
      data = {
        filter: this.data.filter,
        order: this.data.order
      };
    }

    return this.getQualifiedName(JSON.stringify(data));
  }

  toObject() {
    return {
      name: this.data.name,
      result: this.result
    };
  }
}

module.exports = Model;
