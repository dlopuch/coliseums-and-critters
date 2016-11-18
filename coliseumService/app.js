"use strict";

const log = require('winston');
const promiseMessageQs = require('../common-lib/messageQueues');

const battleCalculators = {
  default: require('./battleCalculators/default'),
  // TODO: Add additional battle calculators here
};

// Logger config
log.configure({
  transports: [
    new (log.transports.Console)({
      colorize: true,
      label: 'ColiseumService'
    })
  ]
});

promiseMessageQs
.then(messageQs => messageQs.openBattles.subscribe(function(openBattleMessage) {
  log.info('Received an openBattleMessage, starting to process', { openBattleMessage });

  if (!battleCalculators[openBattleMessage.battle.battle_type]) {
    log.error('Bad message! Unhandled battle type!', { openBattleMessage });
    return;
  }

  battleCalculators[openBattleMessage.battle.battle_type](openBattleMessage)
  .then((results) => {
    let closedBattleMessage = {
      battle: openBattleMessage.battle,
      results: results
    };

    messageQs.closedBattles.publish(closedBattleMessage);
    log.info('Done calculating battle results', { openBattleMessage, closedBattleMessage });
  })
  .catch((error) => {
    log.error('Error calculating battle results!', { openBattleMessage, error: error.stack });
  });
}))
.then(() => log.info('coliseumService successfully subscribed to message queue and ready to go'))
.catch(error => log.error('coliseumService could not initialize or subscribe to message queue', { error }));

