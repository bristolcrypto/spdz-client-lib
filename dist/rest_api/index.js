'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sendInputsWithShares = exports.retrieveRegIntsAsHexString = exports.ProxyStatusCodes = exports.NoContentError = exports.disconnectFromSPDZ = exports.consumeDataFromProxies = exports.connectToSPDZ = exports.checkProxies = exports.allProxiesConnected = undefined;

require('../polyfills');

var _SpdzApiAggregate = require('./SpdzApiAggregate');

var _SpdzApiHelper = require('./SpdzApiHelper');

var _NoContentError = require('./NoContentError');

var _NoContentError2 = _interopRequireDefault(_NoContentError);

var _ProxyStatusCodes = require('./ProxyStatusCodes');

var _ProxyStatusCodes2 = _interopRequireDefault(_ProxyStatusCodes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.allProxiesConnected = _SpdzApiAggregate.allProxiesConnected;
exports.checkProxies = _SpdzApiAggregate.checkProxies;
exports.connectToSPDZ = _SpdzApiAggregate.connectToSPDZ;
exports.consumeDataFromProxies = _SpdzApiAggregate.consumeDataFromProxies;
exports.disconnectFromSPDZ = _SpdzApiAggregate.disconnectFromSPDZ;
exports.NoContentError = _NoContentError2.default;
exports.ProxyStatusCodes = _ProxyStatusCodes2.default;
exports.retrieveRegIntsAsHexString = _SpdzApiHelper.retrieveRegIntsAsHexString;
exports.sendInputsWithShares = _SpdzApiHelper.sendInputsWithShares; // Entry point for REST calls to SPDZ Proxy

// Polyfills comes from create-react-app