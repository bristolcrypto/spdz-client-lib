'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.base64Encode = exports.binaryToHex = undefined;

var _buffer = require('buffer/');

var padHex = function padHex(hex) {
  return hex.length % 2 !== 0 ? '0' + hex : hex;
};

/**
 * Convert binary to padded hex string (i.e. always multiple of 2)
 * @param {binaryArray} Uint8Array or equivalent such as node Buffer.
 * @returns Padded hex string.
 */
/**
 * General purpose binary functions.
 */

// Care on this import as it must override builtin Node Buffer global for testing.
var binaryToHex = function binaryToHex(binaryArray) {
  return binaryArray.reduce(function (hexString, i) {
    return hexString + padHex(i.toString(16));
  }, '');
};

/**
 * Convert a string of hex  into a base64 encoded string, representing a big endian integer.
 * @param {string} hexString e.g. '6e70f'
 */
var base64Encode = function base64Encode(hexString) {
  if (!(typeof hexString === 'string')) {
    throw new Error('base64Encode expects a hex string.');
  }
  var hexValue = padHex(hexString);
  var buf = _buffer.Buffer.from(hexValue, 'hex');
  return buf.toString('base64');
};

exports.binaryToHex = binaryToHex;
exports.base64Encode = base64Encode;