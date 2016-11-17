var express = require('express');
var path = require('path');
var loggerMw = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
const Promise = require('bluebird');

// Better require naming
global.requireCommon = name => require(__dirname + '/../common-lib/' + name);

const initPromises = [];

require('./io/logger');
const log = require('winston');

let dbReady = require('./io/db').dbReady;
initPromises.push(dbReady);

dbReady
.then(() => log.info('DB ready'))
.catch((error) => log.error('Error initializing DB!', { error: error.stack }));

let messageQueuesReady = require('../common-lib/messageQueues');
initPromises.push(messageQueuesReady);

var app = express();

// Message Queue Listeners
require('./business/battleListeners')(app);


// REST api:
var apiRoutes = require('./routes/api');


app.use(loggerMw('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/api', apiRoutes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// catch-all json error handler
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    error: err.message,

    // Flag for API gateway that this error can be passed up to user
    userError: err.userError,

    stack: err.stack,
    details: err
  });
});


// Export the app when all initializations are ready
module.exports = Promise.all(initPromises).then(() => app);
