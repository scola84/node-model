'use strict';

const EventHandler = require('@scola/events');

class Model extends EventHandler {
  constructor(name, database) {
    super();

    this.name = name;
    this.database = database;
    this.messenger = null;
    this.data = null;
    this.result = [];

    this.events = new Map();
  }

  getMessenger() {
    return this.messenger;
  }

  setMessenger(messenger) {
    this.messenger = messenger;
    this.addHandlers();

    return this;
  }

  addHandlers() {
    this.bindListener(
      this.name + '.change',
      this.messenger,
      this.handleChange
    );
  }

  removeHandlers() {
    this.unbindListener(
      this.name + '.change',
      this.messenger,
      this.handleChange
    );
  }

  destroy() {
    console.log('destroy');
    this.removeHandlers();
    return this;
  }

  bind(event) {
    this.events.set(event.connection.getId(), event);
    return this;
  }

  unbind(event) {
    this.events.delete(event.connection.getId());
    return this;
  }

  isBound(event) {
    return this.events.has(event.connection.getId());
  }

  read(name, data, handler) {
    return this.database.read(
      this.name + '.' + name,
      data
    ).then(handler.bind(this));
  }

  write(name, data, handler) {
    return this.database.write(
      this.name + '.' + name,
      data
    ).then(handler.bind(this));
  }

  notifyModels(method) {
    this.messenger.emit(this.name + '.change', {
      method,
      model: this
    });

    return this;
  }

  notifyConnections(method) {
    const object = this.toObject();

    this.events.forEach((event) => {
      this.messenger.send(event, method, object);
    });

    return this;
  }

  select(data) {
    if (!data) {
      console.log('reselecting', this.data);
      return this.read(this.data.name, this.data, this.handleSelect);
    }

    if (!this.data) {
      return this
        .setData(data)
        .read(this.data.name, this.data, this.handleSelect);
    }

    return Promise.resolve(this);
  }

  handleSelect(result) {
    this.result = result;

    return this
      .notifyConnections('select');
  }

  insert(data) {
    return this.write(data.name, data, this.handleInsert);
  }

  handleInsert(result) {
    return this
      .setItem(result)
      .setData(result)
      .notifyConnections('insert')
      .notifyModels('insert');
  }

  update(data) {
    return this.write(data.name, data, this.handleUpdate);
  }

  handleUpdate(result) {
    return this
      .setItem(result)
      .setData(result)
      .notifyConnections('update')
      .notifyModels('update');
  }

  delete(data) {
    return this.write(data.name, data, this.handleDelete);
  }

  handleDelete() {
    return this
      .destroy()
      .notifyConnections('delete')
      .notifyModels('delete');
  }

  handleChange(event) {
    if (event.model === this) {
      return;
    }

    this.select();
  }

  setItem(result) {
    this.result[0] = Object.assign(
      this.result[0] || {},
      result
    );

    return this;
  }

  setData(data) {
    if (data.id) {
      this.data = {
        id: data.id
      };
    } else {
      this.data = {
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
      data = this.data;
    } else {
      data = {
        filter: this.data.filter,
        order: this.data.order
      };
    }

    return this.name + '.' + JSON.stringify(data);
  }

  toObject() {
    return {
      result: this.result
    };
  }
}

module.exports = Model;
