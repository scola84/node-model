'use strict';

const EventHandler = require('@scola/events');

class Messenger extends EventHandler {
  constructor(models) {
    super();

    this.models = models;
    this.modelMap = new Map();
    this.socket = null;
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

  send(event, method, data) {
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
        data: data || {}
      })
    );
  }

  handleMessage(event) {
    const body = event.message.getBody();
    const identifier = this.getIdentifier(body.name, body.data);

    let model = null;

    if (this.modelMap.has(identifier)) {
      model = this
        .modelMap
        .get(identifier);
    } else {
      model = this
        .models[body.name]
        .get()
        .setMessenger(this);
    }

    switch (body.method) {
      case 'read':
        model
          .read(body.data, event)
          .catch(this.handleError.bind(this, event));
        break;
      case 'write':
        model
          .write(body.data, event)
          .catch(this.handleError.bind(this, event));
        break;
      case 'delete':
        model
          .delete(body.data, event)
          .catch(this.handleError.bind(this, event));
        break;
      default:
        this
          .handleError(event, new Error('@scola.messenger.method-not-found'));
        break;
    }
  }

  handleClose(event) {
    this.modelMap.forEach((model) => {
      model.unbind(event);
    });
  }

  handleError(event, error) {
    this.emit('error', {
      error,
      event
    });

    this.send(event, 'error', {
      error: error.message
    });
  }

  setModel(model) {
    const identifier = model.getIdentifier();

    if (identifier && !this.modelMap.has(identifier)) {
      this.modelMap.set(identifier, model);
    }

    return this;
  }

  deleteModel(model) {
    const identifier = model.getIdentifier();

    if (identifier && this.modelMap.has(identifier)) {
      this.modelMap.delete(identifier, model);
    }

    return this;
  }

  getIdentifier(name, data) {
    if (data.id) {
      data = {
        id: data.id
      };
    } else {
      data = {
        filter: data.filter || {},
        order: data.order || {}
      };
    }

    return name + '.' + JSON.stringify(data);
  }
}

module.exports = Messenger;
