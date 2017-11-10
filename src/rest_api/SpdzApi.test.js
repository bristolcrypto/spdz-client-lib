/* global window, Headers */
import HttpStatus from 'http-status-codes'

import NoContentError from './NoContentError'
import {
  connectProxyToEngine,
  checkEngineConnection,
  disconnectProxyFromEngine,
  consumeDataFromProxy,
  sendDataToProxy
} from './SpdzApi'
import mockResponse from './test_support/MockResponse'

//Setup fetch for testing using mixture of node-fetch functions and mocks
// Note window is same as global in node
import nodeFetch from 'node-fetch'
window.fetch = jest.fn().mockImplementation(() => Promise.resolve())
window.Response = nodeFetch.Response
window.Headers = nodeFetch.Headers
window.Request = nodeFetch.Request

// Alternative is to run tests with whatwg-fetch, simulate browser environment
// Only difference is for reading binary responses, this test moved out.
// window.fetch = undefined
// import 'whatwg-fetch'

describe('Connect the Spdz Proxy to the Spdz Engine for a client', () => {
  afterEach(() => {
    window.fetch.mockClear()
  })

  it('Successfully runs the connect setup', done => {
    window.fetch = jest.fn().mockImplementation(() => {
      const headers = new Headers({
        Location: 'http://spdzProxy/spdzfoo/123/spdz-connection'
      })
      return Promise.resolve(mockResponse(HttpStatus.CREATED, null, headers))
    })

    connectProxyToEngine('http://spdzProxy', '/spdzfoo', '123', '01020304')
      .then(clientId => {
        expect(clientId).toEqual('123')
        expect(
          window.fetch
        ).toBeCalledWith('http://spdzProxy/spdzfoo/connect-to-spdz', {
          body: '{"clientId":"123","clientPublicKey":"01020304"}',
          headers: { 'content-type': 'application/json; charset=utf-8' },
          method: 'POST',
          mode: 'cors'
        })
        done()
      })
      .catch(err => {
        done.fail(err)
      })
  })

  it('Throws an error if connect setup did not work', done => {
    window.fetch = jest.fn().mockImplementation(() => {
      const headers = new Headers({ 'Content-type': 'application/json' })
      return Promise.resolve(
        mockResponse(
          HttpStatus.SERVICE_UNAVAILABLE,
          '{ "status": "503", "message": "test error" }',
          headers
        )
      )
    })

    connectProxyToEngine('http://spdzProxy', '/spdzApi', 23)
      .then(() => {
        done.fail()
      })
      .catch(err => {
        expect(err.message).toEqual(
          'Unable to make SPDZ proxy engine connection. Status: 503. Reason: test error'
        )
        expect(err.reason).toEqual({ status: '503', message: 'test error' })
        done()
      })
  })

  it('Throws an error if the client id cannot be extracted from the location header', done => {
    window.fetch = jest.fn().mockImplementation(() => {
      const headers = new Headers({
        Location: '/spdz-connection'
      })
      return Promise.resolve(mockResponse(HttpStatus.CREATED, null, headers))
    })

    connectProxyToEngine('http://spdzProxy', '/spdzfoo')
      .then(() => {
        done.fail()
      })
      .catch(err => {
        expect(err.message).toEqual(
          'Unable to make SPDZ proxy engine connection. Status: 201. Reason: Unable to extract clientId from location header /spdz-connection.'
        )
        expect(err.reason).toEqual({})
        done()
      })
  })

  it('Will check the status of the connection (success)', done => {
    window.fetch = jest.fn().mockImplementation(() => {
      const headers = new Headers()
      return Promise.resolve(mockResponse(HttpStatus.OK, null, headers))
    })

    checkEngineConnection()
      .then(() => {
        done()
      })
      .catch(err => {
        done.fail(err)
      })
  })

  it('Will check the status of the connection (failure)', done => {
    window.fetch = jest.fn().mockImplementation(() => {
      const headers = new Headers({ 'Content-type': 'application/json' })
      return Promise.resolve(
        mockResponse(
          HttpStatus.NOT_FOUND,
          '{ "status": "404", "message": "test error" }',
          headers
        )
      )
    })

    checkEngineConnection()
      .then(() => {
        done.fail('Expected err to be raised.')
      })
      .catch(err => {
        expect(err.message).toEqual(
          'SPDZ proxy not connected to SPDZ engine. Status: 404. Reason: test error'
        )
        expect(err.reason).toEqual({ status: '404', message: 'test error' })
        done()
      })
  })

  it('Will disconnect from the SPDZ engine', done => {
    window.fetch = jest.fn().mockImplementation(() => {
      const headers = new Headers()
      return Promise.resolve(mockResponse(HttpStatus.OK, null, headers))
    })

    disconnectProxyFromEngine()
      .then(() => {
        done()
      })
      .catch(err => {
        done.fail(err)
      })
  })
})

describe('Consume a binary value from the Spdz Proxy', () => {
  afterEach(() => {
    window.fetch.mockClear()
  })

  it('Successfully retrieves some binary data, using node style fetch', done => {
    const expectedBuffer = Uint8Array.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
    //const responseBody = new Blob([expectedBuffer.buffer])
    const responseBody = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])

    window.fetch = jest.fn().mockImplementation(() => {
      const headers = new Headers({
        'Content-type': 'application/octet-stream'
      })
      return Promise.resolve(mockResponse(HttpStatus.OK, responseBody, headers))
    })

    consumeDataFromProxy()
      .then(buffer => {
        expect(buffer).toEqual(expectedBuffer)
        done()
      })
      .catch(err => {
        done.fail(err)
      })
  })

  it('Throws a no content error if no data to retrieve', done => {
    window.fetch = jest.fn().mockImplementation(() => {
      const headers = new Headers()
      return Promise.resolve(mockResponse(HttpStatus.NO_CONTENT, null, headers))
    })

    consumeDataFromProxy()
      .then(() => {
        done.fail()
      })
      .catch(err => {
        expect(err).toBeInstanceOf(NoContentError)
        expect(err.message).toEqual(
          'No data is available to consume from the SPDZ proxy. Status: 204.'
        )
        expect(err.reason).toBeUndefined()
        done()
      })
  })

  it('Throws a general error with bad http response', done => {
    window.fetch = jest.fn().mockImplementation(() => {
      const headers = new Headers({ 'Content-type': 'application/json' })
      return Promise.resolve(
        mockResponse(
          HttpStatus.SERVICE_UNAVAILABLE,
          '{ "status": "503", "message": "test error" }',
          headers
        )
      )
    })

    consumeDataFromProxy()
      .then(() => {
        done.fail()
      })
      .catch(err => {
        try {
          expect(err).toBeInstanceOf(Error)
          expect(err.message).toEqual(
            'Unable to consume data from SPDZ proxy. Status: 503. Reason: test error'
          )
          expect(err.reason).toEqual({ status: '503', message: 'test error' })
          done()
        } catch (ex) {
          done.fail(ex)
        }
      })
  })
})

describe('Sends array of base64 encoded integers to the Spdz Proxy', () => {
  afterEach(() => {
    window.fetch.mockClear()
  })

  it('Successfully sends data', done => {
    const examplePayloadData = [
      'J72LqIgKBjKu5zFKt1vo4g==',
      'J72LqIgKBjKu5zFKt1vo4g=='
    ]

    window.fetch = jest.fn().mockImplementation(() => {
      return Promise.resolve(mockResponse(HttpStatus.OK))
    })

    sendDataToProxy('http://somehost', 'apiroot', '123', examplePayloadData)
      .then(() => {
        done()
      })
      .catch(err => {
        done.fail(err)
      })
  })

  it('Manages non OK status code', done => {
    window.fetch = jest.fn().mockImplementation(() => {
      const headers = new Headers({ 'Content-type': 'application/json' })
      const responseBody =
        '{"status": "400", "message": "force error for testing"}'
      return Promise.resolve(
        mockResponse(HttpStatus.BAD_REQUEST, responseBody, headers)
      )
    })

    sendDataToProxy('http://somehost', 'apiroot', '123', 'wrong format data')
      .then(() => {
        done.fail()
      })
      .catch(err => {
        expect(err.message).toEqual(
          'Unable to send data to SPDZ proxy. Status: 400. Reason: force error for testing'
        )
        expect(err.reason).toEqual({
          message: 'force error for testing',
          status: '400'
        })
        done()
      })
  })
})
