"use strict";

/**
 * Exposes a promise that gets resolved with various queue pub/subs to the underlying rabbitMQ queue server.
 *
 * Refer to QUEUE_CHANNEL_DEFNS for which queue pub/subs get exposed.
 *
 * For each exposed queue, we have the following:
 *   .publish(messageJson): publishes a json object using json serialization, returns a promis
 *   .subscribe(callback): subscribes a callback to the queue.  Callback receives three args:
 *     messageJson: the JSON object that was contained in the message
 *     ack: {function() | null} If queue requires an ack, the ack callback to call when done processing the message
 *     rawMessage: the raw message object.  This must be passed to ack() for ack-able queues
 *   .ack(rawMessage): Acknowledges receipt of a particular message (usually use the subscribe callback's ack())
 */

const Buffer = require('buffer').Buffer;
const amqp = require('amqplib');
const log = require('winston');
const Promise = require('bluebird');


// TODO: Environment variables
const AMQP_USER = 'guest';
const AMQP_HOST = 'localhost';
const AMQP_PORT = 5672;
const AMQP_PASS = 'guest';
const Q_NAME_OPEN_BATTLES = 'open_battles';
const Q_NAME_CLOSED_BATTLES = 'closed_battles';


const AMQP_URI = `amqp://${AMQP_USER}:${AMQP_PASS}@${AMQP_HOST}:${AMQP_PORT}`;

/**
 * These are definitions for how many channels/queues to create.  Each definition creates it's own channel
 * with subscribe/publish methods for the specified queue.
 */
const QUEUE_CHANNEL_DEFNS = [
  {name: 'openBattles', q: Q_NAME_OPEN_BATTLES, consumeOpts: { noAck: true }},
  {name: 'closedBattles', q: Q_NAME_CLOSED_BATTLES, consumeOpts: { noAck: false }} // Subscribers need to ack closing a battle
];

let mqConnection = amqp.connect(AMQP_URI);

function promiseNewQueuesChannel() {
  let queues = {};

  return mqConnection
  .then(conn => conn.createChannel())
  .then(ch => {
    // Expose channel controls
    queues.close = ch.close.bind(ch);

    return ch;
  })
  .then(ch => Promise.map(
    QUEUE_CHANNEL_DEFNS,
    qDefn => {
      ch.on('error', error => log.error('Message queue channel threw an error!', {
        queueChannelDefn: qDefn,
        error: error
      }));

      return ch
      .assertQueue(qDefn.q, {durable: process.env.NODE_ENV === 'production' /* survive broker restarts */})
      .then(ok => {
        log.debug('Setting queues for ' + qDefn);
        queues[qDefn.name] = {
          publish: (messageJson, opts) => ch.sendToQueue(qDefn.q, Buffer.from(JSON.stringify(messageJson)), opts),
          subscribe: (callback) => ch.consume(
            qDefn.q,
            messageBuf => callback(
              JSON.parse(messageBuf.content.toString()),
              qDefn.consumeOpts.noAck ? null : () => ch.ack.call(ch, messageBuf),
              messageBuf
            ),
            qDefn.consumeOpts
          ),
          ack: ch.ack.bind(ch),
          get: ch.get.bind(ch, qDefn.q),
          purge: ch.purgeQueue.bind(ch, qDefn.q),
        }
      });
    })
  )
  .then(() => Promise.resolve(queues));
}

module.exports = promiseNewQueuesChannel()
.then(queues => {
  // Allow opening of a new set of channels (eg try different connections in same process, to easily kill all subscribed
  // consumers, etc.)
  queues.promiseNewQueuesChannel = promiseNewQueuesChannel;

  return Promise.resolve(queues)
  .catch(error => {
    log.error('Error initializing initial amqp queue channels', { error });
    return Promise.reject(error);
  });
});
