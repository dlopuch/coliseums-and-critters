const log = require('winston');
const messageQs = require('../io/messageQueues');


messageQs
.then(qs => qs.openBattles.subscribe(msg => {
  //qs.openBattles.ack(msg);
  log.info('Received message on openBattlesQ', { msg });
}))
.then(ok => log.info('battles businessLogic successfully initialized openBattle sub'));