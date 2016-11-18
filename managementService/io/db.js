"use strict";

/**
 * Exposes a sqlite database connector via exports.db(),
 * where all methods have been promisified by bluebird into xxxAsync()
 *
 * exports.dbReady is a promise to synchronize against db being ready.
 */

const sqlite3 = require('sqlite3');
const TransactionDatabase = require("sqlite3-transactions").TransactionDatabase;
const Promise = require('bluebird');

let db;
let transactionDb;
const dbReady = new Promise((resolve, reject) => {
  db = Promise.promisifyAll(
      new sqlite3.Database(`${__dirname}/../sqlite.db`, (error) => {
        if (error) {
          let dbFail = new Error('Could not create DB');
          dbFail.why = error;
          return reject(error);
        }

        transactionDb = new TransactionDatabase(db);

        // bluebird's promisifyAll() doesn't play well with sqlite-transaction's wrapping method.  Therefore, create a
        // thin wrapper around sqlite-transaction with the underlying promise-ified sqlite normally exposed.
        db.beginTransaction = (callback) => transactionDb.beginTransaction(callback);

        resolve(db);
      })
  );
});

exports.dbReady = dbReady;

exports.db = () => db;