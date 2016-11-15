"use strict";

const express = require('express');
const router = express.Router();

const crittersModel = require('../models/critters');


/** Create a new critter */
router.post('/critter', function(req, res, next) {
  crittersModel.createNewCritter(req.body.additionalAttributes)
  .then(newCritter => res.json(newCritter))
  .catch(error => next(error));
});

module.exports = router;
