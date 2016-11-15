"use strict";

const Promise = require('bluebird');
const uuid = require('node-uuid');

const UserError = require('./UserError');
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

/**
 * Locks two critters as out for a fight, or rejects if critters are invalid or already out for a fight.
 * @param {Object} dbTransaction
 * @param {string} critterAId
 * @param {string} critterBId
 * @return {Promise}
 */
exports.prepareCrittersForBattle = function(dbTransaction, critterAId, critterBId) {
  critterAId = critterAId.trim();
  critterBId = critterBId.trim();

  if (critterAId === critterBId) {
    return Promise.reject(new UserError("Critter ID's must be different -- can't fight itself"));
  }

  return dbTransaction.allAsync(
    'SELECT id, is_out_fighting FROM critters WHERE id = ? OR id = ?',
    [ critterAId, critterBId ]
  ).then(rows => {
    if (rows.length > 2) return Promise.reject(new Error('Unexpected DB state: more than two critters returned!'));

    if (rows.length < 2) {
      return Promise.reject(
        new UserError(`Invalid critter ID's specified. Valid critter ID's: [${rows.map(r => r.id).join(', ')}].`)
      );
    }

    let busyCritters = [];
    rows.forEach(row => {
      if (row.is_out_fighting) busyCritters.push(row.id);
    });

    if (busyCritters.length) {
      return Promise.reject(
        new UserError(`One or more critters are already queued up for a fight: ${busyCritters.join(', ')}`)
      );
    }

    return dbTransaction.runAsync(
      `UPDATE critters SET is_out_fighting = 1 WHERE is_out_fighting = 0 AND (id = ? OR id = ?)`,
      [ critterAId, critterBId ]
    );
  });
};

