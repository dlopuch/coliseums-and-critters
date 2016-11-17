"use strict";

/**
 * Tests the critter API routes
 */

const request = require('supertest');
const assert = require('chai').assert;

const promiseManagementService = require('../../app');

describe('API:critters', function() {
  let app;
  before('assign app', () => promiseManagementService.then(readyApp => app = readyApp));

  it('POST /critter: allocates a new critter', function(done) {
    request(app)
    .post('/api/critter')
    .expect(200)
    .expect(function(res) {
      assert.equal(res.body.id.substring(0, 5), 'crit-');
      assert.equal(res.body.id.length, 41); // uuid with prefix
      assert.equal(res.body.experience, 0);
      assert.equal(res.body.is_out_fighting, 0);
      assert.equal(res.body.num_wins, 0);
      assert.equal(res.body.num_losses, 0);
      assert.sameMembers(Object.keys(res.body.attributes), ['agility', 'senses', 'strength', 'wit']);
    })
    .end(done);
  });

  it('POST /critter: allocates a new critter with custom attributes', function(done) {
    request(app)
    .post('/api/critter')
    .send({ additionalAttributes: ['crispredGenes' ]})
    .expect(200)
    .expect(function(res) {
      assert.equal(res.body.id.substring(0, 5), 'crit-');
      assert.equal(res.body.id.length, 41); // uuid with prefix
      assert.equal(res.body.experience, 0);
      assert.equal(res.body.is_out_fighting, 0);
      assert.equal(res.body.num_wins, 0);
      assert.equal(res.body.num_losses, 0);
      assert.sameMembers(Object.keys(res.body.attributes), ['agility', 'senses', 'strength', 'wit', 'crispredGenes']);
    })
    .end(done);
  });

});
