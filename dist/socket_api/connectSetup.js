'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _socket = require('socket.io-client');

var _socket2 = _interopRequireDefault(_socket);

var _baconjs = require('baconjs');

var _baconjs2 = _interopRequireDefault(_baconjs);

var _transform = require('./transform');

var _logging = require('../utility/logging');

var _logging2 = _interopRequireDefault(_logging);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Run web socket connection to SPDZ proxy for a specific SPDZ server, using namespace /spdzapi.
 * Trap socket events and process into rx streams which are returned.
 * 
 * @param {Object} connectOptions socket.io connection options 
 * @param {String} url SPDZ Proxy URL (no namespace)
 * @param {String} encryptionKey session key agreed between client and SPDZ server. 
 *                 If undefined then assume SPDZ message not encrypted.
 * @param {EventStream} webSocketBus rx stream to push socket.emit events. 
 *
 * @returns {proxyConnectionStream} websocket connection events to the spdzproxy, both user initiated
 *                                  and auto reconnect, in an rx stream 
 * @returns {spdzConnectionStream} spdz connection events, both user initiated and spdz initiated in an rx stream. 
 * @returns {sendResponseStream} client response events, e.g. response to client sending inputs, in an rx stream. 
 * @returns {sharesStream} raw byte shares sent by spdz in an rx stream
 * @returns {outputsStream} raw byte outputs sent by spdz in an rx stream
 */
var connectSetup = function connectSetup(connectOptions, url, encryptionKey, webSocketBus) {
  _logging2.default.debug('About to request web socket connection to ' + url + ' with options ' + JSON.stringify(connectOptions) + '.');
  var namespace = '/spdzapi';
  var socket = (0, _socket2.default)(url + namespace, connectOptions);

  //***************************************
  // Wrap socket events in Bacon (reactive)
  //***************************************
  // Gather websocket connection messages from SPDZ Proxy into single stream
  // this includes client initiated connections and auto reconnects.
  var proxyConnectionStream = _baconjs2.default.fromBinder(function (sink) {
    socket.on('connect', function () {
      sink({
        eventType: _transform.EVENT_TYPE.PROXY_CONNECT,
        status: true,
        url: url,
        msg: 'SPDZ Proxy connection made.'
      });
    });

    socket.on('connect_error', function () {
      sink({
        eventType: _transform.EVENT_TYPE.PROXY_CONNECT,
        status: false,
        url: url,
        msg: 'Connection error.'
      });
    });

    socket.on('connect_timeout', function () {
      sink({
        eventType: _transform.EVENT_TYPE.PROXY_CONNECT,
        status: false,
        url: url,
        msg: 'Connection timeout.'
      });
    });

    socket.on('disconnect', function () {
      sink({
        eventType: _transform.EVENT_TYPE.PROXY_CONNECT,
        status: false,
        url: url,
        msg: 'Disconnected from SPDZ proxy.'
      });
    });

    //Used for unsubscribe tidy up
    return function () {};
  });

  // Trap spdz connect and disconnects, user initiated and spdz initiated
  var spdzConnectionStream = _baconjs2.default.fromBinder(function (sink) {
    socket.on('connectToSpdz_result', function (response) {
      if (response.status === 0) {
        sink({
          eventType: _transform.EVENT_TYPE.SPDZ_CONNECT,
          status: true,
          url: url,
          msg: 'SPDZ engine connection made.'
        });
      } else {
        sink({
          eventType: _transform.EVENT_TYPE.SPDZ_CONNECT,
          status: false,
          url: url,
          msg: response.err
        });
      }
    });

    socket.on('disconnectFromSpdz_result', function () {
      sink({
        eventType: _transform.EVENT_TYPE.SPDZ_CONNECT,
        status: false,
        url: url,
        msg: 'Disconnected from SPDZ engine.'
      });
    });

    socket.on('spdz_socketDisconnected', function () {
      sink({
        eventType: _transform.EVENT_TYPE.SPDZ_CONNECT,
        status: false,
        url: url,
        msg: 'Disconnected from SPDZ engine.'
      });
    });
  });

  // Gather response messages from client actions
  var otherResponseStream = _baconjs2.default.fromBinder(function (sink) {
    socket.on('sendData_result', function (response) {
      sink({
        eventType: _transform.EVENT_TYPE.SEND_INPUT,
        status: response.status === 0 ? true : false,
        url: url,
        msg: response.status === 0 ? 'Input sent to SPDZ.' : response.err
      });
    });

    //Used for unsubscribe tidy up
    return function () {};
  });

  //Decrypt (if encryptionKey is set), then work out message type and data type, rest is data
  // Errors get propagated to be caught in all follow on stream.onError handlers
  var spdzMessageStream = _baconjs2.default.fromEvent(socket, 'spdz_message', function (value) {
    return (0, _transform.parseSpdzMessage)(value, encryptionKey, url);
  });

  // Forward on data for input shares.
  // Shares don't need dataType, always MODP and so 16 byte integers.
  var sharesStream = spdzMessageStream.filter(function (value) {
    return value.messageType === _transform.MESSAGE_TYPE.TRIPLE_SHARES;
  }).map(function (value) {
    return value.data;
  });

  // Forward on regType and data, parsing depends on MODP (16) or INT (4) byte integers.
  var outputsStream = spdzMessageStream.filter(function (value) {
    return value.messageType !== _transform.MESSAGE_TYPE.TRIPLE_SHARES;
  }).map(function (value) {
    return { messageType: value.messageType, data: value.data };
  });

  // Send outgoing messages
  webSocketBus.onValue(function (value) {
    if (value.eventType === 'connectToSpdz') {
      socket.emit(value.eventType, value.publicKey);
    } else if (value.eventType === 'sendData') {
      socket.emit(value.eventType, value.dataType, value.dataArray);
    } else if (value.eventType === 'disconnectFromSpdz') {
      socket.emit(value.eventType);
    } else {
      _logging2.default.warn('Don\'t know what to do with event type ' + value.eventType);
    }
  });

  return [proxyConnectionStream, spdzConnectionStream, otherResponseStream, sharesStream, outputsStream];
};

exports.default = connectSetup;