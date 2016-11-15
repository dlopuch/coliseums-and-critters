"use strict";

/**
 * Exposes a sqlite database connector via exports.db().
 *
 * exports.dbReady is a promise to synchronize against db being ready.
 */

const sqlite3 = require('sqlite3');

let db;
const dbReady = new Promise((resolve, reject) => {
  db = new sqlite3.Database('./sqlite.db', (error) => {
    if (error) {
      let dbFail = new Error('Could not create DB');
      dbFail.why = error;
      return reject(error);
    }

    resolve(db);
  });
});

exports.dbReady = dbReady;

exports.db = () => db;