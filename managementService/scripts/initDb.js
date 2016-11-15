"use strict";

const async = require('async');
const db = require('../io/db');

db.dbReady.then((db) => {
  db.serialize(() => {

    async.series([
      cb => {
        db.run(`CREATE TABLE critters (
          id TEXT PRIMARY KEY NOT NULL,
          created_at DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          out_fighting BOOLEAN DEFAULT 0,
          attributes_json TEXT NOT NULL,
          experience INTEGER NOT NULL DEFAULT 0,
          num_wins INTEGER NOT NULL DEFAULT 0,
          num_losses INTEGER NOT NULL DEFAULT 0
        )`, cb);
      },
    ], (error) => {
      if (error) {
        console.log('ERROR CREATING TABLES:', error);
        return;
      }

      console.log('\n------------\nSuccessfully initialed database!');
      db.close();
    });
  });
});