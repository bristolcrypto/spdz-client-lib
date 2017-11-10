import { Gfp } from '../math/Gfp'
import {
  connectToSPDZ,
  checkProxies,
  consumeDataFromProxies,
  sendInputsToProxies,
  allProxiesConnected
} from './SpdzApiAggregate'
import ProxyStatusCodes from './ProxyStatusCodes'
import logger from '../utility/logging'
logger.level = 'info'

jest.mock('./SpdzApi')
import {
  connectProxyToEngine,
  checkEngineConnection,
  consumeDataFromProxy,
  sendDataToProxy
} from './SpdzApi'

jest.mock('../crypto')
import { decrypt } from '../crypto'

jest.mock('./ClientIds')
import { clientIdExists, getClientId, storeClientId } from './ClientIds'

const spdzProxyUrlList = [
  'http://spdzProxy.one:4000',
  'http://spdzProxy.two:4000',
  'http://spdzProxy.three:4000'
]

const spdzProxyList = [
  { url: 'http://spdzProxy.one:4000', clientId: '11' },
  { url: 'http://spdzProxy.two:4000', clientId: '22' },
  { url: 'http://spdzProxy.three:4000', clientId: '33' }
]

describe('Client making multiple Spdz proxy to engine connections', () => {
  afterEach(() => {
    connectProxyToEngine.mockClear()
    storeClientId.mockClear()
  })

  it('Sets the connection status when all connections work, no client id supplied', done => {
    connectProxyToEngine
      .mockImplementationOnce(() => Promise.resolve('11'))
      .mockImplementationOnce(() => Promise.resolve('22'))
      .mockImplementationOnce(() => Promise.resolve('33'))

    const expectedResult = [
      { id: 0, status: 2, clientId: '11' },
      { id: 1, status: 2, clientId: '22' },
      { id: 2, status: 2, clientId: '33' }
    ]

    connectToSPDZ(spdzProxyUrlList, '/apiroot')
      .then(values => {
        expect(values.length).toEqual(3)
        expect(values).toEqual(expectedResult)
        expect(storeClientId).toHaveBeenCalledWith(
          'http://spdzProxy.one:4000',
          '11'
        )
        expect(storeClientId).toHaveBeenCalledWith(
          'http://spdzProxy.two:4000',
          '22'
        )
        expect(storeClientId).toHaveBeenCalledWith(
          'http://spdzProxy.three:4000',
          '33'
        )
        done()
      })
      .catch(err => {
        done.fail(err)
      })
  })

  it('Sets the connection status when all connections work, client id supplied', done => {
    connectProxyToEngine
      .mockImplementationOnce(() => Promise.resolve('123'))
      .mockImplementationOnce(() => Promise.resolve('123'))
      .mockImplementationOnce(() => Promise.resolve('123'))

    const expectedResult = [
      { id: 0, status: 2, clientId: '123' },
      { id: 1, status: 2, clientId: '123' },
      { id: 2, status: 2, clientId: '123' }
    ]

    connectToSPDZ(spdzProxyUrlList, '/apiroot', 123, '010203')
      .then(values => {
        expect(values.length).toEqual(3)
        expect(values).toEqual(expectedResult)
        done()
      })
      .catch(err => {
        done.fail(err)
      })
  })

  it('Sets the connection status when some connections do not work', done => {
    connectProxyToEngine
      .mockImplementationOnce(() => Promise.resolve('111'))
      .mockImplementationOnce(() =>
        Promise.reject(new Error('Forced in testing'))
      )
      .mockImplementationOnce(() => Promise.resolve('333'))

    const expectedResult = [
      { id: 0, status: 2, clientId: '111' },
      { id: 1, status: 3 },
      { id: 2, status: 2, clientId: '333' }
    ]

    connectToSPDZ(spdzProxyUrlList, '/apiroot', 0)
      .then(values => {
        expect(values.length).toEqual(3)
        expect(values).toEqual(expectedResult)
        done()
      })
      .catch(err => {
        done.fail(err)
      })
  })
})

describe('Check the status of the proxies', () => {
  afterEach(() => {
    checkEngineConnection.mockClear()
    clientIdExists.mockClear()
    getClientId.mockClear()
  })

  it('No stateful client id.', done => {
    clientIdExists.mockImplementation(() => false)

    const expectedResult = [
      { id: 0, status: 3 },
      { id: 1, status: 3 },
      { id: 2, status: 3 }
    ]

    checkProxies(spdzProxyUrlList, '/apiroot')
      .then(values => {
        expect(values.length).toEqual(3)
        expect(values).toEqual(expectedResult)
        done()
      })
      .catch(err => {
        done.fail(err)
      })
  })

  it('All connections are connected, client id already stored.', done => {
    clientIdExists.mockImplementation(() => true)
    getClientId.mockImplementation(() => '123')
    checkEngineConnection.mockImplementation(() => Promise.resolve())

    const expectedResult = [
      { id: 0, status: 2 },
      { id: 1, status: 2 },
      { id: 2, status: 2 }
    ]

    checkProxies(spdzProxyUrlList, '/apiroot')
      .then(values => {
        expect(values.length).toEqual(3)
        expect(values).toEqual(expectedResult)
        done()
      })
      .catch(err => {
        done.fail(err)
      })
  })
})

describe('Client requesting data from multiple Spdz proxies', () => {
  afterEach(() => {
    consumeDataFromProxy.mockClear()
    clientIdExists.mockClear()
    getClientId.mockClear()
  })

  it('Rejects if no connection has been established, i.e. no client id stored', done => {
    clientIdExists.mockImplementation(() => false)

    consumeDataFromProxies(spdzProxyList, '/apiroot', false)
      .then(() => {
        done.fail()
      })
      .catch(err => {
        expect(err.message).toEqual(
          'Not connected to SPDZ for proxy http://spdzProxy.one:4000.'
        )
        expect(err.reason).toBeUndefined()
        done()
      })
  })

  it('Successfully receives the data from each proxy, unencrypted', done => {
    clientIdExists.mockImplementation(() => true)
    getClientId.mockImplementation(() => '123')

    const buffer0 = Uint8Array.of(1, 2, 3)
    const buffer1 = Uint8Array.of(4, 5, 6)
    const buffer2 = Uint8Array.of(7, 8, 9)

    consumeDataFromProxy
      .mockImplementationOnce(() => Promise.resolve(buffer0))
      .mockImplementationOnce(() => Promise.resolve(buffer1))
      .mockImplementationOnce(() => Promise.resolve(buffer2))

    const expectedResult = [buffer0, buffer1, buffer2]

    consumeDataFromProxies(spdzProxyList, '/apiroot', false)
      .then(values => {
        expect(values.length).toEqual(3)
        expect(values).toEqual(expectedResult)
        done()
      })
      .catch(err => {
        done.fail(err)
      })
  })

  it('Successfully receives the data from each proxy, encrypted', done => {
    clientIdExists.mockImplementation(() => true)
    getClientId.mockImplementation(() => '123')

    const encrypted = Uint8Array.of(56, 67, 773)
    const clearBuffer0 = Uint8Array.of(1, 2, 3)
    const clearBuffer1 = Uint8Array.of(4, 5, 6)
    const clearBuffer2 = Uint8Array.of(7, 8, 9)

    consumeDataFromProxy.mockImplementation(() => Promise.resolve(encrypted))

    decrypt
      .mockImplementationOnce(() => clearBuffer0)
      .mockImplementationOnce(() => clearBuffer1)
      .mockImplementationOnce(() => clearBuffer2)

    const expectedResult = [clearBuffer0, clearBuffer1, clearBuffer2]

    consumeDataFromProxies(spdzProxyList, '/apiroot', true)
      .then(values => {
        expect(values.length).toEqual(3)
        expect(values).toEqual(expectedResult)
        expect(decrypt).toHaveBeenCalledTimes(3)
        done()
      })
      .catch(err => {
        done.fail(err)
      })
  })

  it('Handles missing data from one of the proxies', done => {
    clientIdExists.mockImplementation(() => true)
    getClientId.mockImplementation(() => '123')

    const buffer0 = Uint8Array.of(1, 2, 3)
    const buffer2 = Uint8Array.of(7, 8, 9)

    consumeDataFromProxy
      .mockImplementationOnce(() => Promise.resolve(buffer0))
      .mockImplementationOnce(() =>
        Promise.reject(new Error('Forced in testing'))
      )
      .mockImplementationOnce(() => Promise.resolve(buffer2))

    consumeDataFromProxies(spdzProxyList, '/apiroot')
      .then(() => {
        done.fail()
      })
      .catch(err => {
        expect(err.message).toEqual('Forced in testing')
        expect(err.reason).toBeUndefined()
        done()
      })
  })
})

describe('Client sends inputs to multiple Spdz proxies', () => {
  afterEach(() => {
    sendDataToProxy.mockClear()
    clientIdExists.mockClear()
    getClientId.mockClear()
  })

  it('Rejects if not previously connected to spdz', done => {
    clientIdExists.mockImplementation(() => false)

    sendInputsToProxies(spdzProxyList, '/apiroot', [])
      .then(() => {
        done.fail()
      })
      .catch(err => {
        expect(err.message).toEqual(
          'Not connected to SPDZ for proxy http://spdzProxy.one:4000.'
        )
        expect(err.reason).toBeUndefined()
        done()
      })
  })

  it('Succesfully sends', done => {
    clientIdExists.mockImplementation(() => true)
    getClientId
      .mockImplementationOnce(() => '111')
      .mockImplementationOnce(() => '222')
      .mockImplementationOnce(() => '333')
    sendDataToProxy.mockImplementation(() => Promise.resolve())

    const inputList = [Gfp.fromUserInput('5'), Gfp.fromUserInput('6')]

    sendInputsToProxies(spdzProxyList, '/apiroot', inputList)
      .then(() => {
        expect(sendDataToProxy.mock.calls.length).toEqual(3)
        expect(sendDataToProxy.mock.calls[0]).toEqual([
          'http://spdzProxy.one:4000',
          '/apiroot',
          '111',
          '["cy0tESpGctdO0TOE6ST/9w==","cFOo3Bc5qM5D4z73x57/9Q=="]'
        ])
        expect(sendDataToProxy.mock.calls[1]).toEqual([
          'http://spdzProxy.two:4000',
          '/apiroot',
          '222',
          '["cy0tESpGctdO0TOE6ST/9w==","cFOo3Bc5qM5D4z73x57/9Q=="]'
        ])
        expect(sendDataToProxy.mock.calls[2]).toEqual([
          'http://spdzProxy.three:4000',
          '/apiroot',
          '333',
          '["cy0tESpGctdO0TOE6ST/9w==","cFOo3Bc5qM5D4z73x57/9Q=="]'
        ])
        done()
      })
      .catch(err => {
        done.fail(err)
      })
  })

  test('I can detect if all spdz proxies are connected', () => {
    expect(
      allProxiesConnected([
        { status: ProxyStatusCodes.Connected },
        { status: ProxyStatusCodes.Failure },
        { status: ProxyStatusCodes.Connected }
      ])
    ).toBeFalsy()

    expect(
      allProxiesConnected([
        { status: ProxyStatusCodes.Connected },
        { status: ProxyStatusCodes.Connected },
        { status: ProxyStatusCodes.Connected }
      ])
    ).toBeTruthy()
  })
})
