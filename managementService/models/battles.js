"use strict";

const Promise = require('bluebird');
const uuid = require('node-uuid');

const rabbitMqConnection = require('../io/messageQueues');
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

exports.saveBattleResults = function(battleId, battleResults, dbTransaction) {
  let dbContext = dbTransaction || db;

  return dbContext.runAsync(
    `UPDATE battles SET 
       completed_at = CURRENT_TIMESTAMP,
       is_in_progress = 0,
       critter_a_won = $critter_a_won,
       critter_a_score = $critter_a_score,
       critter_b_score = $critter_b_score
     WHERE id = $battleId`,
    {
      $battleId: battleId,
      $critter_a_won: battleResults.critter_a_won ? 1 : 0,
      $critter_a_score: battleResults.critter_a_score,
      $critter_b_score: battleResults.critter_b_score,
    }
  );
};
