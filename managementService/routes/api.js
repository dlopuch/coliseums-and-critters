"use strict";

const express = require('express');
const router = express.Router();
const log = require('winston');

const UserError = require('../models/UserError');
const battlesModel = require('../models/battles');
const crittersModel = require('../models/critters');
const messageQs = requireCommon('messageQueues');

let db;
require('../io/db').dbReady.then(theDb => db = theDb);

let openBattlePub;
messageQs
.then(qs => openBattlePub = qs.openBattles.publish)
.then(ok => log.info('API MW successfully initialized openBattle publisher'));


/** Create a new critter */
router.post('/critter', function(req, res, next) {
  crittersModel.createNewCritter(req.body.additionalAttributes)
  .then(newCritter => res.json(newCritter))
  .catch(error => next(error));
});

router.get('/battle/:id', function(req, res, next) {
  battlesModel.getBattleById(req.params.id)
  .then(battle => res.json(battle))
  .catch(error => next(error));
});

router.post('/battle', function(req, res, next) {
  let critA = req.body.critterAId;
  let critB = req.body.critterBId;

  if (!critA || typeof critA !== 'string') return next(new UserError('Missing critterAId'));
  if (!critB || typeof critB !== 'string') return next(new UserError('Missing critterBId'));

  // Here we do the critter lock and the fight creation all inside an atomic transaction
  db.beginTransaction((err, dbTransaction) => {
    let battlingCritters;
    let battle;

    crittersModel.prepareCrittersForBattle(dbTransaction, critA, critB)
    .then((critterModels) => {
      battlingCritters = critterModels;
      return battlesModel.createNewBattle(dbTransaction, critA, critB)
    })
    .then(theBattle => battle = theBattle)
    .then(() => openBattlePub({
        battle,
        critters: battlingCritters,
      })
    )
    .then(() => {
      dbTransaction.commit( (error) => {
        if (error) return next(error);

        res.json(battle);
      });
    })
    .catch(err => {
      dbTransaction.rollback(() => null);
      next(err)
    });
  });
});

module.exports = router;
