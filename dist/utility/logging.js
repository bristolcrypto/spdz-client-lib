'use strict';

// Simulate a windson logger for the browser, using console.log.
// This is least worst option for node and browser - winston is node only.
// Set logging level in node with LOG_LEVEL env variable or set explicity with .level property.

/* eslint no-console: 0 */

var levels = { debug: 0, info: 1, warn: 2, error: 3 };

var timeStamp = function timeStamp() {
  var now = new Date();
  var pad = function pad(number) {
    var digits = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
    return number.toString().padStart(digits, '0');
  };

  return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T' + (pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds()) + '.' + pad(now.getMilliseconds(), 3));
};

/**
 * @description A simple logging library to write to the console, which operates in nodejs or the browser.
 *  Set the logging level with logger.level = debug | info | warn | error, or in node using the LOG_LEVEL env variable.
 *  Call with logger.<level>(msg, optional args). Set the log level to reveal / suppress debug messages in the spdz-client-lib.
 * 
 * @example Logging example:
 * 
 * const { logger } = require('../dist/utility')
 * logger.level = 'info'
 * 
 * logger.info('an info msg', var1, var2)
 * logger.debug('a debug msg') // Not printed to console.
 * 
 * @access public
 */
var logger = {};

var logMessage = function logMessage(msgLevel) {
  return function (msg) {
    for (var _len = arguments.length, objs = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      objs[_key - 1] = arguments[_key];
    }

    if (levels[msgLevel] >= levels[logger.level]) {
      var _console;

      (_console = console).log.apply(_console, [timeStamp(), msgLevel.toUpperCase(), msg].concat(objs));
    }
  };
};

logger.debug = logMessage('debug');
logger.info = logMessage('info');
logger.warn = logMessage('warn');
logger.error = logMessage('error');

logger.level = process.env.LOG_LEVEL || 'debug';

module.exports = logger;