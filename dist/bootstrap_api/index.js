'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.runSpdzProgram = exports.bootstrapConnectSetup = undefined;

var _socket = require('socket.io-client');

var _socket2 = _interopRequireDefault(_socket);

var _logging = require('../utility/logging');

var _logging2 = _interopRequireDefault(_logging);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Client side interface to a single SPDZ Proxy to bootstrap a SPDZ process.
 */
var clientSocket = void 0;

/**
 * @description Manage web socket connection to a SPDZ proxy for a specific SPDZ server. Designed for bootstrapping SPDZ processes.
 * 
 * @param {String} url - URL of the SPDZ Proxy.
 * @param {Object} userOptions socket.io config options to override defaults. 
 * 
 * @returns {Promise} which resolves with no params if connected OK or rejects with reason.
 * 
 * @example Connect to the SPDZ Proxy to allow SPDZ processes to be started:
 * 
 * const spdzBootStrap = require('spdz-client-lib/dist/bootstrap_api')
 * 
 * spdzBootStrap.bootstrapConnectSetup('http://spdzproxy1', {})
 * .then(() => {
 *   console.log('Connected successfully')
 * })
 * .catch(err => {
 *   logger.warn(`Unable to connect to SPDZ proxy. ${err.message}`)
 * })
 * @access public
 */
var bootstrapConnectSetup = function bootstrapConnectSetup(url) {
  var userOptions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var connectOptions = Object.assign({}, {
    path: '/spdz/socket.io',
    reconnection: true,
    reconnectionAttempts: 12,
    reconnectionDelay: 5000,
    timeout: 2000,
    autoConnect: true
  }, userOptions);

  _logging2.default.debug('About to request web socket for SPDZ bootstrap connection to ' + url + ' with options ' + JSON.stringify(connectOptions) + '.');
  var namespace = '/spdzstart';

  if (clientSocket !== undefined) {
    return Promise.resolve();
  } else {
    return new Promise(function (resolve, reject) {
      var socket = (0, _socket2.default)(url + namespace, connectOptions);

      socket.on('connect', function () {
        clientSocket = socket;
        _logging2.default.debug('SPDZ proxy bootstrap connection made.');
        resolve();
      });

      socket.on('connect_error', function () {
        clientSocket = undefined;
        _logging2.default.debug('SPDZ proxy bootstrap connection error.');
        reject(new Error('Connection error, connecting to SPDZ proxy for bootstrap.'));
      });

      socket.on('connect_timeout', function () {
        clientSocket = undefined;
        _logging2.default.debug('SPDZ proxy bootstrap connection timeout.');
        reject(new Error('Connection timeout, connectiing to SPDZ proxy for bootstrap.'));
      });

      socket.on('disconnect', function () {
        _logging2.default.debug('SPDZ proxy bootstrap disconnect.');
        clientSocket = undefined;
      });
    });
  }
};

/**
 * @description Request a single SPDZ Proxy to start a SPDZ process running the requested program. 
 * Assumes that bootstrapConnectSetup has been run. 
 * 
 * @param {String} spdzProgram The SPDZ program to start.
 * @param {boolean} forceStart If already running then force stop the process.
 * 
 * @returns {Promise} resolves with no params if runs program or rejects with a reason.
 * 
 * @example Run a SPDZ program, stopping any already runnng program:
 * 
 * const spdzBootStrap = require('spdz-client-lib/dist/bootstrap_api')
 * 
 * spdzBootStrap.runSpdzProgram('monthly_trend', true)
 * .then(() => {
 *   console.log('Program monthly_trend started successfully')
 * })
 * .catch(err => {
 *   logger.warn(`Unable to start program monthly_trend. ${err.message}`)
 * })
 * @access public
 */
var runSpdzProgram = function runSpdzProgram(spdzProgram, forceStart) {
  if (clientSocket === undefined) {
    return Promise.reject(new Error('Unable to run SPDZ program, not connected to SPDZ Proxy.'));
  }

  return new Promise(function (resolve, reject) {
    clientSocket.emit('startSpdz', spdzProgram, forceStart);

    clientSocket.on('startSpdz_result', function (response) {
      if (response.status === 0) {
        resolve();
      } else {
        reject(new Error('Unable to run SPDZ program ' + spdzProgram + '. ' + response.err));
      }
    });
  });
};

exports.bootstrapConnectSetup = bootstrapConnectSetup;
exports.runSpdzProgram = runSpdzProgram;