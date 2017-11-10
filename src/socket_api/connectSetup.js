import Io from 'socket.io-client'
import Bacon from 'baconjs'

import { MESSAGE_TYPE, parseSpdzMessage, EVENT_TYPE } from './transform'
import logger from '../utility/logging'

/**
 * Run web socket connection to SPDZ proxy for a specific SPDZ server, using namespace /spdzapi.
 * Trap socket events and process into rx streams which are returned.
 * 
 * @param {Object} connectOptions socket.io connection options 
 * @param {String} url SPDZ Proxy URL (no namespace)
 * @param {String} encryptionKey session key agreed between client and SPDZ server. 
 *                 If undefined then assume SPDZ message not encrypted.
 * @param {EventStream} webSocketBus rx stream to push socket.emit events. 
 *
 * @returns {proxyConnectionStream} websocket connection events to the spdzproxy, both user initiated
 *                                  and auto reconnect, in an rx stream 
 * @returns {spdzConnectionStream} spdz connection events, both user initiated and spdz initiated in an rx stream. 
 * @returns {sendResponseStream} client response events, e.g. response to client sending inputs, in an rx stream. 
 * @returns {sharesStream} raw byte shares sent by spdz in an rx stream
 * @returns {outputsStream} raw byte outputs sent by spdz in an rx stream
 */
const connectSetup = (connectOptions, url, encryptionKey, webSocketBus) => {
  logger.debug(
    `About to request web socket connection to ${url} with options ${JSON.stringify(
      connectOptions
    )}.`
  )
  const namespace = '/spdzapi'
  const socket = Io(url + namespace, connectOptions)

  //***************************************
  // Wrap socket events in Bacon (reactive)
  //***************************************
  // Gather websocket connection messages from SPDZ Proxy into single stream
  // this includes client initiated connections and auto reconnects.
  const proxyConnectionStream = Bacon.fromBinder(sink => {
    socket.on('connect', () => {
      sink({
        eventType: EVENT_TYPE.PROXY_CONNECT,
        status: true,
        url: url,
        msg: 'SPDZ Proxy connection made.'
      })
    })

    socket.on('connect_error', () => {
      sink({
        eventType: EVENT_TYPE.PROXY_CONNECT,
        status: false,
        url: url,
        msg: 'Connection error.'
      })
    })

    socket.on('connect_timeout', () => {
      sink({
        eventType: EVENT_TYPE.PROXY_CONNECT,
        status: false,
        url: url,
        msg: 'Connection timeout.'
      })
    })

    socket.on('disconnect', () => {
      sink({
        eventType: EVENT_TYPE.PROXY_CONNECT,
        status: false,
        url: url,
        msg: 'Disconnected from SPDZ proxy.'
      })
    })

    //Used for unsubscribe tidy up
    return () => {}
  })

  // Trap spdz connect and disconnects, user initiated and spdz initiated
  const spdzConnectionStream = Bacon.fromBinder(sink => {
    socket.on('connectToSpdz_result', response => {
      if (response.status === 0) {
        sink({
          eventType: EVENT_TYPE.SPDZ_CONNECT,
          status: true,
          url: url,
          msg: 'SPDZ engine connection made.'
        })
      } else {
        sink({
          eventType: EVENT_TYPE.SPDZ_CONNECT,
          status: false,
          url: url,
          msg: response.err
        })
      }
    })

    socket.on('disconnectFromSpdz_result', () => {
      sink({
        eventType: EVENT_TYPE.SPDZ_CONNECT,
        status: false,
        url: url,
        msg: 'Disconnected from SPDZ engine.'
      })
    })

    socket.on('spdz_socketDisconnected', () => {
      sink({
        eventType: EVENT_TYPE.SPDZ_CONNECT,
        status: false,
        url: url,
        msg: 'Disconnected from SPDZ engine.'
      })
    })
  })

  // Gather response messages from client actions
  const otherResponseStream = Bacon.fromBinder(sink => {
    socket.on('sendData_result', response => {
      sink({
        eventType: EVENT_TYPE.SEND_INPUT,
        status: response.status === 0 ? true : false,
        url: url,
        msg: response.status === 0 ? 'Input sent to SPDZ.' : response.err
      })
    })

    //Used for unsubscribe tidy up
    return () => {}
  })

  //Decrypt (if encryptionKey is set), then work out message type and data type, rest is data
  // Errors get propagated to be caught in all follow on stream.onError handlers
  const spdzMessageStream = Bacon.fromEvent(socket, 'spdz_message', value => {
    return parseSpdzMessage(value, encryptionKey, url)
  })

  // Forward on data for input shares.
  // Shares don't need dataType, always MODP and so 16 byte integers.
  const sharesStream = spdzMessageStream
    .filter(value => value.messageType === MESSAGE_TYPE.TRIPLE_SHARES)
    .map(value => {
      return value.data
    })

  // Forward on regType and data, parsing depends on MODP (16) or INT (4) byte integers.
  const outputsStream = spdzMessageStream
    .filter(value => value.messageType !== MESSAGE_TYPE.TRIPLE_SHARES)
    .map(value => {
      return { messageType: value.messageType, data: value.data }
    })

  // Send outgoing messages
  webSocketBus.onValue(value => {
    if (value.eventType === 'connectToSpdz') {
      socket.emit(value.eventType, value.publicKey)
    } else if (value.eventType === 'sendData') {
      socket.emit(value.eventType, value.dataType, value.dataArray)
    } else if (value.eventType === 'disconnectFromSpdz') {
      socket.emit(value.eventType)
    } else {
      logger.warn(`Don't know what to do with event type ${value.eventType}`)
    }
  })

  return [
    proxyConnectionStream,
    spdzConnectionStream,
    otherResponseStream,
    sharesStream,
    outputsStream
  ]
}

export default connectSetup
