'use strict';

const AbstractModel = require('./abstract');

class ItemModel extends AbstractModel {
  constructor(queries) {
    super(queries);
    this.data = {};
  }

  select(data) {
    return this.query('item.select', data, this.handleSelect);
  }

  handleSelect(data) {
    this.data = data[0];
    return this;
  }

  insert(data) {
    return this.query('item.insert', data, this.handleInsert);
  }

  handleInsert(data, result) {
    this.data = data;
    this.data.id = result.insertId;

    this.notifyAll('insert');
    this.collection.insert(this);

    return this;
  }

  update(data) {
    return this.query('item.update', data, this.handleUpdate);
  }

  handleUpdate(data) {
    this.data.name = data.name;

    this.notifyAll('update');
    this.collection.update(this);

    return this;
  }

  delete(data) {
    return this.query('item.delete', data, this.handleDelete);
  }

  handleDelete() {
    this.notifyAll('delete');
    this.collection.delete(this);

    return this;
  }

  query(name, data, handler) {
    return super.query(
      name,
      data,
      handler.bind(this, data)
    );
  }

  toObject() {
    return this.data;
  }
}

module.exports = ItemModel;
