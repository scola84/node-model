'use strict';

const EventHandler = require('@scola/events');

class Messenger extends EventHandler {
  constructor(collection) {
    super();

    this.collectionProvider = collection;
    this.collections = new Map();
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

  send(event, method, data) {
    try {
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
    } catch (error) {
      this.emit('error', {
        error
      });
    }
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
      const body = event.message.getBody();

      if (!this.collections.has(body.name)) {
        this.collections.set(body.name, this
          .collectionProvider
          .get()
          .setMessenger(this)
          .setName(body.name)
        );
      }

      const collection = this.collections.get(body.name);

      if (body.data.query) {
        return collection
          .getList(body.data, event)
          .then(this.handleSelect.bind(this, event))
          .catch(this.handleError.bind(this, event));
      }

      collection
        .getItem(body.data, event)
        .then(this.handleItem.bind(this, event))
        .catch(this.handleError.bind(this, event));
    } catch (error) {
      this.handleError(event, error);
    }
  }

  handleClose(event) {
    this.collections.forEach((collection) => {
      collection.unbind(event);
    });
  }

  handleItem(event, item) {
    const body = event.message.getBody();

    switch (body.method) {
      case 'select':
        return this.handleSelect(event, item);
      case 'insert':
        return this.handleInsert(item, body);
      case 'update':
        return this.handleUpdate(item, body);
      case 'delete':
        return this.handleDelete(item, body);
    }
  }

  handleSelect(event, model) {
    const body = event.message.getBody();

    if (body.data.unbind) {
      return model.unbind(event);
    }

    if (body.data.bind) {
      model.bind(event);
    }

    model.notify('select', event);
  }

  handleInsert(item, body) {
    return item.insert(body.data);
  }

  handleUpdate(item, body) {
    return item.update(body.data);
  }

  handleDelete(item, body) {
    return item.delete(body.data);
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
}

module.exports = Messenger;
