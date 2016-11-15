"use strict";

const express = require('express');
const router = express.Router();

const UserError = require('../models/UserError');
const battlesModel = require('../models/battles');
const crittersModel = require('../models/critters');

let db;
require('../io/db').dbReady.then(theDb => db = theDb);


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
    crittersModel.prepareCrittersForBattle(dbTransaction, critA, critB)
    .then(() => battlesModel.createNewBattle(dbTransaction, critA, critB))
    .then(() => {
      dbTransaction.commit( (error) => {
        if (error) return next(error);

        res.json('ok');
      });
    })
    .catch(err => {
      dbTransaction.rollback(() => null);
      next(err)
    });
  });

});

module.exports = router;
