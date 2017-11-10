/**
 * Wrap socket_api interactions in promises.
 */

import {
  connectToSPDZProxy,
  connectToSpdz,
  disconnectFromSpdz,
  sendClearInputs,
  sendInputsWithShares
} from './socketApi'
import { streamWithTimeout, EVENT_TYPE } from './transform'
import logger from '../utility/logging'

let connectionStream
let clientResponsesStream

/**
 * @description Connect to the web socket servers run by a set of SPDZ Proxies, establishing a stateful web socket for each proxy.
 * There is no attempt to connect to the runnning SPDZ process at this stage. See connectToSpdzPartyPromise.
 * 
 * @param {Object[]} spdzProxyList - the list of SPDZ Proxies to connect to.
 * @param {String} spdzProxyList.url - the URL of the proxy.
 * @param {String} spdzProxyList.encryptionKey - the pregenerated encryption key between this client and this SPDZ engine.
 *                 If undefined then assume SPDZ message not encrypted. 
 * @param {Object} webSocketConfig - socket.io config setting to override the default web socket connection config. 
 * @param {Number} [timeoutMs=2100] - maximum time in millisecs to wait for a connection to all proxies before timing out.
 * 
 * @return {EventStream[]} if promise resolves, which is an Array containing Bacon.js reactive streams.
 * @return {EventStream} connectionStream - stream of combined proxy and spdz connection events containing an object {eventType, status, msg}. EventType is either 'Proxy connect' or 'SPDZ connect', status is true for connected to all proxies, false otherwise, msg contains an array of values from each individual proxy connection.
 * @return {EventStream} spdzResultStream - stream of combined result events containing an Array<Number>. Here each proxy is expected to supply the same results and only one copy is returned. Does not currently support share of a result from each proxy.
 * @return {EventStream} spdzErrorStream - stream of error events containing the error message.
 * 
 * @example Connect to 2 proxies and subscribe to the returned reactive streams:
 * 
 * const spdzProxyClient = require('spdz-client-lib/dist/socket_api')
 * 
 * spdzProxyClient.connectToSpdzProxyPromise(
 *    [{url: 'http://spdzproxy1', encryptionKey: 'a1b2c3'},
 *     {url: 'http://spdzproxy1', encryptionKey: 'a1b2c3'}], {})
 * .then(streams => {
 *   const [connectedStatusStream, spdzResultStream, spdzErrorStream] = streams
 *   connectedStatusStream.onValue(status => {
 *     console.log(
 *       `SPDZ combined connected status ${status.eventType} connected ${status.status}.`
 *     )
 *   })
 *   spdzResultStream.onValue(valueList => {
 *     console.log('SPDZ outputs message.', valueList)
 *   })
 *   spdzErrorStream.onError(err => {
 *     console.log('SPDZ err message.', err)
 *   })
 * })
 * .catch(err => {
 *   logger.warn(`Unable to connect to SPDZ proxies. ${err.message}`)
 * })
 * @access public
 */
const connectToSpdzProxyPromise = (
  spdzProxyList,
  webSocketConfig,
  timeoutMs = 2100
) => {
  return new Promise((resolve, reject) => {
    const [
      _connectionStream,
      _clientResponseStream,
      spdzResultStream,
      spdzErrorStream
    ] = connectToSPDZProxy(webSocketConfig, ...spdzProxyList)

    connectionStream = _connectionStream
    clientResponsesStream = _clientResponseStream

    const unsubscribeResponses = streamWithTimeout(
      connectionStream,
      timeoutMs
    ).onValue(value => {
      if (value.eventType === EVENT_TYPE.PROXY_CONNECT && value.status) {
        logger.debug('Got proxy connect with true status')
        resolve([connectionStream, spdzResultStream, spdzErrorStream])
        unsubscribeResponses()
      } else if (value.eventType === EVENT_TYPE.TIMEOUT) {
        logger.debug('Got timeout whilst waiting for proxy connect.')
        reject(new Error('Unable to connect to SPDZ proxies.'))
        unsubscribeResponses()
      } else {
        logger.debug(
          `Connect to SPDZ proxies got connection event, while waiting. ${JSON.stringify(
            value.msg
          )}.`
        )
      }
    })
  })
}

/**
 * @description Establish the TCP connection between the SPDZ Proxy and the SPDZ Engine for all previously established web socket connections (see connectToSpdzProxyPromise).
 * Will timeout if connection not made within time limit.  See SPDZ instructions listen, acceptclientconnection and regint.read_client_public_key.
 * 
 * @param {String} [clientPublicKey=undefined] - the client public key, required by the SPDZ engines to generate the encryption key if the SPDZ MPC program is using encryption.
 * @param {Number} [timeoutMs=3100] - maximum time in millisecs to wait for all SPDZ engines to establish connections.
 * 
 * @return {Promise} which resolves to an empty function on success. The connectionStream created in connectToSpdzProxyPromise will report a SPDZ connect event.
 * 
 * @example Connect to spdz engines:
 * 
 * const spdzProxyClient = require('spdz-client-lib/dist/socket_api')
 * 
 * spdzProxyClient.connectToSpdzPartyPromise('b979d4508acd90156353dee3f7de36608432eeba7b37bd363ca9427d4b684748')
 * .then(() => {
 *   // send input or whatever next steps are needed
 * })
 * .catch(err => {
 *   logger.warn(`Unable to connect to SPDZ engines. ${err.message}`)
 * })
 * @access public
 */
const connectToSpdzPartyPromise = (
  clientPublicKey = undefined,
  timeoutMs = 3100
) => {
  return new Promise((resolve, reject) => {
    if (connectionStream === undefined) {
      reject(new Error('Not connected to SPDZ Proxies, unable to run request.'))
    }

    const unsubscribeResponses = streamWithTimeout(
      connectionStream,
      timeoutMs
    ).onValue(value => {
      if (value.eventType === EVENT_TYPE.SPDZ_CONNECT && value.status) {
        logger.debug('Got spdz connect with true status')
        resolve()
        unsubscribeResponses()
      } else if (value.eventType === EVENT_TYPE.TIMEOUT) {
        logger.debug('Got timeout whilst waiting for spdz connect.')
        reject(new Error('Unable to connect to SPDZ engines.'))
        unsubscribeResponses()
      } else {
        logger.debug(
          `Connect to SPDZ engines got connection event, while waiting. ${JSON.stringify(
            value.msg
          )}.`
        )
      }
    })

    try {
      connectToSpdz(clientPublicKey)
      //Resolve/reject dependant on subscription to connectedStatusStream
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Common code for sending inputs.
 * 
 * @param {Function} sendFunction to do the sending, accepts inputList as parameter.
 * @param {Array} inputList, containing array of numbers to send to SPDZ 
 * @returns resolves with no param when successful.
 */
const sendInputsPromise = (sendFunction, inputList) => {
  return new Promise((resolve, reject) => {
    if (clientResponsesStream === undefined) {
      reject(new Error('Not connected to SPDZ Proxies, unable to run request.'))
    }

    // Need to subscribe before sending input or will miss synchronous error messages.
    const unsubscribeResponses = clientResponsesStream.onValue(value => {
      if (value.eventType === EVENT_TYPE.SEND_INPUT) {
        if (value.status) {
          resolve()
          unsubscribeResponses()
        } else {
          reject(
            new Error(`Unable to send inputs. ${JSON.stringify(value.msg)}.`)
          )
          unsubscribeResponses()
        }
      } else if (value.eventType === EVENT_TYPE.ERROR) {
        reject(
          new Error(`Unable to send inputs. ${JSON.stringify(value.msg)}.`)
        )
        unsubscribeResponses()
      }
    })

    try {
      sendFunction(inputList)
      //Resolve/reject dependant on subscription to responsesFromSPDZStream
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * @description Send an array of integers to all SPDZ Proxies in secret shared form (SPDZ sint). A connection to all SPDZ Engines with connectToSpdzPartyPromise must have been successfully run. The supplied inputs will not be sent until the expected number of correlated random triples have been received from the SPDZ Engines (this happens in the background).
 * 
 * @param {Array<Number>} inputList - containing array of all integers or all fixed point numbers to send to SPDZ as input.
 * Inputs are suitable for SPDZ sint or sfix format and are secret shared amongst the SPDZ Engines. 
 * 
 * @return {Promise} which resolves to an empty function. If the send immediately fails, for example if no longer connected to all the SPDZ Engines, the returned promise rejects. However, for delayed errors such as an incompatible number of shares being provided for the inputs to be sent, then the spdzErrorStream created in connectToSpdzProxyPromise will report an error.
 * 
 * @example Sending inputs to be secret shared amoungst spdz engines:
 * 
 * const spdzProxyClient = require('spdz-client-lib/dist/socket_api')
 * 
 * spdzProxyClient.sendSecretInputsPromise([1234, 555, 6543])
 * .then(() => {
 *   // first part of send has been successful,
 *   // however the inputs may not yet have been dispatched to the SPDZ engines.
 * })
 * .catch(err => {
 *   logger.warn(`Unable to send secret shared input to SPDZ engines. ${err.message}`)
 * })
 * @access public
 */
const sendSecretInputsPromise = inputList => {
  return sendInputsPromise(inputs => sendInputsWithShares(inputs), inputList)
}

/**
 * @description Send an array of integers to all SPDZ Proxies, no secret sharing. A connection to all SPDZ Engines with connectToSpdzPartyPromise must have been successfully run.
 * 
 * @param {Array<Number>} inputList - containing an array of all integers or all fixed point numbers to send to SPDZ as input.
 * Inputs are suitable for SPDZ regint (integers only) or cint or cfix format (integer or fixed point). 
 * @param {String} spdzType - values are either 'int32' (default) (SPDZ regint) or 'modp' (SPDZ cint or cfix).
 * 
 * @return {Promise} which resolves to an empty function or rejects if fails to send.
 * 
 * @example Sending clear inputs to all spdz engines:
 * 
 * const spdzProxyClient = require('spdz-client-lib/dist/socket_api')
 * 
 * spdzProxyClient.sendClearInputsPromise([12.34, 0.142, 654.3])
 * .then(() => {
 *   // send has been successful
 * })
 * .catch(err => {
 *   logger.warn(`Unable to send inputs to SPDZ engines. ${err.message}`)
 * })
 * @access public
 */
const sendClearInputsPromise = (inputList, spdzType = 'int32') => {
  return sendInputsPromise(
    inputs => sendClearInputs(inputs, spdzType),
    inputList
  )
}

/**
 * Disconnect from SPDZ engines. Will timeout and reject if doesn't disconnect.
 *  
 * @returns {Promise} which resolves with no params when successful.
 */
/**
 * @description Disconnect from the SPDZ Engines closing the TCP connection between the SPDZ Proxy and the SPDZ Engine. It will reject if the disconnect does not complete within the timeout.
 * If the SPDZ Engine process ends and disconnects first the connectionStream created in connectToSpdzProxyPromise will report a SPDZ connect event with status of false.
 * 
 * @param {Number} [timeoutMs=2100] - maximum time in millisecs to wait for a disconnection from all proxies before timing out.
 * 
 * @return {Promise} which resolves to an empty function or rejects if unable to disconnect.
 * 
 * @example Disconnecting from all spdz engines:
 * 
 * const spdzProxyClient = require('spdz-client-lib/dist/socket_api')
 * 
 * spdzProxyClient.disconnectFromSpdzPartyPromise(3000)
 * .then(() => {
 *   console.log('Disconnected from all SPDZ Engines.')
 * })
 * .catch(err => {
 *   logger.warn(`Unable to disconnect from SPDZ engines. ${err.message}`)
 * })
 * @access public
 */
const disconnectFromSpdzPartyPromise = (timeoutMs = 2100) => {
  return new Promise((resolve, reject) => {
    if (connectionStream === undefined) {
      reject(new Error('Not connected to SPDZ Proxies, unable to run request.'))
    }

    const unsubscribeResponses = streamWithTimeout(
      connectionStream,
      timeoutMs
    ).onValue(value => {
      if (value.eventType === EVENT_TYPE.SPDZ_CONNECT && !value.status) {
        logger.debug('Got spdz connect with false status')
        resolve()
        unsubscribeResponses()
      } else if (value.eventType === EVENT_TYPE.TIMEOUT) {
        logger.debug('Got timeout whilst waiting for spdz disconnect.')
        reject(new Error('Unable to disconnect from SPDZ engines.'))
        unsubscribeResponses()
      } else {
        logger.debug(
          `Disconnect from SPDZ engines got connection event, while waiting. ${JSON.stringify(
            value.msg
          )}.`
        )
      }
    })

    try {
      disconnectFromSpdz()
      //Resolve/reject dependant on subscription to responsesFromSPDZStream
    } catch (err) {
      reject(err)
    }
  })
}

export {
  connectToSpdzPartyPromise,
  connectToSpdzProxyPromise,
  disconnectFromSpdzPartyPromise,
  sendClearInputsPromise,
  sendSecretInputsPromise
}
