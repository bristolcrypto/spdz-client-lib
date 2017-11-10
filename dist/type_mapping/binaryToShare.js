'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _binaryToArray = require('./binaryToArray');

var _Gfp = require('../math/Gfp');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } } /**
                                                                                                                                                                                                     * Given a list of Uint8Array buffers, from each SPDZ proxy, holding 1 or more triples:
                                                                                                                                                                                                     *  Check buffers are a multiple of expected length
                                                                                                                                                                                                     *  Convert to Gfp triples.
                                                                                                                                                                                                     *  Add together and verify.
                                                                                                                                                                                                     *  Return list of first triple, Gfp still in montgomery format - used to apply to input.
                                                                                                                                                                                                     */


var TRIPLE_BYTES = 3 * _Gfp.Gfp.integerLengthBytes();

// Generate array containing 0, 1, .. length-1
var range = function range(length) {
  return [].concat(_toConsumableArray(Array(length).keys()));
};

/**
 * Triple represents montgomery Gfps [A, B, C]. 
 */

var Triple = function () {
  function Triple(byteBuffer) {
    _classCallCheck(this, Triple);

    var gfpArray = (0, _binaryToArray.binaryToGfpArray)([byteBuffer]);
    this.a = gfpArray[0];
    this.b = gfpArray[1];
    this.c = gfpArray[2];
  }

  _createClass(Triple, [{
    key: 'checkRelation',
    value: function checkRelation() {
      return this.a.multiply(this.b).equals(this.c);
    }
  }, {
    key: 'add',
    value: function add(triple) {
      this.a = this.a.add(triple.a);
      this.b = this.b.add(triple.b);
      this.c = this.c.add(triple.c);
      return this;
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'a is ' + this.a.toString() + ', b is ' + this.b.toString() + ', c is ' + this.c.toString();
    }
  }], [{
    key: 'zero',
    value: function zero() {
      return new Triple(new Uint8Array(3 * _Gfp.Gfp.integerLengthBytes()));
    }
  }]);

  return Triple;
}();

/**
 * Integers are supplied as 16 byte numbers so validate length of all spdz engine triples
 */


var checkBufferLength = function checkBufferLength(clearValues) {
  var lengthMsgs = clearValues.map(function (clearValue, index) {
    return clearValue.length > 0 && clearValue.length % TRIPLE_BYTES === 0 ? '' : 'Spdz proxy ' + index + ' provided triple with ' + clearValue.length + ' bytes, must be a multiple of ' + TRIPLE_BYTES + '.';
  });

  //TODO check each value is same length
  var sameLengths = !!clearValues.reduce(function (a, b) {
    return a.length === b.length ? a : NaN;
  });

  if (!sameLengths) {
    lengthMsgs.push('Shares from each proxy are expected to be the same byte length.');
  }

  return lengthMsgs.filter(function (message) {
    return message.length > 0;
  }).join('\n');
};

exports.default = function (byteBufferList) {
  if (!(byteBufferList instanceof Array)) {
    throw new Error('binaryToShare requires an Array as input.');
  }

  byteBufferList.map(function (byteBuffer) {
    if (!(byteBuffer instanceof Uint8Array)) {
      throw new Error('binaryToShare requires an Array of Uint8Array buffers.');
    }
  });

  var errorMessage = checkBufferLength(byteBufferList);
  if (errorMessage.length > 0) {
    throw new Error(errorMessage);
  }

  var expectedNum = byteBufferList[0].length / TRIPLE_BYTES;

  return range(expectedNum).map(function (i) {
    var combinedTriple = byteBufferList.map(function (byteBuffer) {
      return new Triple(byteBuffer.slice(i * TRIPLE_BYTES, (i + 1) * TRIPLE_BYTES));
    }).reduce(function (sumTriple, triple) {
      return sumTriple.add(triple);
    }, Triple.zero());

    if (!combinedTriple.checkRelation()) {
      throw new Error('Triple to be used for a share failed check.');
    }

    return combinedTriple.a;
  });
};