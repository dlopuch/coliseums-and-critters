"use strict";
const request = require('supertest');
const assert = require('chai').assert;

describe('critters-and-coliseums integration test suite', function() {

  before('spins up coliseumService', function() {
    return require('../coliseumService/app');
  });

  let app;

  before('spins up managementService', function() {
    require('../managementService/app').then(appInstance => app = appInstance)
  });

  let critterA;
  let critterB;

  it('allocates critters', function() {
    return new Promise((resolve, reject) => {
      request(app)
      .post('/api/critter')
      .expect(200)
      .expect(function(res) {
        assert.equal(res.body.id.substring(0, 5), 'crit-');
        critterA = res.body;

        // Expect critterB will be out fighting when battle starts
        assert.equal(critterA.is_out_fighting, 0);
        critterA.is_out_fighting = 1;
      })
      .end((error) => error ? reject(error) : resolve())
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
  });

  // Taps into the app's event bus to get fulfilled when the closedBattle event has come back
  let promiseBattleProcessed;
  let battle;

  it('creates a new battle with those critters', function() {
    return new Promise((resolve, reject) => {
      request(app)
      .post('/api/battle')
      .send({
        critterAId: critterA.id,
        critterBId: critterB.id,
      })
      .expect(200)
      .expect(function (res) {
        assert.equal(res.body.id.substring(0, 4), 'bat-');
        battle = res.body; // save battle for later
      })
      .end((error) => error ? reject(error) : resolve())
    })
    .then(() => {
      // Okay, with the post response, the openBattle message should be on the event queue.  Now we subscribe to
      // the app's event bus and create a promise for when the closedBattle message comes in.
      // This will be used in a later test
      promiseBattleProcessed = new Promise((resolve, reject) => {
        app.once('processedClosedBattle', closedBattleMessage => resolve(closedBattleMessage));
        setTimeout(() => reject(new Error('Expected to have seen a closedBattle event by now')), 4000)
      });

      return 1;
    });
  });

  it('sees the battle as in-progress (expensive CPU)', function(done) {
    request(app)
    .get(`/api/battle/${battle.id}`)
    .expect(200)
    .expect(function (res) {
      assert.equal(res.body.id, battle.id);
      assert.equal(res.body.is_in_progress, 1);
    })
    .end(done)
  });

  let battleResults;

  it('waits until battle calculations are done and results get processed', function() {
    this.timeout(5000);

    return promiseBattleProcessed
    .then(() => new Promise((resolve, reject) => {
      request(app)
      .get(`/api/battle/${battle.id}`)
      .expect(200)
      .expect(function (res) {
        assert.equal(res.body.id, battle.id);
        assert.equal(res.body.is_in_progress, 0);

        battleResults = res.body;
      })
      .end((error) => error ? reject(error) : resolve())
    }));
  });


  it('sees that critter A is experienced as a result', function(done) {
    request(app)
    .get(`/api/critter/${critterA.id}`)
    .expect(200)
    .expect(function(res) {
      assert.isAbove(res.body.experience, 0);
      assert.equal(res.body.num_wins, battleResults.critter_a_won ? 1 : 0);
      assert.equal(res.body.num_losses, battleResults.critter_a_won ? 0 : 1);
      critterA = res.body;
    })
    .end(done);
  });

  it('sees that critter B is experienced as a result', function(done) {
    request(app)
    .get(`/api/critter/${critterB.id}`)
    .expect(200)
    .expect(function(res) {
      assert.isAbove(res.body.experience, 0);
      assert.equal(res.body.num_wins, battleResults.critter_a_won ? 0 : 1);
      assert.equal(res.body.num_losses, battleResults.critter_a_won ? 1 : 0);
      critterB = res.body;
    })
    .end(done);
  });

  it('spits out data objects for closer inspection', function() {
    console.log('\n\nCHECK OUT SOME WUNDEROUS SUMMARY ENTITIES:\n------------------')
    console.log('Critter A:\n', critterA);
    console.log('Critter B:\n', critterB);
    console.log('Battle results:\n', battleResults)
  })

});