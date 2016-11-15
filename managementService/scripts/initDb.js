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
          is_out_fighting BOOLEAN DEFAULT 0,
          attributes_json TEXT NOT NULL,
          experience INTEGER NOT NULL DEFAULT 0,
          num_wins INTEGER NOT NULL DEFAULT 0,
          num_losses INTEGER NOT NULL DEFAULT 0
        )`, cb);
      },
      cb => {
        db.run(`CREATE TABLE battles (
          id TEXT PRIMARY KEY NOT NULL,
          created_at DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          completed_at DATE,
          is_in_progress BOOLEAN NOT NULL DEFAULT 1,
          battle_type TEXT NOT NULL,
          critter_a_id TEXT NOT NULL,
          critter_b_id TEXT NOT NULL,
          critter_a_won BOOLEAN,
          critter_a_score NUMBER,
          critter_b_score NUMBER,
          FOREIGN KEY (critter_a_id) REFERENCES critters (id),
          FOREIGN KEY (critter_b_id) REFERENCES critters (id)
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