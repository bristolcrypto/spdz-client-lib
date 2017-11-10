import HttpStatus from 'http-status-codes'

import { consumeDataFromProxy } from './SpdzApi'
import mockResponse from './test_support/MockResponse'

//Setup fetch for testing using mixture of node-fetch functions and mocks
// Note window is same as global in node
import nodeFetch from 'node-fetch'
window.fetch = jest.fn().mockImplementation(() => Promise.resolve())
window.Response = nodeFetch.Response
window.Headers = nodeFetch.Headers
window.Request = nodeFetch.Request

describe('Consume a binary value from the Spdz Proxy, using node style response', () => {
  afterEach(() => {
    window.fetch.mockClear()
  })

  it('Successfully retrieves some binary data', done => {
    const expectedBuffer = Uint8Array.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
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
})
