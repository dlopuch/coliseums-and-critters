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


describe('API:battles', function() {
  let app;
  before('assign app', () => promiseManagementService.then(readyApp => app = readyApp));

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
          // Here we register a listener on the job queue and make sure the queue battle message appears
          new Promise((resolve, reject) => {
            let gotMessage = false;
            messageQs.openBattles.subscribe(function(message) {
              promiseBattle.then(battle => {
                try {
                  assert.deepEqual(message, {
                    battle,
                    critters: [critterA, critterB]
                  });
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

});