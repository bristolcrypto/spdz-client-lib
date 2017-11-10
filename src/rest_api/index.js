// Entry point for REST calls to SPDZ Proxy

// Polyfills comes from create-react-app
import '../polyfills'

import {
  connectToSPDZ,
  checkProxies,
  disconnectFromSPDZ,
  allProxiesConnected,
  consumeDataFromProxies
} from './SpdzApiAggregate'
import {
  retrieveRegIntsAsHexString,
  sendInputsWithShares
} from './SpdzApiHelper'
import NoContentError from './NoContentError'
import ProxyStatusCodes from './ProxyStatusCodes'

export {
  allProxiesConnected,
  checkProxies,
  connectToSPDZ,
  consumeDataFromProxies,
  disconnectFromSPDZ,
  NoContentError,
  ProxyStatusCodes,
  retrieveRegIntsAsHexString,
  sendInputsWithShares
}
