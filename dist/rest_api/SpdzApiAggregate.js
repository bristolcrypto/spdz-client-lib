'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.allProxiesConnected = exports.sendInputsToProxies = exports.consumeDataFromProxies = exports.disconnectFromSPDZ = exports.checkProxies = exports.connectToSPDZ = undefined;

var _SpdzApi = require('./SpdzApi');

var _crypto = require('../crypto');

var _ProxyStatusCodes = require('./ProxyStatusCodes');

var _ProxyStatusCodes2 = _interopRequireDefault(_ProxyStatusCodes);

var _binary = require('../utility/binary');

var _logging = require('../utility/logging');

var _logging2 = _interopRequireDefault(_logging);

var _verifyRequiredKeys = require('../utility/verifyRequiredKeys');

var _verifyRequiredKeys2 = _interopRequireDefault(_verifyRequiredKeys);

var _ClientIds = require('./ClientIds');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @description Run the connection setup to establish the TCP connection between the SPDZ Proxy and the SPDZ Engine for all SPDZ proxy servers.
 * Returns the results for all connections in an array. Use allProxiesConnected to check result. Note that this is a stateful request as the clientId is stored and used to identify which TCP connection to use for subsequent requests. Calling again will replace the clientId.
 * See SPDZ instructions listen, acceptclientconnection and regint.read_client_public_key.
 * 
 * @param {String[]} spdzProxyUrlList - array of urls, one per SPDZ proxy
 * @param {String} spdzApiRoot - api path e.g. /spdzapi
 * @param {String} [clientId] - optional client id, assumes same id used for all proxies. If not supplied a client id will be generated per proxy.
 * @param {String} [clientPublicKey] - optional 64 byte hex string representing the client public key and used to encrypt traffic if set.
 * 
 * @returns {Object[]} result[] - a promise which resolves to a list of objects once all connection setup requests are finished.
 * @returns {String} result.id - position in spdzProxyUrlList
 * @returns {ProxyStatusCode} result.status - connection result for this proxy
 * @returns {String} result.generatedClientId - the client id used by the SPDZ Proxy to identify the connection.
 * 
 * @example Connect to spdz engines:
 * 
 * import { connectToSPDZ } from 'spdz-client-lib/dist/rest_api'
 * 
 * connectToSPDZ(['http://spdzproxy0', 'http://spdzproxy1'], '/spdzapi', 
 *                'b979d4508acd90156353dee3f7de36608432eeba7b37bd363ca9427d4b684748',
 *                'b979d4508acd90156353dee3f7de36608432eeba7b37bd363ca9427d4b684748')
 * .then(values => {
 *   if (allProxiesConnected(values)) {
 *     console.log('All proxies connected') 
 *   }
 *   else {
 *     console.log('Unable to connect to all Spdz Proxy Servers', values)
 *   }
 * })
 * @access public
 */
var connectToSPDZ = function connectToSPDZ(spdzProxyUrlList, spdzApiRoot) {
  var clientId = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;
  var clientPublicKey = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : undefined;

  (0, _ClientIds.resetClientIds)();
  var connectList = spdzProxyUrlList.map(function (url, index) {
    return (0, _SpdzApi.connectProxyToEngine)(url, spdzApiRoot, clientId, clientPublicKey).then(function (generatedClientId) {
      (0, _ClientIds.storeClientId)(url, generatedClientId);
      return {
        id: index,
        status: _ProxyStatusCodes2.default.Connected,
        clientId: generatedClientId
      };
    }).catch(function (ex) {
      _logging2.default.debug('Unable to successfully run connection setup.', ex.reason ? ex.reason.message : ex.message);
      return { id: index, status: _ProxyStatusCodes2.default.Failure };
    });
  });

  return Promise.all(connectList);
};

/**
 * @description Run check on status of connections for all spdz proxy servers for this client.
 * 
 * @param {String[]} spdzProxyUrlList - array of urls, one per SPDZ proxy
 * @param {String} spdzApiRoot - api path e.g. /spdzapi
 * 
 * @returns {Object[]} result[] - a promise which resolves to a list of objects once all status check requests are finished.
 * @returns {String} result.id - position in spdzProxyUrlList
 * @returns {ProxyStatusCode} result.status - connection result for this proxy
 * 
 * @example Check status of connections:
 * 
 * import { checkProxies } from 'spdz-client-lib/dist/rest_api'
 * 
 * checkProxies(['http://spdzproxy0', 'http://spdzproxy1'])
 * .then(values => {
 *     console.log('Proxy connection status is ', values) 
 * })
 * @access public
 */
/**
 * Aggregated SPDZ REST API functions to communicate with all SPDZ proxies.
 * Stateful as stores/resets clientId on calling connectToSPDZ
 *  Removes clientId on calling disconnectFromSPDZ.
 */
var checkProxies = function checkProxies(spdzProxyUrlList, spdzApiRoot) {
  var checkList = spdzProxyUrlList.map(function (url, index) {
    if (!(0, _ClientIds.clientIdExists)(url)) {
      return Promise.resolve({
        id: index,
        status: _ProxyStatusCodes2.default.Failure
      });
    }

    return (0, _SpdzApi.checkEngineConnection)(url, spdzApiRoot, (0, _ClientIds.getClientId)(url)).then(function () {
      return { id: index, status: _ProxyStatusCodes2.default.Connected };
    }).catch(function () {
      return { id: index, status: _ProxyStatusCodes2.default.Disconnected };
    });
  });

  return Promise.all(checkList);
};

/**
 * @description Disconnect, closing the TCP connection between the SPDZ Proxy and the SPDZ Engine.
 * 
 * @param {Object[]} spdzProxyList - Array of objects, one per SPDZ Proxy
 * @param {String} spdzProxyList.url - URL of proxy
 * @param {String} spdzApiRoot path for spdz api
 * 
 * @returns {Object[]} result[] - a promise which resolves to a list of objects once all disconnection requests are finished.
 * @returns {String} result.id - position in spdzProxyList
 * @returns {ProxyStatusCode} result.status - connection result for this proxy
 * 
 * @example Disconnect:
 * 
 * import { disconnectFromSPDZ } from 'spdz-client-lib/dist/rest_api'
 * 
 * disconnectFromSPDZ([{url: http://spdzproxy0}, {url: http://spdzproxy0}], '/spdzapi')
 * .then(values => {
 *    console.log('Disconnect from SPDZ results', values)
 * })
 * 
 * @access public
 */
var disconnectFromSPDZ = function disconnectFromSPDZ(spdzProxyList, spdzApiRoot) {
  if (!(0, _verifyRequiredKeys2.default)(spdzProxyList, 'url')) {
    return Promise.reject(new Error('Each spdzProxyList entry must contain keys: url.'));
  }

  var disconnectList = spdzProxyList.map(function (proxy, index) {
    if (!(0, _ClientIds.clientIdExists)(proxy.url)) {
      return Promise.resolve({
        id: index,
        status: _ProxyStatusCodes2.default.Disconnected
      });
    }
    return (0, _SpdzApi.disconnectProxyFromEngine)(proxy.url, spdzApiRoot, (0, _ClientIds.getClientId)(proxy.url)).then(function () {
      (0, _ClientIds.removeClientId)(proxy.url);
      return { id: index, status: _ProxyStatusCodes2.default.Disconnected };
    }).catch(function () {
      (0, _ClientIds.removeClientId)(proxy.url);
      return { id: index, status: _ProxyStatusCodes2.default.Disconnected };
    });
  });

  return Promise.all(disconnectList);
};

/**
 * @description Consume binary data sent by SPDZ engines to the SPDZ proxy buffers. This is a low level function which does not parse the SPDZ binary data. See higher level functions, for example retrieveRegIntsAsHexString or sendInputsWithShares.
 * 
 * @param {Object[]} spdzProxyList - Array of objects, one per SPDZ Proxy
 * @param {String} spdzProxyList.url - URL of proxy
 * @param {String} [spdzProxyList.encryptionKey] - optional precomputed encryption key, to decrypt SPDZ message.
 * @param {String} spdzApiRoot path for spdz api
 * @param {boolean} encrypted if true decrypt payload with encryptionKey
 * @param {Integer} [waitTimeoutMs=0] time to wait in ms for data to become available.
 * 
 * @returns {Uint8Array[]} Promise which is thenable and resolves to a list of Uint8Array buffers containing decrypted SPDZ output. Array follows the order of spdzProxyUrlList. Rejects with a NoContentError if no data is available to consume, this can be used to detect not ready yet and retry.
 * 
 * @example Consume data:
 * 
 * import { consumeDataFromProxies } from 'spdz-client-lib/dist/rest_api'
 * 
 * consumeDataFromProxies([{url: http://spdzproxy0, encryptionKey: 'abc'},
 *                                           {url: http://spdzproxy0, encryptionKey: 'abc'}],
 *                                          '/spdzapi', true, waitTimeoutMs=2000)
 * .then(buffers => {
 *   // process buffers, extract out values and compare or combine across proxies.
 *  })
 * .catch(err => {
 *   if (err instanceof NoContentError) {
 *     console.log('No data available')
 *   } else {
 *     console.log(`Error consuming data from SPDZ proxies. ${err.message}`)
 *   }
 * })
 * 
 * @access public
 */
var consumeDataFromProxies = function consumeDataFromProxies(spdzProxyList, spdzApiRoot, encrypted) {
  var waitTimeoutMs = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;

  if (!(0, _verifyRequiredKeys2.default)(spdzProxyList, 'url')) {
    return Promise.reject(new Error('Each spdzProxyList entry must contain keys: url.'));
  }

  var consumeList = spdzProxyList.map(function (proxy) {
    if (!(0, _ClientIds.clientIdExists)(proxy.url)) {
      return Promise.reject(new Error('Not connected to SPDZ for proxy ' + proxy.url + '.'));
    }

    return (0, _SpdzApi.consumeDataFromProxy)(proxy.url, spdzApiRoot, (0, _ClientIds.getClientId)(proxy.url), waitTimeoutMs).then(function (binaryPayload) {
      return encrypted ? (0, _crypto.decrypt)(proxy.encryptionKey, binaryPayload) : binaryPayload;
    });
  });

  return Promise.all(consumeList);
};

/**
 * Manage sending 1 or more inputs to each SPDZ proxy
 * 
 * Seems counter intuitive to send the same inputs to each SPDZ proxy (where is the sharing?), but SPDZ runs a 
 * protocol to split out the input using the local share and a special - operator which behaves differently 
 * depending on party number. 
 * 
 * @param {spdzProxyList} List of objects containing keys for url, one per SPDZ proxy.
 * @param {inputList} List of Gfp types, input plus all shares.
 * @returns Promise with empty return if all OK or rejects with error
 */
var sendInputsToProxies = function sendInputsToProxies(spdzProxyList, spdzApiRoot, inputList) {
  if (!(0, _verifyRequiredKeys2.default)(spdzProxyList, 'url')) {
    return Promise.reject(new Error('Each spdzProxyList entry must contain keys: url.'));
  }

  var payload = inputList.map(function (gfpInput) {
    return (0, _binary.base64Encode)(gfpInput.toNativeHexString());
  });

  var sendInputsList = spdzProxyList.map(function (proxy) {
    if (!(0, _ClientIds.clientIdExists)(proxy.url)) {
      return Promise.reject(new Error('Not connected to SPDZ for proxy ' + proxy.url + '.'));
    }

    return (0, _SpdzApi.sendDataToProxy)(proxy.url, spdzApiRoot, (0, _ClientIds.getClientId)(proxy.url), JSON.stringify(payload));
  });

  return Promise.all(sendInputsList);
};

/**
 * @description Convenience function to extract overall connection status from list of SPDZ Proxy connected status.
 * 
 * @param {Object[]} spdzConnectionStatusList - Array of connection status objects.
 * @param {ProxyStatusCode} spdzConnectionStatusList.status - The proxy status.
 * 
 * @returns {boolean} true if all connected (ProxyStatusCodes.Connected), otherwise false.
 * 
 * @example Check status of connections:
 * 
 * import { allProxiesConnected } from 'spdz-client-lib/dist/rest_api'
 * 
 * const connected = allProxiesConnected([{status: 2},{status: 2}])
 * console.log("Connected status ", connected)
 * @access public
 */
var allProxiesConnected = function allProxiesConnected(spdzConnectionStatusList) {
  if (spdzConnectionStatusList.size === 0) {
    return false;
  }

  return spdzConnectionStatusList.filter(function (spdzProxyConnection) {
    return spdzProxyConnection.status === _ProxyStatusCodes2.default.Connected;
  }).length === spdzConnectionStatusList.length;
};

exports.connectToSPDZ = connectToSPDZ;
exports.checkProxies = checkProxies;
exports.disconnectFromSPDZ = disconnectFromSPDZ;
exports.consumeDataFromProxies = consumeDataFromProxies;
exports.sendInputsToProxies = sendInputsToProxies;
exports.allProxiesConnected = allProxiesConnected;