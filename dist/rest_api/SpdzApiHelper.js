'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sendInputsWithShares = exports.retrieveRegIntsAsHexString = exports.retrieveShares = undefined;

var _SpdzApiAggregate = require('./SpdzApiAggregate');

var _binaryToShare = require('../type_mapping/binaryToShare');

var _binaryToShare2 = _interopRequireDefault(_binaryToShare);

var _Gfp = require('../math/Gfp');

var _binaryToArray = require('../type_mapping/binaryToArray');

var _verifyRequiredKeys = require('../utility/verifyRequiredKeys');

var _verifyRequiredKeys2 = _interopRequireDefault(_verifyRequiredKeys);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Retrieve shares to be used to send input to SPDZ proxies.
 * Wait for all SPDZ proxies to send shares rejecting if an error (no timeout)
 * Validate the triples, sum them
 * @param {Number} inputNum number of shares required and so number of triples expected.
 * @param {Boolean} encrypted to indicate if result will be encrypted.
 * @param {Array<{}>} spdzProxyList of objects containing keys for url,  
 *                        encryptionKey (optional) for each proxy 
 * @param {String} spdzApiRoot url path
 * @param {Number} waitTimeoutMs Optional wait timeout ms to wait for shares to be available.
 * @returns Promise resolved with list of shares (length inputNum) or reject with Error
 */
var retrieveShares = function retrieveShares(inputNum, encrypted, spdzProxyList, spdzApiRoot) {
  var waitTimeoutMs = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 0;

  if (!(0, _verifyRequiredKeys2.default)(spdzProxyList, 'url')) {
    return Promise.reject(new Error('Each spdzProxyList entry must contain keys: url.'));
  }

  return (0, _SpdzApiAggregate.consumeDataFromProxies)(spdzProxyList, spdzApiRoot, encrypted, waitTimeoutMs).then(function (values) {
    try {
      var shareList = (0, _binaryToShare2.default)(values);
      if (shareList.length !== inputNum) {
        throw new Error('Expected ' + inputNum + ' shares but got ' + shareList.length + '.');
      }
      return Promise.resolve(shareList);
    } catch (err) {
      return Promise.reject(err);
    }
  });
};

/**
 * @description Retrieve a result given as a number of 32 bit integer (regint) values and return as a hex string. All SPDZ Engines are expected to reveal locally and return the same result.
 * See SPDZ instruction regint.write_to_socket.
 * @param {Object[]} spdzProxyList - Array of objects, one per SPDZ Proxy
 * @param {String} spdzProxyList.url - URL of proxy
 * @param {String} [spdzProxyList.encryptionKey] - optional precomputed encryption key, to decrypt SPDZ message.
 * @param {String} spdzApiRoot path for spdz api
 * @param {Number} regIntCount number of regint values expecting in result
 * @param {boolean} encrypted - are the correlated random triples encrypted, true or false. Dependant on connectToSPDZ setup.
 * 
 * @returns {String} Promise resolves to a single result as a hex string.
 * 
 * @example Retrieve integers as hex string:
 * 
 * import { retrieveRegIntsAsHexString } from 'spdz-client-lib/dist/rest_api'
 * 
 * retrieveRegIntsAsHexString([{url: http://spdzproxy0, encryptionKey: 'abc'},
 *                             {url: http://spdzproxy0, encryptionKey: 'abc'}],
 *                            '/spdzapi', 8, true)
 * .then(result => {
 *   console.log(`Received result ${result}.`)
 *  })
 * .catch(err => {
 *  console.log(`Error receiving result. ${err.message}`)
 * })
 * 
 * @access public
 */
/**
 * Higher level functions to interact with the SPDZ api.
 */
var retrieveRegIntsAsHexString = function retrieveRegIntsAsHexString(spdzProxyList, spdzApiRoot, regIntCount) {
  var encrypted = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

  if (!(0, _verifyRequiredKeys2.default)(spdzProxyList, 'url')) {
    return Promise.reject(new Error('Each spdzProxyList entry must contain keys: url.'));
  }

  return (0, _SpdzApiAggregate.consumeDataFromProxies)(spdzProxyList, spdzApiRoot, encrypted).then(function (values) {
    if (spdzProxyList.length !== values.length) {
      return Promise.reject(new Error('Expecting ' + spdzProxyList.length + ' results, 1 from each SPDZ engine, got ' + values.length + '.'));
    }
    try {
      return Promise.resolve((0, _binaryToArray.regIntToHexString)(values, regIntCount));
    } catch (err) {
      return Promise.reject(err);
    }
  });
};

/**
 * @description Send an array of integers to all SPDZ Proxies in secret shared form (SPDZ sint). This first retrieves the expected number of correlated random triples from the SPDZ Engines.
 * See SPDZ instruction sint.receive_from_client.
 * @param {Integer[]} inputList - an Array of integer values to be secret shared.
 * @param {boolean} encrypted - are the correlated random triples encrypted, true or false. Dependant on connectToSPDZ setup.
 * @param {Object[]} spdzProxyList - Array of objects, one per SPDZ Proxy
 * @param {String} spdzProxyList.url - URL of proxy
 * @param {String} [spdzProxyList.encryptionKey] - optional precomputed encryption key, to decrypt SPDZ message.
 * @param {String} spdzApiRoot path for spdz api
 * @param {Integer} [waitTimeoutMs=0] time to wait in ms for data sent by SPDZ to become available.
 * 
 * @return {Promise} which resolves to an empty function.
 * 
 * @example Send inputs:
 * 
 * import { sendInputsWithShares } from 'spdz-client-lib/dist/rest_api'
 * 
 * sendInputsWithShares([123, 456, 777], true,
 *                      [{url: http://spdzproxy0, encryptionKey: 'abc'},
 *                       {url: http://spdzproxy0, encryptionKey: 'abc'}],
 *                      '/spdzapi', waitTimeoutMs=2000)
 * .then(() => {
 *   console.log('Sent inputs successfully')
 *  })
 * .catch(err => {
 *  console.log(`Error sending inputs. ${err.message}`)
 * })
 * 
 * @access public
 */
var sendInputsWithShares = function sendInputsWithShares(inputList, encrypted, spdzProxyList, spdzApiRoot) {
  var waitTimeoutMs = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 0;

  if (!(0, _verifyRequiredKeys2.default)(spdzProxyList, 'url')) {
    return Promise.reject(new Error('Each spdzProxyList entry must contain keys: url.'));
  }

  return retrieveShares(inputList.length, encrypted, spdzProxyList, spdzApiRoot, waitTimeoutMs).then(function (shareList) {
    return inputList.map(function (input, i) {
      return shareList[i].add(_Gfp.Gfp.fromUserInput(input));
    });
  }).then(function (sharedInputList) {
    return (0, _SpdzApiAggregate.sendInputsToProxies)(spdzProxyList, spdzApiRoot, sharedInputList);
  });
};

exports.retrieveShares = retrieveShares;
exports.retrieveRegIntsAsHexString = retrieveRegIntsAsHexString;
exports.sendInputsWithShares = sendInputsWithShares;