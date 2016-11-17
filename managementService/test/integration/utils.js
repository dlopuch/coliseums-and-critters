"use strict";

const messageQs = require('../../../common-lib/messageQueues');

/**
 * Executes a test promise chain with a message queue channel lifecycle-scoped to the duration of the test
 *
 * @param {function(messageQs)} promiseTest Function that returns a promise chain of the test functionality
 * @return {Promise} That gets resolved when test finishes and connections cleaned up
 */
exports.executeWithTestScopedQueues = function(promiseTest) {
  let testQs;

  return messageQs
  .then(qs => qs.promiseNewQueuesChannel())
  .then(newQsChannel => testQs = newQsChannel)
  .then(() => {
    let test = promiseTest(testQs);
    if (!test || !test.then) {
      throw new Error('promiseTest function must return a promise chain!');
    }
    return test;
  })
  .then(() => testQs.close())
  .catch(error => {
    testQs.close();
    return Promise.reject(error);
  });
};