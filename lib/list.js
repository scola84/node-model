'use strict';

const AbstractModel = require('./abstract');

class ListModel extends AbstractModel {
  constructor() {
    super();

    this.data = {};
    this.list = [];
  }

  select(data) {
    this.data = data;
    return this.query(this.handleSelect);
  }

  handleSelect(item, list) {
    this.list = list;
    return this;
  }

  insert(item) {
    return this.query(this.handleInsert, item);
  }

  handleInsert(item, list) {
    this.list = list;
    this.notifyAll('insert');
    return this;
  }

  update(item) {
    return this.query(this.handleUpdate, item);
  }

  handleUpdate(item, list) {
    this.list = list;
    this.notifyAll('update');
    return this;
  }

  delete(item) {
    return this.query(this.handleDelete, item);
  }

  handleDelete(item, list) {
    this.list = list;
    this.notifyAll('delete');
    return this;
  }

  query(handler, item) {
    return super.query(
      'list.' + this.data.query.name,
      this.data.query.parameters,
      handler.bind(this, item)
    );
  }

  toObject() {
    return this.list;
  }
}

module.exports = ListModel;
