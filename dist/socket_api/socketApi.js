'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sendInputsWithShares = exports.sendClearInputs = exports.disconnectFromSpdz = exports.connectToSpdz = exports.connectToSPDZProxy = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }(); /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * Client side interface to multiple SPDZ Proxies using web sockets.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * See promisify for wrapping as promises.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          */


var _baconjs = require('baconjs');

var _baconjs2 = _interopRequireDefault(_baconjs);

var _transform = require('./transform');

var _connectSetup3 = require('./connectSetup');

var _connectSetup4 = _interopRequireDefault(_connectSetup3);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Message bus to emit events to web sockets
var webSocketBus = _baconjs2.default.Bus();
// Message bus holds user input, processed and sent as share.
var userInputBus = _baconjs2.default.Bus();

// Side effect state to check if proxies connected, spdz connected.
var connectedToProxies = false;
var connectedToSpdz = false;

/**
 * Connect to multiple SPDZ proxies using a websocket interface.
 * 
 * Returns 4 rx streams:
  *  connectionStream: an event which indicates the proxy or spdz connection status.
 *   Each stream value contains an object with:
 *     { eventType: PROXY_CONNECT | SPDZ_CONNECT, status: true (==connected) or 
 *       false, msg: full status message }
 *
 *  clientResponseStream: the responses from client initiated actions, e.g.
 *   send input. Will wait for matched responses from all SPDZ engines.
 *   Each stream value contains an array of:
 *     { eventType: SEND_INPUT,
 *       status: true (send worked) or false,
 *       msg: full status msg }  
 * 
 *  spdzResultStream: the results returned by SPDZ where 
 *   each stream value contains an Array<Integers>.
 * 
 *  spdzErrorStream: errors as a result of SPDZ initiated messages, not
 *   directly related to a client initiated action.
 * 
 * @param {Object} userOptions to override socket.io connection options. 
 * @param {Array} proxyList array of objects {url, optional encryptionKey} 
 *
 * @returns {EventStream} connectionStream rx stream 
 * @returns {EventStream} clientResponseStream rx stream
 * @returns {EventStream} spdzResultStream rx stream
 * @returns {EventStream} spdzErrorStream rx stream
 */
var connectToSPDZProxy = function connectToSPDZProxy(userOptions) {
  for (var _len = arguments.length, proxyList = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    proxyList[_key - 1] = arguments[_key];
  }

  // Merge user options with defaults.
  var connectOptions = Object.assign({}, {
    path: '/spdz/socket.io',
    reconnection: true,
    reconnectionAttempts: 12,
    reconnectionDelay: 5000,
    timeout: 2000,
    autoConnect: true
  }, userOptions);

  var proxyConnectionStreamList = [];
  var spdzConnectionStreamList = [];
  var otherResponseStreamList = [];
  var sharesStreamList = [];
  var outputsStreamList = [];

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = proxyList[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var proxy = _step.value;

      var _connectSetup = (0, _connectSetup4.default)(connectOptions, proxy.url, proxy.encryptionKey, webSocketBus),
          _connectSetup2 = _slicedToArray(_connectSetup, 5),
          proxyConnectionStream = _connectSetup2[0],
          spdzConnectionStream = _connectSetup2[1],
          otherResponseStream = _connectSetup2[2],
          sharesStream = _connectSetup2[3],
          outputsStream = _connectSetup2[4];

      proxyConnectionStreamList.push(proxyConnectionStream);
      spdzConnectionStreamList.push(spdzConnectionStream);
      otherResponseStreamList.push(otherResponseStream);
      sharesStreamList.push(sharesStream);
      outputsStreamList.push(outputsStream);
    }

    // Combine connection events so that:
    // 1. wait until all proxies have replied with at least one event
    // 2. each time a proxy sends a connect/disconnect get a combined event of all latest proxy events.
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  var connectionStream = _baconjs2.default.mergeAll(_baconjs2.default.combineAsArray(proxyConnectionStreamList), _baconjs2.default.combineAsArray(spdzConnectionStreamList)).flatMap(function (value) {
    return (0, _transform.flattenResponseMessage)(value);
  });

  // keep latest connection status as state
  connectionStream.onValue(function (response) {
    if (response.eventType === _transform.EVENT_TYPE.PROXY_CONNECT) {
      connectedToProxies = response.status;
    } else if (response.eventType === _transform.EVENT_TYPE.SPDZ_CONNECT) {
      connectedToSpdz = response.status;
    }
  });

  // Combine each proxies rx stream with zip (meaning waits until all proxies send message to get matched responses).
  // Note errors are not combined, so each proxy error will be sent separately.
  var combinedOtherResponseStream = _baconjs2.default.zipAsArray(otherResponseStreamList);
  var combinedSharesStream = _baconjs2.default.zipAsArray(sharesStreamList);
  var combinedOutputsStream = _baconjs2.default.zipAsArray(outputsStreamList);

  // Convert arrays of binary buffers into array of Gfp shares
  var extractedSharesStream = combinedSharesStream.flatMap(_transform.extractValidateShares);

  // Convert arrays of binary buffers into array of numbers.
  var spdzResultStream = combinedOutputsStream.flatMap(_transform.convertOutput);

  // Capture errors which are not directly related to a client send, to allow client to report / act on them.
  var spdzErrorStream = _baconjs2.default.mergeAll(extractedSharesStream.errors(), spdzResultStream.errors());

  // Configure streams to send input combined with shares to websocket
  var sendValueStream = (0, _transform.setupSendInputShareStream)(userInputBus, extractedSharesStream, webSocketBus);

  // Extract out errors and convert into responses to be used by caller to
  // identify when send didn't work.
  var sendValueStreamErrors = sendValueStream.errors().flatMapError(function (v) {
    return [{ eventType: _transform.EVENT_TYPE.SEND_INPUT, status: false, msg: v }];
  });

  // Responses to client initiated actions
  var clientResponseStream = _baconjs2.default.mergeAll(combinedOtherResponseStream, sendValueStreamErrors).flatMap(function (value) {
    return (0, _transform.flattenResponseMessage)(value);
  });

  return [connectionStream, clientResponseStream, spdzResultStream, spdzErrorStream];
};

/**
 * Request a connection to all SPDZ engines.
 * @param {String} [publicKey] 256 bit public key as 64 byte hex string, optional if passed then encrypt comms.
 */
var connectToSpdz = function connectToSpdz() {
  var publicKey = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

  if (connectedToProxies) {
    webSocketBus.push({
      eventType: 'connectToSpdz',
      publicKey: publicKey
    });
  } else {
    throw new Error('Cannot run SPDZ connection if not connected to all SPDZ Proxies.');
  }
};

/**
 * Disconnect client from SPDZ engines.
 */
var disconnectFromSpdz = function disconnectFromSpdz() {
  if (connectedToSpdz) {
    webSocketBus.push({
      eventType: 'disconnectFromSpdz'
    });
  } else {
    throw new Error('Not connected to all SPDZ Engines.');
  }
};

/**
 * Send input to SPDZ. List supports integers and float point numbers (converted to fixed).
 * List must contain only 1 type.
 * @param {Array<Number>} inputList numbers to send to SPDZ. 
 */
var sendInputsWithShares = function sendInputsWithShares(inputList) {
  if (connectedToProxies && connectedToSpdz) {
    userInputBus.push((0, _transform.convertUserInput)(inputList));
  } else {
    throw new Error('Not connected to all SPDZ Proxies/Engines.');
  }
};

/**
 * Send clear (non secret) integers to SPDZ.
 * @param {Array<Number>} inputList Integers to send to SPDZ in clear.  
 * @param {String} spdzType int32 (default) or modp. 
 */
var sendClearInputs = function sendClearInputs(inputList) {
  var spdzType = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'int32';

  if (connectedToProxies && connectedToSpdz) {
    webSocketBus.push({
      eventType: 'sendData',
      dataType: spdzType,
      dataArray: (0, _transform.convertUserInput)(inputList)
    });
  } else {
    throw new Error('Not connected to all SPDZ Proxies/Engines.');
  }
};

exports.connectToSPDZProxy = connectToSPDZProxy;
exports.connectToSpdz = connectToSpdz;
exports.disconnectFromSpdz = disconnectFromSpdz;
exports.sendClearInputs = sendClearInputs;
exports.sendInputsWithShares = sendInputsWithShares;