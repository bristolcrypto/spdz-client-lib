'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.streamWithTimeout = exports.setupSendInputShareStream = exports.parseSpdzMessage = exports.MESSAGE_TYPE = exports.flattenResponseMessage = exports.extractValidateShares = exports.EVENT_TYPE = exports.convertUserInput = exports.convertOutput = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; /**
                                                                                                                                                                                                                                                                               * Supporting transform functions for client websocket connections to SPDZ.
                                                                                                                                                                                                                                                                               */

var _baconjs = require('baconjs');

var _baconjs2 = _interopRequireDefault(_baconjs);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _binaryToArray = require('../type_mapping/binaryToArray');

var _binary = require('../utility/binary.js');

var _crypto = require('../crypto');

var _Gfp = require('../math/Gfp');

var _numericConversions = require('../math/numericConversions');

var _logging = require('../utility/logging');

var _logging2 = _interopRequireDefault(_logging);

var _listComparison = require('../utility/listComparison');

var _listComparison2 = _interopRequireDefault(_listComparison);

var _binaryToShare = require('../type_mapping/binaryToShare');

var _binaryToShare2 = _interopRequireDefault(_binaryToShare);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Identify type of return message from SPDZ.
 * Matches SPDZ ClientMessageType in Compiler/type.py 
 */
var MESSAGE_TYPE = {
  NOTYPE: 0,
  TRIPLE_SHARES: 1,
  CLEAR_MODP_INT: 2,
  INT_32: 3,
  CLEAR_MODP_FIX: 4
};

/**
 * Identify the event in the stream.
 */
var EVENT_TYPE = {
  PROXY_CONNECT: 'Proxy connect',
  SPDZ_CONNECT: 'SPDZ connect',
  SEND_INPUT: 'send input',
  ERROR: 'error',
  TIMEOUT: 'timeout'
};

/**
 * From an array of buffers (1 per SPDZ engine) extract out and validate n shares.
 * The number is determined by the length of the byteBuffer.
 * 
 * @param {Array<Uint8Array>} byteBufferList 
 * @returns {Array<Gfp>} list of shares 
 */
var extractValidateShares = function extractValidateShares(byteBufferList) {
  try {
    var shareList = (0, _binaryToShare2.default)(byteBufferList);
    _logging2.default.debug('Received ' + shareList.length + ' shares from SPDZ.');
    return shareList;
  } catch (err) {
    return new _baconjs2.default.Error(err.message);
  }
};

/**
 * Extract out event type and status from array of SPDZ engine response messages.
 * 
 * @param {Array} msgList List of websocket response messages. 
 * @returns {Object} {eventType : EVENT_TYPE if all same, otherwise ERROR,
 *                    status : true if all inputs have status true otherwise false,
 *                    msg : incoming msg}
 */
var flattenResponseMessage = function flattenResponseMessage(msgList) {
  (0, _assert2.default)(msgList !== undefined && msgList.length > 0, 'Expect non zero response messages in flattenResponseMessage.');
  var allSame = (0, _listComparison2.default)(msgList, function (a, b) {
    return a.eventType === b.eventType;
  });
  var extractStatus = function extractStatus() {
    return msgList.reduce(function (a, b) {
      return a = a && b.status;
    }, true);
  };

  return {
    eventType: allSame ? msgList[0].eventType : EVENT_TYPE.ERROR,
    status: allSame ? extractStatus() : false,
    msg: msgList
  };
};

var messageTypeExists = function messageTypeExists(magicNumber) {
  return Object.values(MESSAGE_TYPE).indexOf(magicNumber) > -1;
};

/**
 * Validate and convert byte array to number array. 
 * This supports SPDZ returning results in the clear, where each engine is expected to return
 * the same result. These results are compared and only 1 engine results returned.
 * Uses MESSAGE_TYPE returned by SPDZ to determine parsing.
 * @param {Array} dataList array of objects {messageType, data}, where data contains n results.
 * @returns {Array} Number type. 
 */
var convertOutput = function convertOutput(dataList) {
  try {
    _logging2.default.debug('Received output from SPDZ.');
    var messageType = dataList.reduce(function (result, output) {
      return result = output.messageType;
    }, MESSAGE_TYPE.NOTYPE);
    var byteBufferList = dataList.map(function (output) {
      return output.data;
    });
    if (messageType === MESSAGE_TYPE.CLEAR_MODP_INT) {
      var gfpResultList = (0, _binaryToArray.binaryToGfpArray)(byteBufferList);
      return gfpResultList.map(function (gfp) {
        return gfp.toJSInteger();
      });
    } else if (messageType === MESSAGE_TYPE.INT_32) {
      return (0, _binaryToArray.binaryToIntArray)(byteBufferList);
    } else if (messageType === MESSAGE_TYPE.CLEAR_MODP_FIX) {
      //cfix comes back as bit shifted cint
      var _gfpResultList = (0, _binaryToArray.binaryToGfpArray)(byteBufferList);
      return _gfpResultList.map(function (gfp) {
        return gfp.toJSFixedPoint();
      });
    } else {
      throw new Error('Got output stream with message type ' + messageType + ' not currently handled.');
    }
  } catch (err) {
    return new _baconjs2.default.Error(err.message);
  }
};

/**
 * Check that list contains numbers. If any numbers are non-integer treat all as 
 * fixed point and convert according to SPDZ sfix/cfix format.
 * 
 * @param {Array} inputList of numbers
 * @return {Array} unchanged list or bit shifted fixed points.
 */
var convertUserInput = function convertUserInput(inputList) {
  var validNumbers = (0, _listComparison2.default)(inputList, function (a, b) {
    return typeof a === 'number' && typeof b === 'number';
  });

  if (!validNumbers) {
    throw new Error('User input values [' + inputList + '] must be numbers.');
  }

  var allIntegers = (0, _listComparison2.default)(inputList, function (a, b) {
    return Number.isInteger(a) && Number.isInteger(b);
  });

  if (allIntegers) {
    return inputList;
  } else {
    return inputList.map(function (a) {
      return (0, _numericConversions.jsNumberToShiftedInteger)(a, _Gfp.Gfp.fixedPointDecBitLength(), _Gfp.Gfp.fixedPointWholeBitLength());
    });
  }
};

/**
 * Parse a message from SPDZ to extract out the header.
 * 
 * @param {Uint8Array} messageBytes 
 * @param {String} encryptionKey session key agreed between client and SPDZ server. 
 * If undefined then assume SPDZ message not encrypted. 
 * @param {String} url SPDZ proxy url - helps with logging 
 * 
 * @returns {messageType} to indicate the layout / purpose of the message
 * @returns {remainingBytes} the remaining bytes 
  */
var parseSpdzMessage = function parseSpdzMessage(messageBytes, encryptionKey, url) {
  try {
    (0, _assert2.default)(messageBytes instanceof Uint8Array, 'Message from SPDZ should be a Uint8Array type, got a ' + (typeof messageBytes === 'undefined' ? 'undefined' : _typeof(messageBytes)) + '.');
    var clearBytes = encryptionKey !== undefined ? (0, _crypto.decrypt)(encryptionKey, messageBytes) : new Uint8Array(messageBytes);

    (0, _assert2.default)(clearBytes.length >= 8, 'Message from SPDZ must be at least 8 bytes, given ' + clearBytes.length + '.');

    var messageType = (0, _binaryToArray.binaryToIntArray)([clearBytes.slice(0, 4)])[0];
    var remainingBytes = clearBytes.slice(4);

    if (!messageTypeExists(messageType)) {
      throw new Error('Unknown message type ' + messageType + '.');
    }

    return { messageType: messageType, data: remainingBytes };
  } catch (err) {
    _logging2.default.debug(err);
    return new _baconjs2.default.Error('Parsing message sent by SPDZ. ' + err.message + ' Proxy ' + url + '.');
  }
};

/**
 * Setup the streams to combine sending user input with shares to SPDZ.
 * 
 * Seems counter intuitive to send the same inputs to each SPDZ proxy (where is the sharing?), but SPDZ runs a 
 * protocol to split out the input using the local share and a special - operator which behaves differently 
 * depending on party number. 
 * 
 * @param {EventStream} userInputBus user input as integers.
 * @param {EventStream} extractedSharesStream SPDZ input of shares.
 * @param {EventStream} webSocketBus output stream to initiate socket emit events
 * 
 * @returns {EventStream} sendValueStream to monitor for errors.
 */
var setupSendInputShareStream = function setupSendInputShareStream(userInputBus, extractedSharesStream, webSocketBus) {
  // Need flatMap or errors are sent as values
  var sendValueStream = userInputBus.zip(extractedSharesStream).flatMap(function (inp_share) {
    var inputList = inp_share[0];
    var shareList = inp_share[1];
    if (inputList.length !== shareList.length) {
      var warnMsg = 'Trying to send ' + inputList.length + ' input(s) but ' + shareList.length + ' share(s) suppled.';
      _logging2.default.debug(warnMsg);
      return new _baconjs2.default.Error(warnMsg);
    }
    return inputList.map(function (input, i) {
      var sharedInput = shareList[i].add(_Gfp.Gfp.fromUserInput(input));
      return (0, _binary.base64Encode)(sharedInput.toNativeHexString());
    });
  });

  sendValueStream.onValue(function (inputList) {
    _logging2.default.debug('About to send ' + inputList.length + ' input(s).');
    webSocketBus.push({
      eventType: 'sendData',
      dataType: 'modp',
      dataArray: inputList
    });
  });

  return sendValueStream;
};

/**
 * Merge into a stream a timeout event which then ends the stream. Use to wait for an event 
 * for a specified time and then stop.
 * 
 * @param {EventStream} stream to add a timeout event to 
 * @param {Number} timeout in ms before adding the EVENT_TYPE.TIMEOUT event 
 * @returns stream with timeout event added (in the future!).
 */
var streamWithTimeout = function streamWithTimeout(stream, timeout) {
  var timerStream = _baconjs2.default.fromBinder(function (sink) {
    setTimeout(function () {
      sink(new _baconjs2.default.Next({
        eventType: EVENT_TYPE.TIMEOUT
      }));
      sink(new _baconjs2.default.End());
    }, timeout);
    return function () {};
  });

  return stream.merge(timerStream);
};

exports.convertOutput = convertOutput;
exports.convertUserInput = convertUserInput;
exports.EVENT_TYPE = EVENT_TYPE;
exports.extractValidateShares = extractValidateShares;
exports.flattenResponseMessage = flattenResponseMessage;
exports.MESSAGE_TYPE = MESSAGE_TYPE;
exports.parseSpdzMessage = parseSpdzMessage;
exports.setupSendInputShareStream = setupSendInputShareStream;
exports.streamWithTimeout = streamWithTimeout;