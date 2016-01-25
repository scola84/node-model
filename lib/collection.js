'use strict';

class Collection {
  constructor(listProvider, itemProvider, database) {
    this.listProvider = listProvider;
    this.itemProvider = itemProvider;
    this.database = database;

    this.name = null;
    this.messenger = null;

    this.lists = new Map();
    this.items = new Map();
  }

  getMessenger() {
    return this.messenger;
  }

  setMessenger(messenger) {
    this.messenger = messenger;
    return this;
  }

  getName() {
    return this.name;
  }

  setName(name) {
    this.name = name;
    return this;
  }

  send(event, method, data) {
    this.messenger.send(event, method, data);
  }

  insert(item) {
    this.items.set(item.getId(), item);

    this.lists.forEach((list) => {
      list.insert(item);
    });
  }

  update(item) {
    this.lists.forEach((list) => {
      list.delete(item);
    });
  }

  delete(item) {
    this.lists.forEach((list) => {
      list.delete(item);
    });

    this.items.delete(item.getId());
  }

  unbind(event) {
    this.lists.forEach((list) => {
      list.unbind(event);
    });

    this.items.forEach((item) => {
      item.unbind(event);
    });
  }

  getList(data) {
    return new Promise(this.handleGetList.bind(this, data));
  }

  handleGetList(data, resolve, reject) {
    const identifier = JSON.stringify(data);

    if (this.lists.has(identifier)) {
      return resolve(this.lists.get(identifier));
    }

    return this
      .listProvider
      .get()
      .setCollection(this)
      .setDatabase(this.database)
      .setName(this.name)
      .select(data)
      .then((list) => {
        this.lists.set(identifier, list);
        resolve(list);
      })
      .catch(reject);
  }

  getItem(data) {
    return new Promise(this.handleGetItem.bind(this, data));
  }

  handleGetItem(data, resolve, reject) {
    if (this.items.has(data.id)) {
      return resolve(this.items.get(data.id));
    }

    const item = this
      .itemProvider
      .get()
      .setCollection(this)
      .setDatabase(this.database)
      .setName(this.name);

    if (!data.id) {
      return resolve(item);
    }

    item
      .select(data)
      .then(() => {
        this.items.set(data.id, item);
        resolve(item);
      })
      .catch(reject);
  }
}

module.exports = Collection;
