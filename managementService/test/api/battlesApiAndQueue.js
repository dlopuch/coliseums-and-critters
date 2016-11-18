"use strict";

/**
 * Tests the battle API routes.
 *
 * Since creating battles puts messages onto the job queue, we also create a listener client on the queue to make sure
 * the message properly appears
 */

const request = require('supertest');
const assert = require('chai').assert;

const utils = require('./utils');
const promiseManagementService = require('../../app');


describe('battles API and queue', function() {
  let app;
  before('assign app', () => promiseManagementService.then(readyApp => app = readyApp));

  let openBattleMessage;
  let closedBattleMessage;

  /**
   * This test checks that when we POST to /battles, we both
   *   1) get a battle object response from the post
   *   2) a battle message appears on the openBattles queue as a side-effect
   */
  it('POST /battles: creates a new battle and puts it onto the queue', function() {
    let critterA;
    let critterB;

    return utils.executeWithTestScopedQueues(function(messageQs) {

      // First clear out the open battles queue
      return messageQs.openBattles.purge()

      // Grab some critters
      .then(function allocateCritterA() {
        // Allocate some critters
        return new Promise((resolve, reject) => {
          request(app)
          .post('/api/critter')
          .expect(200)
          .expect(function (res) {
            assert.equal(res.body.id.substring(0, 5), 'crit-');
            critterA = res.body;

            // Expect critterB will be out fighting when battle starts
            assert.equal(critterA.is_out_fighting, 0);
            critterA.is_out_fighting = 1;
          })
          .end((error) => error ? reject(error) : resolve())
        });
      })
      .then(function allocateCritterB() {
        return new Promise((resolve, reject) => {
          request(app)
          .post('/api/critter')
          .expect(200)
          .expect(function (res) {
            assert.equal(res.body.id.substring(0, 5), 'crit-');
            critterB = res.body;

            // Expect critterB will be out fighting when battle starts
            assert.equal(critterB.is_out_fighting, 0);
            critterB.is_out_fighting = 1;
          })
          .end((error) => error ? reject(error) : resolve())
        });
      })

      // Now we 1) start a new battle and 2) make sure it appears on the queue
      .then(() => {
        // Make the battle become available when that request comes back but referencable now for the queue callback
        let deliverBattleCb;
        let promiseBattle = new Promise((resolve, reject) => {
          deliverBattleCb = (error, battle) => error ? reject(error) : resolve(battle);
        });

        return Promise.all([
          // Here we register a listener on the job queue and make sure the queue battle message appears.
          // This promise gets resolved when we find the expected battle message on the job queue.
          new Promise((resolve, reject) => {
            let gotMessage = false;
            messageQs.openBattles.subscribe(function(message) {
              promiseBattle.then(battle => {
                try {
                  assert.deepEqual(message, {
                    battle,
                    critters: [critterA, critterB]
                  });
                  openBattleMessage = message; // looks good, use it for the next test
                } catch(error) {
                  return reject(error);
                }

                gotMessage = true;
                resolve();
              });
            });
            setTimeout(() => {
              if (gotMessage) return;
              reject(new Error('No message seen on queue for timeout duration'));
            }, 1000);
          }),

          // Here we promise the API POST /battle request returns a battle as expected
          new Promise((resolve, reject) => {
            request(app)
            .post('/api/battle')
            .send({
              critterAId: critterA.id,
              critterBId: critterB.id,
            })
            .expect(200)
            .expect(function (res) {
              assert.equal(res.body.id.substring(0, 4), 'bat-');
              deliverBattleCb(null, res.body);
            })
            .end((error) => error ? reject(error) : resolve())
          })
        ]); // end Promise.all of: 1) start a new battle and 2) make sure it appears on the queue
      });
    }); // end executeTestScopedQueues
  }); // end test


  it('processes closedBattle message queue', function() {
    assert.isOk(openBattleMessage, 'Expected an open battle to have been created earlier in test suite');

    return utils.executeWithTestScopedQueues(function(messageQs) {
      closedBattleMessage = {
        battle: openBattleMessage.battle,
        results: {
          critter_a_won: true,
          critter_a_score: 10,
          critter_b_score: 8
        }
      };

      // First clear out the closed battles queue
      return messageQs.closedBattles.purge()

      // Emulate a closed battle (this is normally CPU-intensive
      .then(() => messageQs.closedBattles.publish(closedBattleMessage))

      // Listen to the app's event bus to make sure it gets processed
      .then(() => new Promise((resolve, reject) => {
        let sawProcessedEvent = false;
        app.once('processedClosedBattle', function(message) {
          try {
            assert.deepEqual(message, closedBattleMessage);
          } catch(e) {
            reject(e);
          }

          sawProcessedEvent = true;
          resolve();
        });
        setTimeout(() => {
          if (sawProcessedEvent) return;
          reject(new Error('Timeout exceeded to see processedClosedBattle message on app event bus!'));
        }, 1000);
      }));
    });
  });


  it('marks critters as experienced after a closedBattle message', function() {
    assert.isOk(openBattleMessage, 'Expected test suite to have set openBattleMessage');
    assert.isOk(closedBattleMessage, 'Expected test suite to have set closedBattleMessage');

    return new Promise((resolve, reject) => {
      request(app)
      .get(`/api/critter/${openBattleMessage.critters[0].id}`)
      .expect(200)
      .expect(function(res) {
        assert.equal(res.body.id, openBattleMessage.critters[0].id);
        assert.isAbove(res.body.experience, 0);
        assert.equal(res.body.is_out_fighting, 0);
        assert.equal(res.body.num_wins, 1);
        assert.equal(res.body.num_losses, 0);
      })
      .end((error) => error ? reject(error) : resolve());
    })
    .then(() => new Promise((resolve, reject) => {
      request(app)
      .get(`/api/critter/${openBattleMessage.critters[1].id}`)
      .expect(200)
      .expect(function(res) {
        assert.equal(res.body.id, openBattleMessage.critters[1].id);
        assert.isAbove(res.body.experience, 0);
        assert.equal(res.body.is_out_fighting, 0);
        assert.equal(res.body.num_wins, 0);
        assert.equal(res.body.num_losses, 1);
      })
      .end((error) => error ? reject(error) : resolve());
    }));
  });


  it('marks battle as complete after a closedBattle message', function() {
    assert.isOk(openBattleMessage, 'Expected test suite to have set openBattleMessage');
    assert.isOk(closedBattleMessage, 'Expected test suite to have set closedBattleMessage');

    return new Promise((resolve, reject) => {
      request(app)
      .get(`/api/battle/${openBattleMessage.battle.id}`)
      .expect(200)
      .expect(function(res) {
        assert.equal(res.body.id, openBattleMessage.battle.id);
        assert.equal(res.body.is_in_progress, 0);
        assert.equal(res.body.critter_a_score, closedBattleMessage.results.critter_a_score);
        assert.equal(res.body.critter_b_score, closedBattleMessage.results.critter_b_score);
        assert.equal(res.body.critter_a_won, 1);
      })
      .end((error) => error ? reject(error) : resolve());
    });
  });
});