'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.decrypt = exports.encrypt = exports.setDHKeyPair = exports.createDHKeyPair = exports.createClientPublicKey = exports.createEncryptionKey = undefined;

var _libsodiumWrappers = require('libsodium-wrappers');

var _libsodiumWrappers2 = _interopRequireDefault(_libsodiumWrappers);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Manage crypto functions for client communication with SPDZ.
 * See https://download.libsodium.org/libsodium/content/secret-key_cryptography/authenticated_encryption.html
 */
var dhKeyPair = void 0;

/**
 * Create and return DH key pair as binary.
 * Designed to be used with setDHKeyPair as values are not stored for later use.
 * @returns {{clientPublicKey:Uint8Array, clientPrivateKey:Uint8Array}}
 */
var createDHKeyPairBinary = function createDHKeyPairBinary() {
  var clientPrivateKey = _libsodiumWrappers2.default.randombytes_buf(_libsodiumWrappers2.default.crypto_box_PUBLICKEYBYTES);
  var clientPublicKey = _libsodiumWrappers2.default.crypto_scalarmult_base(clientPrivateKey);
  return {
    clientPublicKey: clientPublicKey,
    clientPrivateKey: clientPrivateKey
  };
};

/**
 * Create and return DH key pair as hex string.
 * Designed to be used with setDHKeyPair as values are not stored for later use.
 * @returns {{clientPublicKey:String, clientPrivateKey:String}} keys returned as 64 character hex string
 */
var createDHKeyPair = function createDHKeyPair() {
  var keyPair = createDHKeyPairBinary();
  return {
    clientPublicKey: _libsodiumWrappers2.default.to_hex(keyPair.clientPublicKey),
    clientPrivateKey: _libsodiumWrappers2.default.to_hex(keyPair.clientPrivateKey)
  };
};

/**
 * @description Set the X25519 (ECDH over Curve25519) key pair from previously computed values.
 * For example where a server is acting as a client to SPDZ Engines and the public key is persisted between runs.
 * 
 * @param {String} clientPublicKeyHexString as 64 char hex
 * @param {String} clientPrivateKeyHexString as 64 char hex
 * 
 * @access public
 */
var setDHKeyPair = function setDHKeyPair(clientPublicKeyHexString, clientPrivateKeyHexString) {
  (0, _assert2.default)(typeof clientPublicKeyHexString === 'string' && clientPublicKeyHexString.length === _libsodiumWrappers2.default.crypto_box_PUBLICKEYBYTES * 2, 'Client public key must be a string of ' + _libsodiumWrappers2.default.crypto_box_PUBLICKEYBYTES * 2 + ' hex characters, given <' + clientPublicKeyHexString + '>');
  (0, _assert2.default)(typeof clientPrivateKeyHexString === 'string' && clientPrivateKeyHexString.length === _libsodiumWrappers2.default.crypto_box_PUBLICKEYBYTES * 2, 'Client private key must be a string of ' + _libsodiumWrappers2.default.crypto_box_PUBLICKEYBYTES * 2 + ' hex characters, given <' + clientPrivateKeyHexString + '>');

  dhKeyPair = {
    clientPublicKey: _libsodiumWrappers2.default.from_hex(clientPublicKeyHexString),
    clientPrivateKey: _libsodiumWrappers2.default.from_hex(clientPrivateKeyHexString)
  };
};

/**
 * @description Creates an X25519 (ECDH over Curve25519) key pair. Used where a client, running an application in a browser needs a key pair to secure a message interchange with a SPDZ engine.
 * Results are memoized to prevent a new key pair being generated once sent to the server.
 * 
 * @returns {String} public key as 64 character hex string representing 32 bytes
 * 
 * @example Generate key pair and return public key:
 * 
 * const crypto = require('spdz-client-lib/dist/crypto')
 * 
 * const publicKey = crypto.createClientPublicKey()
 * @access public
 */
var createClientPublicKey = function createClientPublicKey() {
  if (dhKeyPair === undefined) {
    dhKeyPair = createDHKeyPairBinary();
  }

  return _libsodiumWrappers2.default.to_hex(dhKeyPair.clientPublicKey);
};

/**
 * @description Derive a shared key for authenticated encryption from this client's secret key and the server public key.
 * Client key material is already expected to be set, otherwise it will generate a new pair with createClientPublicKey().
 * Shared key = hash(q || client_secretkey || server_publickey) where q is scalarmult(client_secretkey, server_publickey).
 * 
 * @param {String} serverPublicKeyHexString Server public key as 64 char hex string
 * 
 * @return {String} encryption key derived for session
 * 
 * @example Generate encryption key:
 * 
 * const crypto = require('spdz-client-lib/dist/crypto')
 * 
 * const sessionKey = crypto.createEncryptionKey('b979d4508acd90156353dee3f7de36608432eeba7b37bd363ca9427d4b684748')
 * @access public
 */
var createEncryptionKey = function createEncryptionKey(serverPublicKeyHexString) {
  (0, _assert2.default)(typeof serverPublicKeyHexString === 'string' && serverPublicKeyHexString.length === _libsodiumWrappers2.default.crypto_box_PUBLICKEYBYTES * 2, 'Server public key must be a string of ' + _libsodiumWrappers2.default.crypto_box_PUBLICKEYBYTES * 2 + ' hex characters, given <' + serverPublicKeyHexString + '>');
  try {
    var serverPublicKey = _libsodiumWrappers2.default.from_hex(serverPublicKeyHexString);

    createClientPublicKey(); //Just incase not already run.

    var sharedSecret = _libsodiumWrappers2.default.crypto_scalarmult(dhKeyPair.clientPrivateKey, serverPublicKey);

    var stateAddress = _libsodiumWrappers2.default.crypto_generichash_init(null, _libsodiumWrappers2.default.crypto_generichash_BYTES);
    _libsodiumWrappers2.default.crypto_generichash_update(stateAddress, sharedSecret);
    _libsodiumWrappers2.default.crypto_generichash_update(stateAddress, dhKeyPair.clientPublicKey);
    _libsodiumWrappers2.default.crypto_generichash_update(stateAddress, serverPublicKey);
    return _libsodiumWrappers2.default.crypto_generichash_final(stateAddress, _libsodiumWrappers2.default.crypto_generichash_BYTES);
  } catch (err) {
    throw new Error('Unable to generate encryption key from Spdz public key ' + serverPublicKeyHexString + '. Original message ' + err.message + '.');
  }
};

/**
 * Authenticated encryption of message for a spdz server.
 * @param {encryptionKey} Previously generated session key between this client and the spdz proxy
 * @param {clearMessage} Message bytes to encrypt, can be Uint8Array or hex string
 * @returns ciphermessage as Uint8Array prepended with MAC (16 bytes) and appended with nonce (24 bytes). 
 */
var encrypt = function encrypt(encryptionKey, clearMessage) {
  var message = clearMessage;
  if (typeof clearMessage === 'string') {
    message = _libsodiumWrappers2.default.from_hex(clearMessage);
  }

  var nonce = _libsodiumWrappers2.default.randombytes_buf(_libsodiumWrappers2.default.crypto_box_NONCEBYTES);
  var macCipher = _libsodiumWrappers2.default.crypto_secretbox_easy(message, nonce, encryptionKey);

  var macCipherNonce = new Uint8Array(macCipher.length + nonce.length);
  macCipherNonce.set(macCipher);
  macCipherNonce.set(nonce, macCipher.length);

  return macCipherNonce;
};

/**
 * @description Authenticated decryption of cipher text. SPDZ Engine encrypts with pre-computed shared encryption key, client decrypts.
 * 
 * @param {String} encryptionKey Previously generated session key between this client and the SPDZ Engine. See createEncryptionKey.
 * @param {Uint8Array} cipherMessage Message comprises, 16 byte mac + cipher text + 24 bytes nonce. Supports Uint8Array or hex string.
 * 
 * @returns {Uint8Array} clearMessage (or throws). 
 * 
 * @example Decrypt a message:
 * 
 * const crypto = require('spdz-client-lib/dist/crypto')
 * 
 * const clearBuffer = crypto.decrypt(encryption_key, cipher_msg)
 * @access public
 */
var decrypt = function decrypt(encryptionKey, cipherMessage) {
  var message = cipherMessage;
  if (typeof cipherMessage === 'string') {
    message = _libsodiumWrappers2.default.from_hex(cipherMessage);
  }

  (0, _assert2.default)(message.length >= _libsodiumWrappers2.default.crypto_box_NONCEBYTES + _libsodiumWrappers2.default.crypto_secretbox_MACBYTES, 'The cipher message must be at least ' + (_libsodiumWrappers2.default.crypto_box_NONCEBYTES + _libsodiumWrappers2.default.crypto_secretbox_MACBYTES) + ' bytes length.');

  var nonceStart = message.length - _libsodiumWrappers2.default.crypto_box_NONCEBYTES;

  try {
    return _libsodiumWrappers2.default.crypto_secretbox_open_easy(message.slice(0, nonceStart), message.slice(nonceStart), encryptionKey);
  } catch (err) {
    throw new Error('Authentication/decryption failed.');
  }
};

exports.createEncryptionKey = createEncryptionKey;
exports.createClientPublicKey = createClientPublicKey;
exports.createDHKeyPair = createDHKeyPair;
exports.setDHKeyPair = setDHKeyPair;
exports.encrypt = encrypt;
exports.decrypt = decrypt;