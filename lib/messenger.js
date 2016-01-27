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
        data
      })
    );
  }

  handleMessage(event) {
    try {
      this
        .executeModel(event)
        .catch(this.handleError.bind(this, event));
    } catch (error) {
      this.handleError(event, error);
    }
  }

  handleSelect(event, model) {
    const body = event.message.getBody();

    if (body.data.bind === true && !model.isBound(event)) {
      console.log('binding');
      model.bind(event);
    } else if (body.data.bind === false && model.isBound(event)) {
      model.unbind(event);
    }

    this.setModel(model);
    this.send(event, 'select', model.toObject());
  }

  handleInsert(event, model) {
    this.setModel(model);
    this.send(event, 'insert', model.toObject());
  }

  handleUpdate(event, model) {
    this.setModel(model);

    if (!model.isBound(event)) {
      this.send(event, 'update', model.toObject());
    }
  }

  handleDelete(event, model) {
    this.deleteModel(model);

    if (!model.isBound(event)) {
      this.send(event, 'delete', model.toObject());
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

  executeModel(event) {
    const body = event.message.getBody();
    const identifier = this.getIdentifier(body.name, body.data);

    console.log(this.modelMap.size);

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
      case 'select':
        return model
          .select(body.data)
          .then(this.handleSelect.bind(this, event));
      case 'insert':
        return model
          .insert(body.data)
          .then(this.handleInsert.bind(this, event));
      case 'update':
        return model
          .update(body.data)
          .then(this.handleUpdate.bind(this, event));
      case 'delete':
        return model
          .delete(body.data)
          .then(this.handleDelete.bind(this, event));
    }
  }

  setModel(model) {
    const identifier = model.getIdentifier();

    if (identifier && !this.modelMap.has(identifier)) {
      this.modelMap.set(identifier, model);
    }
  }

  deleteModel(model) {
    const identifier = model.getIdentifier();

    if (identifier && this.modelMap.has(identifier)) {
      this.modelMap.delete(identifier, model);
    }
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
