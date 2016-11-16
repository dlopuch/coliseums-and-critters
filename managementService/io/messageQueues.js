"use strict";

/**
 * Exposes a promise that gets resolved with various queue pub/subs to the underlying rabbitMQ queue server.
 * Refer to QUEUE_CHANNEL_DEFNS for which queue pub/subs get exposed
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
const Q_NAME_CLOSED_BATTLES = 'open_battles';


const AMQP_URI = `amqp://${AMQP_USER}:${AMQP_PASS}@${AMQP_HOST}:${AMQP_PORT}`;

/**
 * These are definitions for how many channels/queues to create.  Each definition creates it's own channel
 * with subscribe/publish methods for the specified queue.
 */
const QUEUE_CHANNEL_DEFNS = [
  {name: 'openBattles', q: Q_NAME_OPEN_BATTLES, consumeOpts: { noAck: true }},
  {name: 'closedBattles', q: Q_NAME_CLOSED_BATTLES, consumeOpts: { noAck: false }} // Subscribers need to ack closing a battle
];

const queues = {};

let initQueueChannels = amqp.connect(AMQP_URI)
.then(conn => Promise.map(
  QUEUE_CHANNEL_DEFNS,
  qDefn => {
    return conn.createChannel()
    .then(ch => {
      ch.on('error', error => log.error('Message queue channel threw an error!', {
        queueChannelDefn: qDefn,
        error: error
      }));

      return ch
      .assertQueue(qDefn.q) //{ durable: true/* survive broker restarts */ })
      .then(ok => {
        log.debug('Setting queues for ' + qDefn);
        queues[qDefn.name] = {
          publish: (messageJson, opts) => ch.sendToQueue(qDefn.q, Buffer.from(JSON.stringify(messageJson)), opts),
          subscribe: (callback) => ch.consume(qDefn.q, messageBuf =>
            callback(JSON.parse(messageBuf.content.toString()))
          ),
          ack: ch.ack,
        }
      });
    });
  }
))
.then(() => Promise.resolve(queues));

module.exports = initQueueChannels;

initQueueChannels
.catch(error => log.error('Error initializing amqp queue channels', { error }));