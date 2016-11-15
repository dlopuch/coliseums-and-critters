"use strict";

const uuid = require('node-uuid');
const critterCreator = require('./critterCreator');

let db;
require('../io/db').dbReady.then(theDb => db = theDb);

exports.getCritterById = function(id) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM critters WHERE id = ?`, [id], (error, row) => {
      if (error) return reject(error);

      if (!row) return resolve(null); // not found

      row.attributes = JSON.parse(row.attributes_json);
      delete row.attributes_json;

      resolve(row);
    });
  });
};

/**
 * Persists a new critter and returns it
 * @param {Array(string)} additionalAttributes Any additional attributes to generate
 * @return {Promise}
 */
exports.createNewCritter = function(additionalAttributes) {
  return new Promise( (resolve, reject) => {
    let id = `crit-${uuid.v4()}`;

    db.run(`INSERT INTO critters (id, attributes_json) VALUES ($id, $attributesJson)`, {
      $id: id,
      $attributesJson: JSON.stringify(critterCreator(additionalAttributes)),
    }, (error) => {
      if (error) return reject(error);

      resolve(
        exports.getCritterById(id)
        .then(critter => {
          if (!critter) {
            return Promise.reject(new Error(`Unexpected DB state! Could not find new critter under ID ${id}!`));
          }

          return critter;
        })
      );
    });
  });
};

