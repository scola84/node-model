'use strict';

const EventHandler = require('@scola/events');

class Messenger extends EventHandler {
  constructor(collectionProvider) {
    super();

    this.collectionProvider = collectionProvider;
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
  }

  removeHandlers() {
    this.unbindListener('message', this.socket, this.handleMessage);
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
          .then(this.handleList.bind(this, event))
          .catch(this.handleError.bind(this, event));
      } else if (body.data.id) {
        collection
          .getItem(body.data, event)
          .then(this.handleItem.bind(this, event))
          .catch(this.handleError.bind(this, event));
      } else {
        collection
          .createItem()
          .then(this.handleItem.bind(this, event))
          .catch(this.handleError.bind(this, event));
      }
    } catch (error) {
      this.handleError(event, error);
    }
  }

  handleList(event, list) {
    const body = event.message.getBody();

    if (body.unbind) {
      return list.unbind(event);
    }

    if (body.bind) {
      list.bind(event);
    }

    list.notify('select', event);
  }

  handleItem(event, item) {
    const body = event.message.getBody();

    switch (body.method) {
      case 'select':
        return this.handleItemSelect(item, body, event);
      case 'insert':
        return this.handleItemInsert(item, body, event);
      case 'update':
        return this.handleItemUpdate(item, body, event);
      case 'delete':
        return this.handleItemDelete(item, body, event);
    }
  }

  handleItemSelect(item, body, event) {
    if (body.unbind) {
      return item.unbind(event);
    }

    if (body.bind) {
      item.bind(event);
    }

    return item.notify('select', event);
  }

  handleItemInsert(item, body, event) {
    return item.register(event).insert(body.data);
  }

  handleItemUpdate(item, body) {
    return item.update(body.data);
  }

  handleItemDelete(item, body) {
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
