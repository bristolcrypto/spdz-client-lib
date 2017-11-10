"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * URL to client id lookup for current round of REST transactions.
 * Key is URL of proxy connecting to, value is client id.
 * Hijack by different browser session should not be a problem as long 
 * as using encrypted transfers.
 * Abstracting out helps with testing.
 */

var clientIds = {};

var resetClientIds = function resetClientIds() {
  return clientIds = {};
};
var storeClientId = function storeClientId(url, generatedClientId) {
  return clientIds[url] = generatedClientId;
};
var clientIdExists = function clientIdExists(url) {
  return clientIds.hasOwnProperty(url);
};
var removeClientId = function removeClientId(url) {
  return delete clientIds[url];
};
var getClientId = function getClientId(url) {
  return clientIds[url];
};

exports.clientIdExists = clientIdExists;
exports.getClientId = getClientId;
exports.removeClientId = removeClientId;
exports.resetClientIds = resetClientIds;
exports.storeClientId = storeClientId;