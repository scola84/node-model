'use strict';

const EventHandler = require('@scola/events');

class Messenger extends EventHandler {
  constructor(dispatcher) {
    super();

    this.dispatcher = dispatcher;
    this.socket = null;
    this.models = new Map();
  }

  open(socket) {
    this.socket = socket;
    this.addHandlers();

    return this;
  }

  close() {
    this.removeHandlers();
    this.socket = null;

    return this;
  }

  addHandlers() {
    this.bindListener('message', this.socket, this.handleMessage);
    this.bindListener('close', this.socket, this.handleClose);
  }

  removeHandlers() {
    this.unbindListener('message', this.socket, this.handleMessage);
    this.unbindListener('close', this.socket, this.handleClose);
  }

  send(event, method, response) {
    const head = event.message.getHead();
    const body = event.message.getBody();

    this.socket.send(
      this.socket
      .createMessage()
      .setHead(head)
      .setBody({
        id: body.id,
        name: body.name,
        method,
        data: response || {}
      })
    );
  }

  handleMessage(event) {
    try {
      const body = event.message.getBody();
      const model = this.getModel(body);

      this.processMessage(model, body, event)
        .catch(this.handleError.bind(this, event));
    } catch (error) {
      this.handleError(event, error);
    }
  }

  handleClose(event) {
    this.models.forEach((model) => {
      model.unbind(event);
    });
  }

  handleError(event, error) {
    this.emit('error', {
      error,
      event
    });

    this.send(event, 'error', {
      error: error.message[0] === '@' ?
        error.message : '@scola.model'
    });
  }

  getModel(body) {
    const identifier = this.getIdentifier(body.name, body.data);

    let model = null;

    if (this.models.has(identifier)) {
      model = this
        .models
        .get(identifier);
    } else {
      model = this.dispatcher
        .get(body.name)
        .setMessenger(this);
    }

    return model;
  }

  setModel(model) {
    const identifier = model.getIdentifier();

    if (identifier && !this.models.has(identifier)) {
      this.models.set(identifier, model);
    }

    return this;
  }

  deleteModel(model) {
    const identifier = model.getIdentifier();

    if (identifier && this.models.has(identifier)) {
      this.models.delete(identifier, model);
    }

    return this;
  }

  getIdentifier(name, request) {
    let identifier = {};

    if (!request) {
      return null;
    } else if (request.id) {
      identifier = {
        id: request.id
      };
    } else if (request.filter) {
      identifier = {
        filter: request.filter || {},
        order: request.order || {}
      };
    }

    return name + '.' + JSON.stringify(identifier);
  }

  processMessage(model, body, event) {
    switch (body.method) {
      case 'read':
        return model.processRead(body.data, event);
      case 'write':
        return model.processWrite(body.data, event);
      case 'delete':
        return model.processDelete(body.data, event);
      default:
        throw new Error('@scola.messenger.method-not-found');
    }
  }
}

module.exports = Messenger;
