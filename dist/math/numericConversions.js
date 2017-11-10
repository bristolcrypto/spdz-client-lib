'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.jsNumberToShiftedInteger = exports.roundFixed = exports.shiftedIntegerToJSFixed = undefined;

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Convert a bit shifted integer representing a SPDZ fixed point number into a JS number 
 * @param {Number} shiftedInteger 
 * @param {integer} fixedPointDecBitLength (see Gfp.fixedPointDecBitLength())
 * @returns {Number} real number
 */
var shiftedIntegerToJSFixed = function shiftedIntegerToJSFixed(shiftedInteger, fixedPointDecBitLength) {
  // Don't use bit shift operators as coerces to signed 32 bit first.
  var maxDecimal = Math.pow(2, fixedPointDecBitLength);
  var significand = Math.trunc(shiftedInteger / maxDecimal);
  var decimal = shiftedInteger % maxDecimal / maxDecimal;
  return significand + decimal;
};

/**
 * Round a number to fixed number of places, using fixed point bit length to determine precision.
 * @param {Number} number 
 * @param {integer} fixedPointDecBitLength (see Gfp.fixedPointDecBitLength())
 * @returns {String} number with fixed decimal places.
 */
/**
 * Manage integer to fixed point conversions. Normally access via Gfp methods.
 */
var roundFixed = function roundFixed(number, fixedPointDecBitLength) {
  var maxDecimal = Math.pow(2, fixedPointDecBitLength);
  return number.toFixed(maxDecimal.toString().length - 1);
};

/**
 * Convert a real number into a bit shifted integer representing a SPDZ fixed point number.
 * @param {Number} real number 
 * @param {integer} fixedPointDecBitLength (see Gfp.fixedPointDecBitLength())
 * @param {integer} fixedPointWholeBitLength (see Gfp.fixedPointWholeBitLength())
 * @returns {Number} shifted integer
 */
var jsNumberToShiftedInteger = function jsNumberToShiftedInteger(number, fixedPointDecBitLength, fixedPointWholeBitLength) {
  (0, _assert2.default)(Math.trunc(number) <= Math.pow(2, fixedPointWholeBitLength - fixedPointDecBitLength) - 1, 'Converting real number to fixed point, integer part exceeded ' + (fixedPointWholeBitLength - fixedPointDecBitLength) + ' bits.');
  var shifted = Math.trunc(Math.round(number * Math.pow(2, fixedPointDecBitLength)));
  return shifted;
};

exports.shiftedIntegerToJSFixed = shiftedIntegerToJSFixed;
exports.roundFixed = roundFixed;
exports.jsNumberToShiftedInteger = jsNumberToShiftedInteger;