/**
 * Supporting transform functions for client websocket connections to SPDZ.
 */

import Bacon from 'baconjs'
import assert from 'assert'

import {
  binaryToIntArray,
  binaryToGfpArray
} from '../type_mapping/binaryToArray'
import { base64Encode } from '../utility/binary.js'
import { decrypt } from '../crypto'
import { Gfp } from '../math/Gfp'
import { jsNumberToShiftedInteger } from '../math/numericConversions'
import logger from '../utility/logging'
import listComparison from '../utility/listComparison'
import binaryToShare from '../type_mapping/binaryToShare'

/**
 * Identify type of return message from SPDZ.
 * Matches SPDZ ClientMessageType in Compiler/type.py 
 */
const MESSAGE_TYPE = {
  NOTYPE: 0,
  TRIPLE_SHARES: 1,
  CLEAR_MODP_INT: 2,
  INT_32: 3,
  CLEAR_MODP_FIX: 4
}

/**
 * Identify the event in the stream.
 */
const EVENT_TYPE = {
  PROXY_CONNECT: 'Proxy connect',
  SPDZ_CONNECT: 'SPDZ connect',
  SEND_INPUT: 'send input',
  ERROR: 'error',
  TIMEOUT: 'timeout'
}

/**
 * From an array of buffers (1 per SPDZ engine) extract out and validate n shares.
 * The number is determined by the length of the byteBuffer.
 * 
 * @param {Array<Uint8Array>} byteBufferList 
 * @returns {Array<Gfp>} list of shares 
 */
const extractValidateShares = byteBufferList => {
  try {
    const shareList = binaryToShare(byteBufferList)
    logger.debug(`Received ${shareList.length} shares from SPDZ.`)
    return shareList
  } catch (err) {
    return new Bacon.Error(err.message)
  }
}

/**
 * Extract out event type and status from array of SPDZ engine response messages.
 * 
 * @param {Array} msgList List of websocket response messages. 
 * @returns {Object} {eventType : EVENT_TYPE if all same, otherwise ERROR,
 *                    status : true if all inputs have status true otherwise false,
 *                    msg : incoming msg}
 */
const flattenResponseMessage = msgList => {
  assert(
    msgList !== undefined && msgList.length > 0,
    'Expect non zero response messages in flattenResponseMessage.'
  )
  const allSame = listComparison(msgList, (a, b) => a.eventType === b.eventType)
  const extractStatus = () =>
    msgList.reduce((a, b) => (a = a && b.status), true)

  return {
    eventType: allSame ? msgList[0].eventType : EVENT_TYPE.ERROR,
    status: allSame ? extractStatus() : false,
    msg: msgList
  }
}

const messageTypeExists = magicNumber =>
  Object.values(MESSAGE_TYPE).indexOf(magicNumber) > -1

/**
 * Validate and convert byte array to number array. 
 * This supports SPDZ returning results in the clear, where each engine is expected to return
 * the same result. These results are compared and only 1 engine results returned.
 * Uses MESSAGE_TYPE returned by SPDZ to determine parsing.
 * @param {Array} dataList array of objects {messageType, data}, where data contains n results.
 * @returns {Array} Number type. 
 */
const convertOutput = dataList => {
  try {
    logger.debug('Received output from SPDZ.')
    const messageType = dataList.reduce(
      (result, output) => (result = output.messageType),
      MESSAGE_TYPE.NOTYPE
    )
    const byteBufferList = dataList.map(output => output.data)
    if (messageType === MESSAGE_TYPE.CLEAR_MODP_INT) {
      const gfpResultList = binaryToGfpArray(byteBufferList)
      return gfpResultList.map(gfp => gfp.toJSInteger())
    } else if (messageType === MESSAGE_TYPE.INT_32) {
      return binaryToIntArray(byteBufferList)
    } else if (messageType === MESSAGE_TYPE.CLEAR_MODP_FIX) {
      //cfix comes back as bit shifted cint
      const gfpResultList = binaryToGfpArray(byteBufferList)
      return gfpResultList.map(gfp => gfp.toJSFixedPoint())
    } else {
      throw new Error(
        `Got output stream with message type ${messageType} not currently handled.`
      )
    }
  } catch (err) {
    return new Bacon.Error(err.message)
  }
}

/**
 * Check that list contains numbers. If any numbers are non-integer treat all as 
 * fixed point and convert according to SPDZ sfix/cfix format.
 * 
 * @param {Array} inputList of numbers
 * @return {Array} unchanged list or bit shifted fixed points.
 */
const convertUserInput = inputList => {
  const validNumbers = listComparison(
    inputList,
    (a, b) => typeof a === 'number' && typeof b === 'number'
  )

  if (!validNumbers) {
    throw new Error(`User input values [${inputList}] must be numbers.`)
  }

  const allIntegers = listComparison(
    inputList,
    (a, b) => Number.isInteger(a) && Number.isInteger(b)
  )

  if (allIntegers) {
    return inputList
  } else {
    return inputList.map(a =>
      jsNumberToShiftedInteger(
        a,
        Gfp.fixedPointDecBitLength(),
        Gfp.fixedPointWholeBitLength()
      )
    )
  }
}

/**
 * Parse a message from SPDZ to extract out the header.
 * 
 * @param {Uint8Array} messageBytes 
 * @param {String} encryptionKey session key agreed between client and SPDZ server. 
 * If undefined then assume SPDZ message not encrypted. 
 * @param {String} url SPDZ proxy url - helps with logging 
 * 
 * @returns {messageType} to indicate the layout / purpose of the message
 * @returns {remainingBytes} the remaining bytes 
  */
const parseSpdzMessage = (messageBytes, encryptionKey, url) => {
  try {
    assert(
      messageBytes instanceof Uint8Array,
      `Message from SPDZ should be a Uint8Array type, got a ${typeof messageBytes}.`
    )
    const clearBytes =
      encryptionKey !== undefined
        ? decrypt(encryptionKey, messageBytes)
        : new Uint8Array(messageBytes)

    assert(
      clearBytes.length >= 8,
      `Message from SPDZ must be at least 8 bytes, given ${clearBytes.length}.`
    )

    const messageType = binaryToIntArray([clearBytes.slice(0, 4)])[0]
    const remainingBytes = clearBytes.slice(4)

    if (!messageTypeExists(messageType)) {
      throw new Error(`Unknown message type ${messageType}.`)
    }

    return { messageType: messageType, data: remainingBytes }
  } catch (err) {
    logger.debug(err)
    return new Bacon.Error(
      `Parsing message sent by SPDZ. ${err.message} Proxy ${url}.`
    )
  }
}

/**
 * Setup the streams to combine sending user input with shares to SPDZ.
 * 
 * Seems counter intuitive to send the same inputs to each SPDZ proxy (where is the sharing?), but SPDZ runs a 
 * protocol to split out the input using the local share and a special - operator which behaves differently 
 * depending on party number. 
 * 
 * @param {EventStream} userInputBus user input as integers.
 * @param {EventStream} extractedSharesStream SPDZ input of shares.
 * @param {EventStream} webSocketBus output stream to initiate socket emit events
 * 
 * @returns {EventStream} sendValueStream to monitor for errors.
 */
const setupSendInputShareStream = (
  userInputBus,
  extractedSharesStream,
  webSocketBus
) => {
  // Need flatMap or errors are sent as values
  const sendValueStream = userInputBus
    .zip(extractedSharesStream)
    .flatMap(inp_share => {
      const inputList = inp_share[0]
      const shareList = inp_share[1]
      if (inputList.length !== shareList.length) {
        const warnMsg = `Trying to send ${inputList.length} input(s) but ${shareList.length} share(s) suppled.`
        logger.debug(warnMsg)
        return new Bacon.Error(warnMsg)
      }
      return inputList.map((input, i) => {
        const sharedInput = shareList[i].add(Gfp.fromUserInput(input))
        return base64Encode(sharedInput.toNativeHexString())
      })
    })

  sendValueStream.onValue(inputList => {
    logger.debug(`About to send ${inputList.length} input(s).`)
    webSocketBus.push({
      eventType: 'sendData',
      dataType: 'modp',
      dataArray: inputList
    })
  })

  return sendValueStream
}

/**
 * Merge into a stream a timeout event which then ends the stream. Use to wait for an event 
 * for a specified time and then stop.
 * 
 * @param {EventStream} stream to add a timeout event to 
 * @param {Number} timeout in ms before adding the EVENT_TYPE.TIMEOUT event 
 * @returns stream with timeout event added (in the future!).
 */
const streamWithTimeout = (stream, timeout) => {
  const timerStream = Bacon.fromBinder(sink => {
    setTimeout(() => {
      sink(
        new Bacon.Next({
          eventType: EVENT_TYPE.TIMEOUT
        })
      )
      sink(new Bacon.End())
    }, timeout)
    return () => {}
  })

  return stream.merge(timerStream)
}

export {
  convertOutput,
  convertUserInput,
  EVENT_TYPE,
  extractValidateShares,
  flattenResponseMessage,
  MESSAGE_TYPE,
  parseSpdzMessage,
  setupSendInputShareStream,
  streamWithTimeout
}
