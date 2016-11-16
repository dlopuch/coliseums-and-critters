"use strict";

const log = require('winston');
const messageQs = require('../io/messageQueues');

const battlesModel = require('../models/battles');
const crittersModel = require('../models/critters');

let db;
require('../io/db').dbReady.then(theDb => db = theDb);

/**
 * For testing: Add a simple battle calculator that on receipt of an open battle, sends back a sample battle result.
 */
function enableLoopbackStrengthBattles() {
  messageQs
  .then(qs => qs.openBattles.subscribe(msg => {
    //qs.openBattles.ack(msg);
    log.info('Received message on openBattlesQ, publishing battle results....', {msg});

    return qs.closedBattles.publish({
      battle: msg.battle,
      results: {
        critter_a_won: msg.critters[0].attributes.strength > msg.critters[1].attributes.strength,
        critter_a_score: msg.critters[0].attributes.strength,
        critter_b_score: msg.critters[1].attributes.strength,
      }
    });
  }))
  .then(ok => log.info('battles businessLogic successfully enabled loopback strength battles'));
}
enableLoopbackStrengthBattles();  // TODO: disable


function calculateExperienceFromBattleResults(closedBattleMessage) {
  let results = closedBattleMessage.results;
  let losingScore  = results.critter_a_won ? results.critter_b_score : results.critter_a_score;

  // A winner becomes more experienced on a very close match -- if a match is a shut-out 10-1, nothing was learned.
  // It's when a match is closely-fought that one becomes wiser.  Winning experience is twice the loser's score
  let winningExp = 2 * losingScore;

  // A loser is still a battle fought.  Give some experience.
  let losingExp = losingScore;

  let experienceByCritterId = {};

  experienceByCritterId[closedBattleMessage.battle.critter_a_id] = results.critter_a_won ? winningExp : losingExp;
  experienceByCritterId[closedBattleMessage.battle.critter_b_id] = results.critter_a_won ? losingExp : winningExp;

  return experienceByCritterId;
}

function onClosedBattle(closedBattleMessage, ack) {
  log.info('Processing closed battle message', {closedBattleMessage});
  db.beginTransaction((err, dbTransaction) => {
    let experienceByCritterId = calculateExperienceFromBattleResults(closedBattleMessage);

    battlesModel.saveBattleResults(closedBattleMessage.battle.id, closedBattleMessage.results, dbTransaction)
    .then(() => crittersModel.updateCritterAfterBattle(
      closedBattleMessage.battle.critter_a_id,
      !!closedBattleMessage.results.critter_a_won,
      experienceByCritterId[closedBattleMessage.battle.critter_a_id],
      dbTransaction
    ))
    .then(() => crittersModel.updateCritterAfterBattle(
      closedBattleMessage.battle.critter_b_id,
      !closedBattleMessage.results.critter_a_won,
      experienceByCritterId[closedBattleMessage.battle.critter_b_id],
      dbTransaction
    ))
    .then(() => ack())
    .then(() => new Promise((resolve, reject) => dbTransaction.commit((err) => {
      if (err) return reject(err);

      log.info('Successfully processed a closed battle', { closedBattleMessage });

      resolve();
    })))
    .catch(err => {
      dbTransaction.rollback(() => null);

      log.error('Error processing a closed battle', { err });

      return Promise.reject(err);
    });
  });
};
messageQs
.then(qs => qs.closedBattles.subscribe(onClosedBattle))
.then(ok => log.info('battles businessLogic successfully initialized closedBattle subscription'));