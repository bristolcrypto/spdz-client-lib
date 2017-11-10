"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * @description Represent possible connection states between a SPDZ Proxy and a SPDZ Engine.
 * 
 * @returns {Object} statename: statevalue
 * 
 * @example Codes are:
 * 
 * { Disconnected: 1, Connected: 2, Failure: 3 }
 * 
 * @access public
 */
exports.default = Object.freeze({ Disconnected: 1, Connected: 2, Failure: 3 });