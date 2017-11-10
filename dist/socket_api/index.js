'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sendSecretInputsPromise = exports.sendClearInputsPromise = exports.disconnectFromSpdzPartyPromise = exports.connectToSpdzProxyPromise = exports.connectToSpdzPartyPromise = undefined;

require('../polyfills');

var _promisify = require('./promisify');

/**
 * Entry point for WebSocket calls to SPDZ Proxy
 */

exports.connectToSpdzPartyPromise = _promisify.connectToSpdzPartyPromise;
exports.connectToSpdzProxyPromise = _promisify.connectToSpdzProxyPromise;
exports.disconnectFromSpdzPartyPromise = _promisify.disconnectFromSpdzPartyPromise;
exports.sendClearInputsPromise = _promisify.sendClearInputsPromise;
exports.sendSecretInputsPromise = _promisify.sendSecretInputsPromise;