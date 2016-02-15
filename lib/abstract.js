'use strict';

const EventHandler = require('@scola/events');

class AbstractModel extends EventHandler {
  constructor() {
    super();

    this.messenger = null;
    this.validator = null;

    this.meta = {};
    this.values = {};

    this.connections = new Map();
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
    this.addHandlers();

    return this;
  }

  getValidator() {
    return this.validator;
  }

  setValidator(validator) {
    this.validator = validator;
    return this;
  }

  getMeta() {
    return this.meta;
  }

  setMeta(meta) {
    this.meta = meta;
    return this;
  }

  destroy() {
    this.removeHandlers();
    this.messenger.deleteModel(this);

    return this;
  }

  addHandlers() {
    this.bindListener(
      this.getQualifiedName('change'),
      this.messenger,
      this.change
    );

    return this;
  }

  removeHandlers() {
    this.unbindListener(
      this.getQualifiedName('change'),
      this.messenger,
      this.change
    );

    return this;
  }

  bind(event) {
    this.connections.set(
      event.connection.getId(),
      event.message.getHead()
    );

    return this;
  }

  unbind(event) {
    this.connections.delete(event.connection.getId());

    if (this.connections.size === 0) {
      this.destroy();
    }

    return this;
  }

  authorize() {}

  validate() {}

  select() {
    throw new Error('not_implemented');
  }

  insert() {
    throw new Error('not_implemented');
  }

  update() {
    throw new Error('not_implemented');
  }

  delete() {
    throw new Error('not_implemented');
  }

  change() {}

  get(name) {
    return this.values[name];
  }

  set(name, value) {
    this.values[name] = value;
    return this;
  }

  getAll() {
    return this.values;
  }

  setAll(values) {
    Object.assign(this.values, values);
    return this;
  }

  isSet() {
    return Object.keys(this.values).length > 0;
  }

  notifySender(method, data, event) {
    const message = event.message.clone().setMasked(false).setBody({
      data,
      method
    });

    this.messenger.send(message);
    return this;
  }

  notifyModels(method, data) {
    this.messenger.emit(this.getQualifiedName('change'), {
      data,
      method,
      model: this
    });

    return this;
  }

  notifyConnections(data) {
    if (this.connections.size === 0) {
      return this;
    }

    const message = this.messenger
      .createMessage()
      .setBody({
        data,
        method: 'change'
      })
      .encode()
      .then((message) => {
        this.connections.forEach((head) => {
          this.messenger.send(message.clone().setHead(head));
        });
      });

    return this;
  }

  getIdentifier() {
    let identifier = {};

    if (this.meta.id) {
      identifier = {
        id: this.meta.id
      };
    } else if (this.meta.filter) {
      identifier = {
        filter: this.meta.filter || {},
        order: this.meta.order || {}
      };
    }

    return this.getQualifiedName(JSON.stringify(identifier));
  }
}

module.exports = AbstractModel;
