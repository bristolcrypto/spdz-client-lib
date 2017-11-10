"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * Verify that all requiredKeys appear in each entry of listObjects.
 * @param {Array<Objects>} listObjects 
 * @param {String} requiredKeys list of required keys
 * @returns true or false
 */
var verifyRequiredKeys = function verifyRequiredKeys(listObjects) {
  for (var _len = arguments.length, requiredKeys = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    requiredKeys[_key - 1] = arguments[_key];
  }

  if (listObjects.constructor !== Array) {
    return false;
  }

  if (listObjects.length === 0) {
    return false;
  }

  return listObjects.every(function (obj) {
    return requiredKeys.every(function (key) {
      return obj.hasOwnProperty(key);
    });
  });
};

exports.default = verifyRequiredKeys;