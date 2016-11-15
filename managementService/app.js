var express = require('express');
var path = require('path');
var loggerMw = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

require('./io/logger');
const log = require('winston');

require('./io/db').dbReady
  .then(() => log.info('DB ready'))
  .catch((error) => log.error('Error initializing DB!', { error: error.stack }));

var apiRoutes = require('./routes/api');

var app = express();

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
  res.json({ error: err.message, stack: err.stack, details: err });
});

module.exports = app;
