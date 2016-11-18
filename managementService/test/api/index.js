"use strict";

/* API / Integration Tests
 * ----------
 * Here we spin up the management service, connecting to the DB and RabbitMQ queue server, and test end-to-end
 * integration using the API access points.  RabbitMQ messages are mocked using a mock job processor.
 */
const promiseManagementService = require('../../app');

describe('ManagementService', function() {
  // TODO: In a production codebase, we would create a fresh database and initialize it, perhaps even
  // before each individual test suite depending on integration testing strategy.
  // before('initializes database', function() { });

  before('spins up successfully', function() {
    return promiseManagementService;
  });

  require('./apiCritters');
  require('./battlesApiAndQueue');

});