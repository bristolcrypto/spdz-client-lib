/**
 * Entry point for WebSocket calls to SPDZ Proxy
 */

import '../polyfills'

import {
  connectToSpdzPartyPromise,
  connectToSpdzProxyPromise,
  disconnectFromSpdzPartyPromise,
  sendClearInputsPromise,
  sendSecretInputsPromise
} from './promisify'

export {
  connectToSpdzPartyPromise,
  connectToSpdzProxyPromise,
  disconnectFromSpdzPartyPromise,
  sendClearInputsPromise,
  sendSecretInputsPromise
}
