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

  createMessage() {
    return this.socket.createMessage();
  }

  send(message) {
    this.socket.send(message);
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

  handleMessage(event) {
    try {
      const request = event.message.getBody();

      this.getModel(request)
        .then(this.authorize.bind(this, request, event))
        .then(this.validate.bind(this, request, event))
        .then(this.execute.bind(this, request, event))
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

    this.send(event.message.clone().setMasked(false).setBody({
      data: {
        error: error.message[0] === '@' ?
          error.message : '@scola.model'
      },
      method: 'error'
    }));
  }

  getModel(request) {
    const identifier = this.getIdentifier(request);

    if (!this.models.has(identifier)) {
      const model = this.dispatcher
        .get(request.model)
        .setMeta(request.meta)
        .setMessenger(this);

      this.models.set(model.getIdentifier(), model);
    }

    return Promise.resolve(this.models.get(identifier));
  }

  deleteModel(model) {
    const identifier = model.getIdentifier();

    if (identifier && this.models.has(identifier)) {
      this.models.delete(identifier, model);
    }

    return this;
  }

  getIdentifier(request) {
    let identifier = {};

    if (request.meta.id) {
      identifier = {
        id: request.meta.id
      };
    } else if (request.meta.filter) {
      identifier = {
        filter: request.meta.filter || {},
        order: request.meta.order || {}
      };
    }

    return request.model + '.' + JSON.stringify(identifier);
  }

  authorize(request, event, model) {
    return model.authorize(request, event);
  }

  validate(request, event, model) {
    return model.validate(request, event);
  }

  execute(request, event, model) {
    if (request.meta.bind) {
      model.bind(event);
    } else if (request.meta.unbind) {
      return model.unbind(event);
    }

    switch (request.method) {
      case 'select':
        return model.select(request, event);
      case 'insert':
        return model.insert(request, event);
      case 'update':
        return model.update(request, event);
      case 'delete':
        return model.delete(request, event);
      default:
        throw new Error('@scola.messenger.method-not-found');
    }
  }
}

module.exports = Messenger;
