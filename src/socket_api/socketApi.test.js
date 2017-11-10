import { Server, SocketIO } from 'mock-socket'
import { createEncryptionKey } from '../crypto'
import {
  connectToSPDZProxy,
  connectToSpdz,
  sendInputsWithShares
} from './socketApi'
import { EVENT_TYPE } from './transform'
import logger from '../utility/logging'
logger.level = 'info'

// Mock socket io client and replace with mock socket - to connect to mock server
jest.mock('socket.io-client')
import Io from 'socket.io-client'

beforeAll(() => {
  Io.mockImplementation((url, connectOptions) => SocketIO(url, connectOptions))
})

afterAll(() => {
  Io.mockClear()
})

describe('Manage order of connecting to SPDZ', () => {
  it('cannot connect to SPDZ before establishing web socket connection', () => {
    const testThrows = () => connectToSpdz('0102030405', false)
    expect(testThrows).toThrowError(
      'Cannot run SPDZ connection if not connected to all SPDZ Proxies.'
    )
  })

  it('cannot send input SPDZ before establishing web socket connection', () => {
    const testThrows = () => sendInputsWithShares([123])
    expect(testThrows).toThrowError(
      'Not connected to all SPDZ Proxies/Engines.'
    )
  })
})

describe('Connect to mock websocket server', () => {
  const encryptionKey = createEncryptionKey(
    'a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b9'
  )
  let mockProxy1, mockProxy2
  const connectParms = [
    {
      path: '/socket.io',
      reconnection: false
    },
    {
      url: 'http://localhost:8389',
      encryptionKey: encryptionKey
    },
    {
      url: 'http://localhost:8390',
      encryptionKey: encryptionKey
    }
  ]

  beforeEach(() => {
    mockProxy1 = new Server('http://localhost:8389/spdzapi')
    mockProxy2 = new Server('http://localhost:8390/spdzapi')
  })

  afterEach(() => {
    mockProxy1.stop()
    mockProxy2.stop()
  })

  it('connects successfully to 2 proxies', done => {
    const [connectionStream] = connectToSPDZProxy(...connectParms)

    connectionStream.onValue(resp => {
      try {
        expect(resp.eventType).toEqual(EVENT_TYPE.PROXY_CONNECT)
        expect(resp.status).toBeTruthy()
        done()
      } catch (err) {
        done.fail(err)
      }
    })
  })

  it('sends the SPDZ connection command to 2 proxies, successfully', done => {
    const [connectionStream] = connectToSPDZProxy(...connectParms)

    //Setup responses
    mockProxy1.on('connectToSpdz', () => {
      mockProxy1.emit('connectToSpdz_result', { status: 0 })
    })
    mockProxy2.on('connectToSpdz', () => {
      mockProxy2.emit('connectToSpdz_result', { status: 0 })
    })

    connectionStream.onValue(resp => {
      try {
        if (resp.eventType === EVENT_TYPE.PROXY_CONNECT) {
          connectToSpdz('0102030405', false)
        } else if (resp.eventType === EVENT_TYPE.SPDZ_CONNECT) {
          expect(resp.status).toBeTruthy()
          done()
        } else {
          done.fail(`Unexpected eventType ${resp.eventType}.`)
        }
      } catch (err) {
        done.fail(err)
      }
    })
  })

  it('sends the SPDZ connection command to 2 proxies, unsuccessfully', done => {
    const [connectionStream] = connectToSPDZProxy(...connectParms)

    //Setup responses
    mockProxy1.on('connectToSpdz', () => {
      mockProxy1.emit('connectToSpdz_result', { status: 0 })
    })
    mockProxy2.on('connectToSpdz', () => {
      mockProxy2.emit('connectToSpdz_result', {
        status: 1,
        err: 'Fake connect failure.'
      })
    })

    connectionStream.onValue(resp => {
      try {
        if (resp.eventType === EVENT_TYPE.PROXY_CONNECT) {
          connectToSpdz('0102030405', false)
        } else if (resp.eventType === EVENT_TYPE.SPDZ_CONNECT) {
          expect(resp.status).toBeFalsy()
          done()
        } else {
          done.fail(`Unexpected eventType ${resp.eventType}.`)
        }
      } catch (err) {
        done.fail(err)
      }
    })
  })
})
