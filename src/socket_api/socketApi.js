/**
 * Client side interface to multiple SPDZ Proxies using web sockets.
 * See promisify for wrapping as promises.
 */
import Bacon from 'baconjs'

import {
  convertOutput,
  convertUserInput,
  extractValidateShares,
  flattenResponseMessage,
  setupSendInputShareStream,
  EVENT_TYPE
} from './transform'
import connectSetup from './connectSetup'

// Message bus to emit events to web sockets
const webSocketBus = Bacon.Bus()
// Message bus holds user input, processed and sent as share.
const userInputBus = Bacon.Bus()

// Side effect state to check if proxies connected, spdz connected.
let connectedToProxies = false
let connectedToSpdz = false

/**
 * Connect to multiple SPDZ proxies using a websocket interface.
 * 
 * Returns 4 rx streams:
  *  connectionStream: an event which indicates the proxy or spdz connection status.
 *   Each stream value contains an object with:
 *     { eventType: PROXY_CONNECT | SPDZ_CONNECT, status: true (==connected) or 
 *       false, msg: full status message }
 *
 *  clientResponseStream: the responses from client initiated actions, e.g.
 *   send input. Will wait for matched responses from all SPDZ engines.
 *   Each stream value contains an array of:
 *     { eventType: SEND_INPUT,
 *       status: true (send worked) or false,
 *       msg: full status msg }  
 * 
 *  spdzResultStream: the results returned by SPDZ where 
 *   each stream value contains an Array<Integers>.
 * 
 *  spdzErrorStream: errors as a result of SPDZ initiated messages, not
 *   directly related to a client initiated action.
 * 
 * @param {Object} userOptions to override socket.io connection options. 
 * @param {Array} proxyList array of objects {url, optional encryptionKey} 
 *
 * @returns {EventStream} connectionStream rx stream 
 * @returns {EventStream} clientResponseStream rx stream
 * @returns {EventStream} spdzResultStream rx stream
 * @returns {EventStream} spdzErrorStream rx stream
 */
const connectToSPDZProxy = (userOptions, ...proxyList) => {
  // Merge user options with defaults.
  const connectOptions = Object.assign(
    {},
    {
      path: '/spdz/socket.io',
      reconnection: true,
      reconnectionAttempts: 12,
      reconnectionDelay: 5000,
      timeout: 2000,
      autoConnect: true
    },
    userOptions
  )

  let proxyConnectionStreamList = []
  let spdzConnectionStreamList = []
  let otherResponseStreamList = []
  let sharesStreamList = []
  let outputsStreamList = []

  for (const proxy of proxyList) {
    const [
      proxyConnectionStream,
      spdzConnectionStream,
      otherResponseStream,
      sharesStream,
      outputsStream
    ] = connectSetup(
      connectOptions,
      proxy.url,
      proxy.encryptionKey,
      webSocketBus
    )
    proxyConnectionStreamList.push(proxyConnectionStream)
    spdzConnectionStreamList.push(spdzConnectionStream)
    otherResponseStreamList.push(otherResponseStream)
    sharesStreamList.push(sharesStream)
    outputsStreamList.push(outputsStream)
  }

  // Combine connection events so that:
  // 1. wait until all proxies have replied with at least one event
  // 2. each time a proxy sends a connect/disconnect get a combined event of all latest proxy events.
  const connectionStream = Bacon.mergeAll(
    Bacon.combineAsArray(proxyConnectionStreamList),
    Bacon.combineAsArray(spdzConnectionStreamList)
  ).flatMap(value => {
    return flattenResponseMessage(value)
  })

  // keep latest connection status as state
  connectionStream.onValue(response => {
    if (response.eventType === EVENT_TYPE.PROXY_CONNECT) {
      connectedToProxies = response.status
    } else if (response.eventType === EVENT_TYPE.SPDZ_CONNECT) {
      connectedToSpdz = response.status
    }
  })

  // Combine each proxies rx stream with zip (meaning waits until all proxies send message to get matched responses).
  // Note errors are not combined, so each proxy error will be sent separately.
  const combinedOtherResponseStream = Bacon.zipAsArray(otherResponseStreamList)
  const combinedSharesStream = Bacon.zipAsArray(sharesStreamList)
  const combinedOutputsStream = Bacon.zipAsArray(outputsStreamList)

  // Convert arrays of binary buffers into array of Gfp shares
  const extractedSharesStream = combinedSharesStream.flatMap(
    extractValidateShares
  )

  // Convert arrays of binary buffers into array of numbers.
  const spdzResultStream = combinedOutputsStream.flatMap(convertOutput)

  // Capture errors which are not directly related to a client send, to allow client to report / act on them.
  const spdzErrorStream = Bacon.mergeAll(
    extractedSharesStream.errors(),
    spdzResultStream.errors()
  )

  // Configure streams to send input combined with shares to websocket
  const sendValueStream = setupSendInputShareStream(
    userInputBus,
    extractedSharesStream,
    webSocketBus
  )

  // Extract out errors and convert into responses to be used by caller to
  // identify when send didn't work.
  const sendValueStreamErrors = sendValueStream.errors().flatMapError(v => {
    return [{ eventType: EVENT_TYPE.SEND_INPUT, status: false, msg: v }]
  })

  // Responses to client initiated actions
  const clientResponseStream = Bacon.mergeAll(
    combinedOtherResponseStream,
    sendValueStreamErrors
  ).flatMap(value => {
    return flattenResponseMessage(value)
  })

  return [
    connectionStream,
    clientResponseStream,
    spdzResultStream,
    spdzErrorStream
  ]
}

/**
 * Request a connection to all SPDZ engines.
 * @param {String} [publicKey] 256 bit public key as 64 byte hex string, optional if passed then encrypt comms.
 */
const connectToSpdz = (publicKey = '') => {
  if (connectedToProxies) {
    webSocketBus.push({
      eventType: 'connectToSpdz',
      publicKey: publicKey
    })
  } else {
    throw new Error(
      'Cannot run SPDZ connection if not connected to all SPDZ Proxies.'
    )
  }
}

/**
 * Disconnect client from SPDZ engines.
 */
const disconnectFromSpdz = () => {
  if (connectedToSpdz) {
    webSocketBus.push({
      eventType: 'disconnectFromSpdz'
    })
  } else {
    throw new Error('Not connected to all SPDZ Engines.')
  }
}

/**
 * Send input to SPDZ. List supports integers and float point numbers (converted to fixed).
 * List must contain only 1 type.
 * @param {Array<Number>} inputList numbers to send to SPDZ. 
 */
const sendInputsWithShares = inputList => {
  if (connectedToProxies && connectedToSpdz) {
    userInputBus.push(convertUserInput(inputList))
  } else {
    throw new Error('Not connected to all SPDZ Proxies/Engines.')
  }
}

/**
 * Send clear (non secret) integers to SPDZ.
 * @param {Array<Number>} inputList Integers to send to SPDZ in clear.  
 * @param {String} spdzType int32 (default) or modp. 
 */
const sendClearInputs = (inputList, spdzType = 'int32') => {
  if (connectedToProxies && connectedToSpdz) {
    webSocketBus.push({
      eventType: 'sendData',
      dataType: spdzType,
      dataArray: convertUserInput(inputList)
    })
  } else {
    throw new Error('Not connected to all SPDZ Proxies/Engines.')
  }
}

export {
  connectToSPDZProxy,
  connectToSpdz,
  disconnectFromSpdz,
  sendClearInputs,
  sendInputsWithShares
}
