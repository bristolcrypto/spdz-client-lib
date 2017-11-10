'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; /**
                                                                                                                                                                                                                                                                               * Type mapping from little endian Uint8Array buffer to an array of integers (int32 or Gfp).
                                                                                                                                                                                                                                                                               * 
                                                                                                                                                                                                                                                                               * The list is expected to contain the same values, from each SPDZ engine.
                                                                                                                                                                                                                                                                               * If all are the same then return the first in the list, otherwise throw an exception.
                                                                                                                                                                                                                                                                               */


var _binary = require('../utility/binary');

var _Gfp = require('../math/Gfp');

/**
 * Binary data should be multiple of intSize bytes.
 */
var checkBuffer = function checkBuffer(intSize, byteBufferList) {
  var wrongLengthMsgs = byteBufferList.map(function (byteBuffer, index) {
    return byteBuffer.length % intSize === 0 ? '' : 'Spdz proxy ' + index + ' provided ' + byteBuffer.length + ' bytes, expected multiple of ' + intSize + '.';
  });

  var wrongTypeMsgs = byteBufferList.map(function (byteBuffer) {
    return byteBuffer instanceof Uint8Array ? '' : 'Expect array of Uint8Array type, got a ' + (typeof byteBuffer === 'undefined' ? 'undefined' : _typeof(byteBuffer)) + '.';
  });

  return wrongLengthMsgs.concat(wrongTypeMsgs).filter(function (message) {
    return message.length > 0;
  }).join('\n');
};

/**
 * Check that array in the first index of the passed in matrix are the same.
 * Types are expected to be integers or Gfp values.
 * No items is true.
 * @param {enumerable matrix of elements} matrix [spdz proxy index][result number]
 * @return {boolean} true or false
 */
var allSame = function allSame(list) {
  if (list.length === 0) {
    return true;
  } else {
    return !!list.reduce(function (a, b) {
      if (a.length && b.length && a.length === b.length) {
        for (var i = 0; i < a.length; i++) {
          if (a[i] instanceof _Gfp.Gfp) {
            if (!a[i].equals(b[i])) {
              return NaN;
            }
          } else {
            if (a[i] !== b[i]) {
              return NaN;
            }
          }
        }
      } else {
        return NaN;
      }
      return a;
    });
  }
};

/**
 * Validate that byteBufferList contains same values across list and map binary to output format using function passed 
 * in parmeter extractBinaryIntoArray.
 * 
 * @param {Uint8Array[]} byteBufferList Array of binary data sent from SPDZ Engines.
 * @param {Number} typeByteLength Number of bytes in each number
 * @param {Function} extractBinaryIntoArray run over each byteBuffer to extract numbers/hex string.
 * @returns {Array} Array of results with values depending on extractBinaryIntoArray.
 */
var binaryToArray = function binaryToArray(byteBufferList, typeByteLength, extractBinaryIntoArray) {
  if (byteBufferList.length === 0) {
    throw new Error('No data to extract.');
  }

  var chkBufLengthMessage = checkBuffer(typeByteLength, byteBufferList);
  if (chkBufLengthMessage.length > 0) {
    throw new Error(chkBufLengthMessage);
  }

  //First index indicates SPDZ proxy, second indicates result number
  var arrayMatrix = byteBufferList.map(extractBinaryIntoArray);

  if (!allSame(arrayMatrix)) {
    throw new Error('Not all parties have sent the same result.');
  }

  return arrayMatrix[0];
};

/**
 * @description Convert binary output result from all SPDZ Engines into an array of 32 bit unsigned integers.
 * Designed for SPDZ programs which reveal and return regint results.
 * Validates that binary outputs are the same across all SPDZ Engines and returns int results from the first SPDZ engine.
 * 
 * @param {Uint8Array[]} byteBufferList Array of binary data sent from SPDZ Engines.
 * 
 * @returns {Number[]} an array of unsigned integers, representing the results from a single SPDZ Engine.
 * 
 * @example Extract out the integer results from a SPDZ program:
 * 
 * const { binaryToIntArray } = require('./type_mapping/binaryToArray')
 * 
 * const byteBufferList = [Uint8Array.from([0x1, 0x0, 0x0, 0x0, 0x2, 0x0, 0x0, 0x0]),
 *                         Uint8Array.from([0x1, 0x0, 0x0, 0x0, 0x2, 0x0, 0x0, 0x0])]
 * const intArray = binaryToIntArray(byteBufferList)
 * // intArray is [1, 2]
 * 
 * @access public
 */
var binaryToIntArray = function binaryToIntArray(byteBufferList) {
  return binaryToArray(byteBufferList, 4, function (byteBuffer) {
    // Read through buffer, reversing then extracting each 4 bytes (little endian integer -> big endian)
    var intArray = new Array(byteBuffer.length / 4);
    var dv = new DataView(byteBuffer.buffer);

    for (var i = 0; i < dv.byteLength; i += 4) {
      intArray[i / 4] = dv.getUint32(i, true);
    }
    return intArray;
  });
};

var binaryToGfpArray = function binaryToGfpArray(byteBufferList) {
  return binaryToArray(byteBufferList, 16, function (byteBuffer) {
    var gfpArray = new Array(byteBuffer.length / _Gfp.Gfp.integerLengthBytes());

    for (var i = 0; i < byteBuffer.length; i += _Gfp.Gfp.integerLengthBytes()) {
      var gfpBytes = byteBuffer.slice(i, i + _Gfp.Gfp.integerLengthBytes()).reverse();
      var gfpAsHexString = (0, _binary.binaryToHex)(gfpBytes);
      var gfp = _Gfp.Gfp.fromSpdz(gfpAsHexString);
      gfpArray[i / _Gfp.Gfp.integerLengthBytes()] = gfp;
    }
    return gfpArray;
  });
};

/**
 * Convert array of regints from SPDZ into a hex string.
 * For example used to convert client public key (8 * 4 byte ints) into 64 byte hex string.
 * @param {Array<Uint8Array(n)>} byteBufferList containing 1 entry for each proxy, each entry is a Uint8Array of length n.
 * @param {Number} intCount expected number of regints.
 * @returns hex string
 */
var regIntToHexString = function regIntToHexString(byteBufferList, intCount) {
  var bufferLength = 4 * intCount;
  return binaryToArray(byteBufferList, bufferLength, function (byteBuffer) {
    // Read through buffer, reversing each 4 bytes (little endian integer -> big endian)
    var reversedByteBuffer = new Uint8Array(bufferLength);
    for (var i = 0; i < bufferLength; i += 4) {
      var revArray = byteBuffer.slice(i, i + 4).reverse();
      reversedByteBuffer.set(revArray, i);
    }
    return (0, _binary.binaryToHex)(reversedByteBuffer);
  });
};

module.exports = { binaryToIntArray: binaryToIntArray, binaryToGfpArray: binaryToGfpArray, regIntToHexString: regIntToHexString };