/**
 * Top level entry point into library.
 * Will pull all functions and related libraries into your app!
 * Consider using the sub directory index files to pull in only relevant functions. 
 */

// Polyfills comes from create-react-app
import './polyfills'

import {
  allProxiesConnected,
  checkProxies,
  connectToSPDZ,
  consumeDataFromProxies,
  disconnectFromSPDZ,
  NoContentError,
  ProxyStatusCodes,
  retrieveRegIntsAsHexString,
  sendInputsWithShares
} from './rest_api'

import {
  createClientPublicKey,
  createEncryptionKey,
  createDHKeyPair,
  decrypt,
  setDHKeyPair
} from './crypto'
import { binaryToIntArray } from './type_mapping/binaryToArray'
import {
  connectToSpdzPartyPromise,
  connectToSpdzProxyPromise,
  disconnectFromSpdzPartyPromise,
  sendClearInputsPromise,
  sendSecretInputsPromise
} from './socket_api/promisify'
import { initFixedPointParams } from './math/Gfp'
import { bootstrapConnectSetup, runSpdzProgram } from './bootstrap_api'
import { logger } from './utility'

export {
  allProxiesConnected,
  binaryToIntArray,
  bootstrapConnectSetup,
  checkProxies,
  connectToSPDZ,
  connectToSpdzPartyPromise,
  connectToSpdzProxyPromise,
  consumeDataFromProxies,
  createClientPublicKey,
  createDHKeyPair,
  createEncryptionKey,
  decrypt,
  disconnectFromSPDZ,
  disconnectFromSpdzPartyPromise,
  initFixedPointParams,
  logger,
  NoContentError,
  ProxyStatusCodes,
  retrieveRegIntsAsHexString,
  runSpdzProgram,
  sendClearInputsPromise,
  sendSecretInputsPromise,
  sendInputsWithShares,
  setDHKeyPair
}
