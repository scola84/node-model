'use strict';

const AbstractModel = require('./abstract');

class DatabaseModel extends AbstractModel {
  constructor(database, queries) {
    super();
    this.database = database;
    this.queries = queries;
  }

  read(request) {
    return this.database.read(
      this.getQuery(request.name),
      request
    );
  }

  write(request) {
    return this.database.write(
      this.getQuery(request.name),
      request
    );
  }

  delete(request) {
    return this.database.write(
      this.getQuery(request.name),
      request
    );
  }

  getQuery(name) {
    if (!this.queries[name]) {
      throw new Error('@scola.model.database');
    }

    return this.queries[name];
  }
}

module.exports = DatabaseModel;
