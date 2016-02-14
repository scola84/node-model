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

  send(head, body) {
    this.socket.send(
      this.socket
      .createMessage()
      .setHead(head)
      .setBody(body)
    );
  }

  handleMessage(event) {
    try {
      const request = JSON.parse(event.message.getBody());
      const model = this.getModel(request);

      model.authorize(request, event);
      model.validate(request, event);

      if (request.meta.bind) {
        model.bind(event);
      } else if (request.meta.unbind) {
        return model.unbind(event);
      }

      switch (request.method) {
        case 'select':
          model.select(request, event);
          break;
        case 'insert':
          model.insert(request, event);
          break;
        case 'update':
          model.update(request, event);
          break;
        case 'delete':
          model.delete(request, event);
          break;
        default:
          throw new Error('@scola.messenger.method-not-found');
      }
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

    const body = JSON.stringify({
      data: {
        error: error.message[0] === '@' ?
          error.message : '@scola.model'
      },
      method: 'error'
    });

    this.send(event.message.getHead(), body);
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

    return this.models.get(identifier);
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
}

module.exports = Messenger;
