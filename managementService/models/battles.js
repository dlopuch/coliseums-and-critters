"use strict";

const Promise = require('bluebird');
const uuid = require('node-uuid');

const UserError = require('./UserError');

let db;
require('../io/db').dbReady.then(theDb => db = theDb);

/**
 * Gets a battle by ID
 * @param {string} battleId
 * @param {Object} [dbTransaction] If transactional, the transaction context.  Otherwise null.
 */
exports.getBattleById = function(battleId, dbTransaction) {
  let dbContext = dbTransaction || db;

  return dbContext.getAsync('SELECT * FROM battles WHERE id = ?', [battleId]);
};

exports.createNewBattle = function(dbTransaction, critterAId, critterBId) {
  if (critterAId === critterBId) {
    return Promise.reject(new UserError("Must specify different critter ID's for a battle"));
  }

  let id = `bat-${uuid.v4()}`;

  return dbTransaction.runAsync(
    `INSERT INTO battles (id, battle_type, critter_a_id, critter_b_id) 
     VALUES ($id, $battleType, $critterAId, $critterBId)`, {
      $id: id,
      $battleType: 'default',
      $critterAId: critterAId,
      $critterBId: critterBId
    }
  )
  .then(() => exports.getBattleById(id, dbTransaction));
};