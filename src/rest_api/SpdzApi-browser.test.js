import HttpStatus from 'http-status-codes'

import { consumeDataFromProxy } from './SpdzApi'
import mockResponse from './test_support/MockResponse'

// Alternative is to run tests with whatwg-fetch, simulate browser environment
// Only difference is for reading binary responses, this test moved out.
window.fetch = undefined
import 'whatwg-fetch'

describe('Consume a binary value from the Spdz Proxy, using browser style response', () => {
  afterEach(() => {
    window.fetch.mockClear()
  })

  it('Successfully retrieves some binary data', done => {
    const expectedBuffer = Uint8Array.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
    const responseBody = new Blob([expectedBuffer.buffer])

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
