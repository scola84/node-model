'use strict';

const EventHandler = require('@scola/events');

class AbstractModel extends EventHandler {
  constructor() {
    super();

    this.messenger = null;
    this.validator = null;

    this.request = null;
    this.response = null;

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

  destroy() {
    this.removeHandlers();
    this.messenger.deleteModel(this);

    return this;
  }

  processRead(request, event) {
    this.prepare(
      this.authorizeRead(request, event),
      this.validateRead(request, event)
    );

    if (request.bind === true) {
      this.bind(event);
    } else if (request.bind === false) {
      this.unbind(event);
    }

    if (!this.request) {
      this.setRequest(request);
      this.messenger.setModel(this);
    }

    if (!this.response) {
      return this.read(this.request, event)
        .then(this.handleRead.bind(this, this.request, event));
    }

    this.send(event, 'read', this.response);

    return Promise.resolve(this);
  }

  authorizeRead(request) {
    return request;
  }

  validateRead(request) {
    return request;
  }

  read() {
    throw new Error('not_implemented');
  }

  handleRead(request, event, result) {
    this
      .setResponse(request.name, result)
      .send(event, 'read', this.response);
  }

  processWrite(request, event) {
    this.prepare(
      this.authorizeWrite(request, event),
      this.validateWrite(request, event)
    );

    return this.write(request, event)
      .then(this.handleWrite.bind(this, request, event));
  }

  authorizeWrite(request) {
    return request;
  }

  validateWrite(request) {
    return request;
  }

  write() {
    throw new Error('not_implemented');
  }

  handleWrite(request, event, result) {
    return this
      .setResponse(request.name, result)
      .send(event, 'write')
      .notifyModels('write', request);
  }

  processDelete(request, event) {
    this.prepare(
      this.authorizeDelete(request, event),
      this.validateDelete(request, event)
    );

    return this.delete(request, event)
      .then(this.handleDelete.bind(this, request, event));
  }

  authorizeDelete(request) {
    return request;
  }

  validateDelete(request) {
    return request;
  }

  delete() {
    throw new Error('not_implemented');
  }

  handleDelete(request, event) {
    return this
      .destroy()
      .send(event, 'delete')
      .notifyModels('delete', request);
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

  handleChange(changeEvent) {
    this.change(this.request, changeEvent)
      .then(this.handleChangeRead.bind(this, this.request, changeEvent));
  }

  change(request) {
    return this.read(request);
  }

  handleChangeRead(request, changeEvent, result) {
    return this
      .setResponse(request.name, result)
      .notifyConnections('read', changeEvent.reason);
  }

  prepare(authorizedRequest, validatedRequest) {
    if (authorizedRequest.error) {
      throw authorizedRequest.error;
    }

    if (validatedRequest.error) {
      throw validatedRequest.error;
    }
  }

  setRequest(request) {
    this.request = request;
    return this;
  }

  setResponse(name, result) {
    this.response = {
      name,
      result
    };

    return this;
  }

  getIdentifier() {
    let identifier = {};

    if (!this.request) {
      return null;
    } else if (this.request.id) {
      identifier = {
        id: this.request.id
      };
    } else if (this.request.filter) {
      identifier = {
        filter: this.request.filter,
        order: this.request.order
      };
    }

    return this.getQualifiedName(JSON.stringify(identifier));
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

    const object = this.response;
    object.reason = reason;

    this.events.forEach((event) => {
      this.send(event, method, object);
    });

    return this;
  }

  send(event, method, response) {
    this.messenger.send(event, method, response);
    return this;
  }
}

module.exports = AbstractModel;
