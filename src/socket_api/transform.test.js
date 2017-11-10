import Bacon from 'baconjs'
import {
  convertOutput,
  convertUserInput,
  flattenResponseMessage,
  MESSAGE_TYPE,
  parseSpdzMessage,
  EVENT_TYPE,
  setupSendInputShareStream,
  streamWithTimeout
} from './transform'
import { Gfp, initFixedPointParams } from '../math/Gfp'
import { roundFixed } from '../math/numericConversions'
import logger from '../utility/logging'
logger.level = 'info'

// Override default fixed point params
initFixedPointParams(10, 41)

// Mock socket io client and replace with mock socket - to connect to mock server
jest.mock('../type_mapping/binaryToArray')
import {
  binaryToIntArray,
  binaryToGfpArray
} from '../type_mapping/binaryToArray'

jest.mock('../crypto')
import { decrypt } from '../crypto'

// Doesn't matter here what the data is.
const fakeBinaryData = [
  Uint8Array.from([0x1, 0x0, 0x0, 0x0]),
  Uint8Array.from([0x1, 0x0, 0x0, 0x0])
]

beforeAll(() => {
  // err
})

describe('Convert SPDZ output result buffer into integers', () => {
  afterEach(() => {
    binaryToIntArray.mockClear()
    binaryToGfpArray.mockClear()
  })

  it('extracts integers successfully from an INT output message', () => {
    const input = [
      { messageType: MESSAGE_TYPE.INT_32, data: fakeBinaryData },
      { messageType: MESSAGE_TYPE.INT_32, data: fakeBinaryData }
    ]

    binaryToIntArray.mockImplementationOnce(() => [123])

    const result = convertOutput(input)
    expect(result).toEqual([123])
  })

  it('extracts integers successfully from a CLEAR_MODP_INT output message', () => {
    const input = [
      { messageType: MESSAGE_TYPE.CLEAR_MODP_INT, data: fakeBinaryData },
      { messageType: MESSAGE_TYPE.CLEAR_MODP_INT, data: fakeBinaryData }
    ]

    binaryToGfpArray.mockImplementationOnce(() => [Gfp.fromUserInput(9989)])

    const result = convertOutput(input)
    expect(result).toEqual([9989])
  })

  it('extracts fixed point successfully from a CLEAR_MODP_FIX output message', () => {
    const input = [
      { messageType: MESSAGE_TYPE.CLEAR_MODP_FIX, data: fakeBinaryData },
      { messageType: MESSAGE_TYPE.CLEAR_MODP_FIX, data: fakeBinaryData }
    ]

    binaryToGfpArray.mockImplementationOnce(() => [
      Gfp.fromUserInput(505513, false)
    ])

    const result = convertOutput(input)
    expect(result.length).toEqual(1)
    expect(roundFixed(result[0], Gfp.fixedPointDecBitLength())).toEqual(
      '493.665'
    )
  })

  it('throws an error if an unknown reg type is encountered', () => {
    const input = [
      { messageType: 99, data: fakeBinaryData },
      { messageType: 99, data: fakeBinaryData }
    ]

    const result = convertOutput(input)

    expect(result.isError()).toBeTruthy()
    expect(result.error).toEqual(
      'Got output stream with message type 99 not currently handled.'
    )
  })
})

describe('Validate and convert inputs to SPDZ', () => {
  it('accepts a list of integers as inputs unchanged', () => {
    const input = [1, 2, 3, 4]

    const result = convertUserInput(input)
    expect(result).toEqual(input)
  })
  it('converts a list of numbers containing non integers to spdz fixed point', () => {
    const input = [1, 2, 3.4, 4]

    const result = convertUserInput(input)
    expect(result).toEqual([1024, 2048, 3482, 4096])
  })
  it('throws an error if the list contains non numbers', () => {
    const input = [1, 'foobar']
    const testThrows = () => convertUserInput(input)

    expect(testThrows).toThrowError(
      'User input values [1,foobar] must be numbers.'
    )
  })
})

describe('Parse a message of bytes from SPDZ to extract out the headers', () => {
  afterEach(() => {
    decrypt.mockClear()
    binaryToIntArray.mockClear()
    binaryToGfpArray.mockClear()
  })

  it('extracts headers successfully, encrypted', () => {
    const encryptedBytes = Uint8Array.from([0xaa, 0xab, 0xcd, 0xef])

    // Length matters but content doesn't in this test
    // prettier-ignore
    decrypt.mockImplementationOnce(() =>
      Uint8Array.from([0x3,0x0,0x0,0x0,0x3,0x0,0x0,0x0])
    )
    binaryToIntArray.mockImplementationOnce(() => [MESSAGE_TYPE.INT_32])

    const result = parseSpdzMessage(
      encryptedBytes,
      '1234',
      'https://some.proxy.url'
    )

    expect(result.messageType).toEqual(3)
    expect(result.data).toEqual(Uint8Array.from([0x3, 0x0, 0x0, 0x0]))
  })

  it('extracts headers successfully, not encrypted', () => {
    // prettier-ignore
    const messageBytes = Uint8Array.from([0x3,0x0,0x0,0x0,0x3,0x0,0x0,0x0])

    binaryToIntArray.mockImplementationOnce(() => [MESSAGE_TYPE.INT_32])

    const result = parseSpdzMessage(
      messageBytes,
      undefined,
      'https://some.proxy.url'
    )

    expect(result.messageType).toEqual(3)
    expect(result.data).toEqual(Uint8Array.from([0x3, 0x0, 0x0, 0x0]))
  })

  it('throws a Bacon.js error if input buffer is too short', () => {
    const encryptedBytes = Uint8Array.from([0xaa, 0xab, 0xcd, 0xef])

    // Length matters but content doesn't in this test
    // prettier-ignore
    decrypt.mockImplementationOnce(() =>
      Uint8Array.from([0x2,0x0,0x0,0x0,0x2,0x0,0x0])
    )

    const result = parseSpdzMessage(
      encryptedBytes,
      '1234',
      'https://some.proxy.url'
    )

    expect(result.isError()).toBeTruthy()
    expect(result.error).toEqual(
      'Parsing message sent by SPDZ. Message from SPDZ must be at least 8 bytes, given 7. Proxy https://some.proxy.url.'
    )
  })

  it('throws a Bacon.js error if unknown message type received', () => {
    const encryptedBytes = Uint8Array.from([0xaa, 0xab, 0xcd, 0xef])

    // Length matters but content doesn't in this test
    // prettier-ignore
    decrypt.mockImplementationOnce(() =>
      Uint8Array.from([0x9,0x0,0x0,0x0,0x2,0x0,0x0,0x0,0x3,0x0,0x0,0x0])
    )

    binaryToIntArray.mockImplementationOnce(() => [9])

    const result = parseSpdzMessage(
      encryptedBytes,
      '1234',
      'https://some.proxy.url'
    )

    expect(result.isError()).toBeTruthy()
    expect(result.error).toEqual(
      'Parsing message sent by SPDZ. Unknown message type 9. Proxy https://some.proxy.url.'
    )
  })
})

describe('Combine user input with shares to send to SPDZ.', () => {
  let extractedSharesStream = undefined
  let webSocketBus = undefined
  let userInputBus = undefined

  beforeEach(() => {
    extractedSharesStream = new Bacon.Bus()
    webSocketBus = new Bacon.Bus()
    userInputBus = new Bacon.Bus()
  })

  it('combines 2 inputs with 2 shares and pushes to the webSocketBus', done => {
    setupSendInputShareStream(userInputBus, extractedSharesStream, webSocketBus)

    webSocketBus.onValue(value => {
      try {
        expect(value.eventType).toEqual('sendData')
        expect(value.dataType).toEqual('modp')
        expect(value.dataArray).toEqual([
          'ZHUdXxiHeXxAg3MleGr/OQ==',
          'R314o6eIjfP7j+wEYBL+cQ=='
        ])
        done()
      } catch (err) {
        done.fail(err)
      }
    })

    extractedSharesStream.push([
      Gfp.fromUserInput('100'),
      Gfp.fromUserInput('200')
    ])
    userInputBus.push([1, 2])
  })

  it('tries to combine 2 inputs with 1 share and gets an error', done => {
    const sendValueStream = setupSendInputShareStream(
      userInputBus,
      extractedSharesStream,
      webSocketBus
    )

    sendValueStream.onError(value => {
      try {
        expect(value).toEqual(
          'Trying to send 2 input(s) but 1 share(s) suppled.'
        )
        done()
      } catch (err) {
        done.fail(err)
      }
    })

    extractedSharesStream.push([Gfp.fromUserInput('100')])
    userInputBus.push([1, 2])
  })
})

describe('Flatten an array of SPDZ proxy response messages', () => {
  it('3 success messages, same type', () => {
    const input = [
      {
        eventType: 'connect',
        status: true,
        url: 'http://foo',
        msg: 'Connect OK.'
      },
      {
        eventType: 'connect',
        status: true,
        url: 'http://foo',
        msg: 'Connect OK.'
      },
      {
        eventType: 'connect',
        status: true,
        url: 'http://foo',
        msg: 'Connect OK.'
      }
    ]
    const expected = {
      eventType: 'connect',
      status: true,
      msg: input
    }
    expect(flattenResponseMessage(input, 'error')).toEqual(expected)
  })
  it('2 success,1 error message, same type', () => {
    const input = [
      {
        eventType: 'connect',
        status: true,
        url: 'http://foo',
        msg: 'Connect OK.'
      },
      {
        eventType: 'connect',
        status: false,
        url: 'http://foo',
        msg: 'Connect Failed.'
      },
      {
        eventType: 'connect',
        status: true,
        url: 'http://foo',
        msg: 'Connect OK.'
      }
    ]
    const expected = {
      eventType: 'connect',
      status: false,
      msg: input
    }
    expect(flattenResponseMessage(input, 'error')).toEqual(expected)
  })
  it('Different response types', () => {
    const input = [
      {
        eventType: 'connect_response',
        status: true,
        url: 'http://foo',
        msg: 'Connect OK.'
      },
      {
        eventType: 'disconnect_response',
        status: true,
        url: 'http://foo',
        msg: 'Disconnect OK.'
      },
      {
        eventType: 'connect_response',
        status: true,
        url: 'http://foo',
        msg: 'Connect OK.'
      }
    ]
    const expected = {
      eventType: 'error',
      status: false,
      msg: input
    }
    expect(flattenResponseMessage(input, 'error')).toEqual(expected)
  })
})

describe('Create stream with timeout', () => {
  let connectEvents

  beforeEach(() => {
    connectEvents = Bacon.sequentially(200, [
      {
        eventType: EVENT_TYPE.PROXY_CONNECT,
        status: false
      },
      {
        eventType: EVENT_TYPE.PROXY_CONNECT,
        status: true
      }
    ])
  })

  it('ends with a timeout event', done => {
    let i = 0
    const unsub = streamWithTimeout(connectEvents, 220).onValue(value => {
      i++
      if (i === 1) {
        expect(value).toEqual({
          eventType: EVENT_TYPE.PROXY_CONNECT,
          status: false
        })
      } else {
        expect(value).toEqual({
          eventType: EVENT_TYPE.TIMEOUT
        })
        unsub()
        done()
      }
    })
  })

  it('does not end with a timeout event', done => {
    let i = 0
    const unsub = streamWithTimeout(connectEvents, 420).onValue(value => {
      i++
      if (i === 1) {
        expect(value).toEqual({
          eventType: EVENT_TYPE.PROXY_CONNECT,
          status: false
        })
      } else {
        expect(value).toEqual({
          eventType: EVENT_TYPE.PROXY_CONNECT,
          status: true
        })
        unsub()
        done()
      }
    })
  })
})
