const winston = require('winston');

// Configures default winston logger.  Other files don't need to reference this one, they can just:
//   const log = require('winston');
//   log.info('foo', { bar: 'baz'} );

winston.configure({
  transports: [
    new (winston.transports.Console)({
      colorize: true,
      label: 'ManagementService'
    })
  ]
});