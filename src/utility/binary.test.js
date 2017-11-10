import BigInt from 'big-integer'

import { base64Encode } from './binary'

describe('Map between types when using binary data', () => {
  it('converts a big int value into a base64 encoded string', () => {
    const val = BigInt('452367')

    expect(base64Encode(val.toString(16))).toEqual('BucP')
  })

  it('throws an error if the wrong type is passed in', () => {
    const val = BigInt('452367')

    const testThrowsBase64Encode = () => base64Encode(val)

    expect(testThrowsBase64Encode).toThrowError(
      'base64Encode expects a hex string.'
    )
  })
})
