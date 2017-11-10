'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromMontgomery = exports.toMontgomery = exports.initFixedPointParams = exports.Gfp = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * Represent a big integer in a finite field (mod P) in montgomery format.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      */


var _bigInteger = require('big-integer');

var _bigInteger2 = _interopRequireDefault(_bigInteger);

var _numericConversions = require('./numericConversions');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Hard code prime for gfp, montgomery conversion primatives.
 * Assumption that spdz is using a 128 bit prime field.
 */
var INTEGER_LENGTH_BYTES = 16;
var GFP_PRIME = (0, _bigInteger2.default)('172035116406933162231178957667602464769');
var GFP_NEGATIVE_BOUNDARY = GFP_PRIME.divide(2);
var MIN_NEGATIVE = GFP_NEGATIVE_BOUNDARY.minus(GFP_PRIME);
var R = (0, _bigInteger2.default)(2).pow(INTEGER_LENGTH_BYTES * 8);
var R_INVERSE = R.modInv(GFP_PRIME);
/**
 * Fixed point parameters. The SPDZ VM handles these as sint/cints in gfp which have been bit shifted.
 * The client must bit shift before sending/after receiving. Params are:
 *   f - the bitlength of the decimal part
 *   k - the whole bitlength of fixed point
 * These must match MPC program params:
 *   sfix.set_precision(f, k)
 *   cfix.set_precision(f, k)
 */
var fix_decimal_bitlength = 20;
var fix_whole_bitlength = 40;

/**
 * @description Setup the fixed point parameters to match the SPDZ MPC parameters, equivalent to instruction (cfix | sfix).set_precision(f, k).
 * Defaults are (f,k) of (20,40).
 * 
 * @param {Number} f integer to override default fixed point decimal bit length
 * @param {Number} k integer to override default fixed point whole bit length 
 * 
 * @access public
 */
var initFixedPointParams = function initFixedPointParams(f, k) {
  fix_decimal_bitlength = f;
  fix_whole_bitlength = k;
};

/**
 * Convert bigint to a montgomery representation
 */
var toMontgomery = function toMontgomery(value) {
  return value.multiply(R).mod(GFP_PRIME);
};

/**
 * Convert bigint from a montgomery representation
 */
var fromMontgomery = function fromMontgomery(value) {
  return value.multiply(R_INVERSE).mod(GFP_PRIME);
};

/**
 * Remap Gfp field ( 0->Prime) to (min_negative->gfp_negative_boundary-1)
 */
var fromGfpMapping = function fromGfpMapping(bigIntGfp) {
  return bigIntGfp.greaterOrEquals(GFP_NEGATIVE_BOUNDARY) ? bigIntGfp.minus(GFP_PRIME) : bigIntGfp;
};

/**
 * Act as a translation between the Gfp type in SPDZ and integer numbers for user I/O.
 */

var Gfp = function () {
  /**
   * Wrap BigInt as Gfp to mimic SPDZ implementation (negative mapping and montgomery representation).
   * 
   * Look at methods which are more explicit:
   *    Gfp.fromUserInput - convert user supplied integer into Gfp type.
   *    Gfp.fromSpdz - wrap integer already in Gfp field in Gfp type.
   *    toJSInteger - convert Gfp type into integer.
   * 
   * @param {BigInt} value BigInteger value, 
   * @param {boolean} isMapped is value already represented in Gfp field.
   *
   */
  function Gfp(value, isMapped) {
    _classCallCheck(this, Gfp);

    if (!(value instanceof _bigInteger2.default)) {
      throw new Error('Gfp type must wrap a BigInt type.');
    }

    if (isMapped) {
      if (value.lt(0) || value.gt(GFP_PRIME)) {
        throw new Error('Got a Gfp integer ' + value.toString() + ' which exceeds the field size 0 to prime.');
      }
      this.val = value;
    } else {
      if (value.lt(MIN_NEGATIVE) || value.geq(GFP_NEGATIVE_BOUNDARY)) {
        throw new Error('Got an integer ' + value.toString() + ' which exceeds the field size -prime/2 to prime/2.');
      }
      this.val = toMontgomery(value.lt(0) ? value.add(GFP_PRIME) : value);
    }
  }

  /**
   * Create Gfp from integer held in string supplied by user.
   * Integer will be mapped into Gfp field and converted into Montogomery format.
   */


  _createClass(Gfp, [{
    key: 'add',
    value: function add(other) {
      if (!(other instanceof Gfp)) {
        throw new Error('Add requires a Gfp type.');
      }
      return new Gfp(this.val.add(other.val).mod(GFP_PRIME), true);
    }
  }, {
    key: 'multiply',
    value: function multiply(other) {
      if (!(other instanceof Gfp)) {
        throw new Error('Mult requires a Gfp type.');
      }
      return new Gfp(this.val.multiply(other.val).multiply(R_INVERSE).mod(GFP_PRIME), true);
    }
  }, {
    key: 'getValue',
    value: function getValue() {
      return this.val;
    }

    /** String representation of integer in prime field. */

  }, {
    key: 'toNativeString',
    value: function toNativeString() {
      return this.val.toString() + ' Montgomery';
    }

    /** Hex string representation of integer in prime field. */

  }, {
    key: 'toNativeHexString',
    value: function toNativeHexString() {
      return this.val.toString(16);
    }

    /** String representation of integer in integers. */

  }, {
    key: 'toString',
    value: function toString() {
      return fromGfpMapping(fromMontgomery(this.val)).toString();
    }

    /** Javascript Number representation of GFP integer. */

  }, {
    key: 'toJSInteger',
    value: function toJSInteger() {
      var bigintVal = fromGfpMapping(fromMontgomery(this.val));

      if (bigintVal.geq(Number.MIN_SAFE_INTEGER) && bigintVal.leq(Number.MAX_SAFE_INTEGER)) {
        return bigintVal.toJSNumber();
      } else {
        throw new Error('Overflow converting Gfp ' + bigintVal.toString() + ' to JS Integer.');
      }
    }

    /** Javascript Number as fixed point from GFP integer representing fixed point. */

  }, {
    key: 'toJSFixedPoint',
    value: function toJSFixedPoint() {
      return (0, _numericConversions.shiftedIntegerToJSFixed)(this.toJSInteger(), fix_decimal_bitlength, fix_whole_bitlength);
    }
  }, {
    key: 'equals',
    value: function equals(other) {
      if (!(other instanceof Gfp)) {
        return false;
      }
      return this.val.equals(other.val);
    }
  }], [{
    key: 'fromUserInput',
    value: function fromUserInput(integerString) {
      var inputStr = typeof integerString !== 'string' ? integerString.toString() : integerString;
      return new Gfp((0, _bigInteger2.default)(inputStr), false);
    }

    /**
     * Create Gfp from SPDZ supplied gfp, in hex string format.
     */

  }, {
    key: 'fromSpdz',
    value: function fromSpdz(hexString) {
      return new Gfp((0, _bigInteger2.default)(hexString, 16), true);
    }
  }, {
    key: 'integerLengthBytes',
    value: function integerLengthBytes() {
      return INTEGER_LENGTH_BYTES;
    }
  }, {
    key: 'fixedPointDecBitLength',
    value: function fixedPointDecBitLength() {
      return fix_decimal_bitlength;
    }
  }, {
    key: 'fixedPointWholeBitLength',
    value: function fixedPointWholeBitLength() {
      return fix_whole_bitlength;
    }
  }]);

  return Gfp;
}();

exports.Gfp = Gfp;
exports.initFixedPointParams = initFixedPointParams;
exports.toMontgomery = toMontgomery;
exports.fromMontgomery = fromMontgomery;