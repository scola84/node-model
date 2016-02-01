'use strict';

const EventHandler = require('@scola/events');

class Model extends EventHandler {
  constructor(database) {
    super();

    this.database = database;
    this.messenger = null;
    this.validator = null;

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

  getValidator() {
    return this.validator;
  }

  setValidator(validator) {
    this.validator = validator;
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
    data = this.authorizeRead(data, event);

    if (data.error) {
      throw data.error;
    }

    data = this.validateRead(data, event);

    if (data.error) {
      throw data.error;
    }

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
      return this.database.read(
        this.getQualifiedName(this.data.name),
        this.data
      ).then(this.handleRead.bind(this, this.data, event));
    }

    this.send(event, 'read', this.toObject());

    return Promise.resolve(this);
  }

  write(data, event) {
    data = this.authorizeWrite(data, event);

    if (data.error) {
      throw data.error;
    }

    data = this.validateWrite(data, event);

    if (data.error) {
      throw data.error;
    }

    return this.database.write(
      this.getQualifiedName(data.name),
      data
    ).then(this.handleWrite.bind(this, data, event));
  }

  delete(data, event) {
    data = this.authorizeDelete(data, event);

    if (data.error) {
      throw data.error;
    }

    data = this.validateDelete(data, event);

    if (data.error) {
      throw data.error;
    }

    return this.database.write(
      this.getQualifiedName(data.name),
      data
    ).then(this.handleDelete.bind(this, data, event));
  }

  authorizeRead(data) {
    return data;
  }

  validateRead(data) {
    return data;
  }

  handleRead(data, event, result) {
    this
      .setResult(result)
      .send(event, 'read', this.toObject());
  }

  authorizeWrite(data) {
    return data;
  }

  validateWrite(data) {
    return data;
  }

  handleWrite(data, event, result) {
    return this
      .assignResult(result)
      .send(event, 'write')
      .notifyModels('write', data);
  }

  authorizeDelete(data) {
    return data;
  }

  validateDelete(data) {
    return data;
  }

  handleDelete(data, event) {
    return this
      .destroy()
      .send(event, 'delete')
      .notifyModels('delete', data);
  }

  handleChange(event) {
    return this.database.read(
      this.getQualifiedName(this.data.name),
      this.data
    ).then(this.handleChangeRead.bind(this, this.data, event));
  }

  handleChangeRead(data, event, result) {
    return this
      .setResult(result)
      .notifyConnections('read', event.reason);
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
      this.send(event, method, object);
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
      return this.setItemData(data);
    }

    return this.setListData(data);
  }

  setItemData(data) {
    this.data = {
      bind: data.bind || false,
      name: data.name,
      id: data.id
    };

    return this;
  }

  setListData(data) {
    this.data = {
      bind: data.bind || false,
      name: data.name,
      filter: data.filter || {},
      order: data.order || {}
    };

    return this;
  }

  getIdentifier() {
    if (!this.data) {
      return null;
    }

    let data = {};

    if (this.data.id) {
      data = this.getItemIdentifier();
    } else {
      data = this.getListIdentifier();
    }

    return this.getQualifiedName(JSON.stringify(data));
  }

  getItemIdentifier() {
    return {
      id: this.data.id
    };
  }

  getListIdentifier(){
    return {
      filter: this.data.filter,
      order: this.data.order
    };
  }

  toObject() {
    return {
      name: this.data.name,
      result: this.result
    };
  }
}

module.exports = Model;
