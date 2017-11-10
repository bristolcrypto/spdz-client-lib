import { Gfp } from '../math/Gfp'
import {
  retrieveShares,
  sendInputsWithShares,
  retrieveRegIntsAsHexString
} from './SpdzApiHelper'
import { twoProxiesWith2Connected } from './test_support/ProxyServerList'

jest.mock('./SpdzApiAggregate')
import { consumeDataFromProxies, sendInputsToProxies } from './SpdzApiAggregate'

jest.mock('../type_mapping/binaryToArray')
import { regIntToHexString } from '../type_mapping/binaryToArray'

jest.mock('../type_mapping/binaryToShare')
import binaryToShare from '../type_mapping/binaryToShare'

describe('Client sending an input to 2 proxies', () => {
  afterEach(() => {
    consumeDataFromProxies.mockClear()
    sendInputsToProxies.mockClear()
    regIntToHexString.mockClear()
    binaryToShare.mockClear()
  })

  // Construct some byte arrays which represent a valid triple
  // prettier-ignore
  const a1 = Uint8Array.of(5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0)
  // prettier-ignore
  const b1 = Uint8Array.of(6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0)
  // prettier-ignore
  const c1 = Uint8Array.of(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0)
  const byteBuffer1 = new Uint8Array(48)
  byteBuffer1.set(a1, 0)
  byteBuffer1.set(b1, 16)
  byteBuffer1.set(c1, 32)

  // prettier-ignore
  const a2 = Uint8Array.of(3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0)
  // prettier-ignore
  const b2 = Uint8Array.of(4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0)
  // prettier-ignore
  const c2 = Uint8Array.of(0xca,0x5b,0x0a,0xd4,0x8c,0x16,0x37,0x01,0xfc,0xb2,0xc9,0xc6,0xf5,0x86,0x27,0x18)
  const byteBuffer2 = new Uint8Array(48)
  byteBuffer2.set(a2, 0)
  byteBuffer2.set(b2, 16)
  byteBuffer2.set(c2, 32)

  it('Returns a valid share from 2 SPDZ proxies', done => {
    consumeDataFromProxies.mockImplementationOnce(() =>
      Promise.resolve([byteBuffer1, byteBuffer2])
    )

    const expectedShare = Gfp.fromUserInput('8')
    binaryToShare.mockImplementationOnce(() => [expectedShare])

    retrieveShares(1, false, twoProxiesWith2Connected, '/apiroot', 0)
      .then(shareList => {
        expect(shareList.length).toEqual(1)
        expect(shareList[0]).toEqual(expectedShare)
        done()
      })
      .catch(err => {
        done.fail(err)
      })
  })

  it('Rejects if number of shares doesnt match expected', done => {
    consumeDataFromProxies.mockImplementationOnce(() =>
      Promise.resolve([byteBuffer1, byteBuffer2])
    )

    const expectedShare = Gfp.fromUserInput('8')
    binaryToShare.mockImplementationOnce(() => [expectedShare])

    retrieveShares(2, false, twoProxiesWith2Connected, '/apiroot', 0)
      .then(() => {
        done.fail(new Error('expecting call to fail'))
      })
      .catch(err => {
        expect(err.message).toEqual('Expected 2 shares but got 1.')
        done()
      })
  })

  it('Sends an input combined with the valid share to 2 SPDZ proxies', done => {
    consumeDataFromProxies.mockImplementationOnce(() =>
      Promise.resolve([byteBuffer1, byteBuffer2])
    )

    const expectedShare = Gfp.fromUserInput('8')
    binaryToShare.mockImplementationOnce(() => [expectedShare])

    const input = 4444
    const inputGfp = Gfp.fromUserInput(input)
    const inputToSend = inputGfp.add(expectedShare)

    sendInputsWithShares(
      [input],
      false,
      twoProxiesWith2Connected,
      '/apiroot',
      0
    )
      .then(() => {
        expect(sendInputsToProxies.mock.calls.length).toEqual(1)
        expect(sendInputsToProxies.mock.calls[0]).toEqual([
          twoProxiesWith2Connected,
          '/apiroot',
          [inputToSend]
        ])
        done()
      })
      .catch(err => {
        done.fail(err)
      })
  })

  it('Returns the winner client id as a hex string of 8 regints from 2 SPDZ proxies', done => {
    // prettier-ignore
    const clientId1 = Uint8Array.of(1,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,5,0,0,0,6,0,0,0,7,0,0,0,8,0,0,0)
    // prettier-ignore
    const clientId2 = Uint8Array.of(1,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,5,0,0,0,6,0,0,0,7,0,0,0,8,0,0,0)
    consumeDataFromProxies.mockImplementationOnce(() =>
      Promise.resolve([clientId1, clientId2])
    )

    const winningId =
      '0000000100000002000000030000000400000005000000060000000700000008'
    regIntToHexString.mockImplementationOnce(() => winningId)

    retrieveRegIntsAsHexString(twoProxiesWith2Connected, '/apiroot', 8)
      .then(result => {
        expect(result).toEqual(winningId)
        done()
      })
      .catch(err => {
        done.fail(err)
      })
  })

  it('Rejects if the number of return values does not match the number of proxies', done => {
    // prettier-ignore
    const clientId1 = Uint8Array.of(1,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,5,0,0,0,6,0,0,0,7,0,0,0,8,0,0,0)
    consumeDataFromProxies.mockImplementationOnce(() =>
      Promise.resolve([clientId1])
    )

    retrieveRegIntsAsHexString(twoProxiesWith2Connected, '/apiroot', 'a1a2a3a4')
      .then(() => {
        done.fail('Expecting test to throw.')
      })
      .catch(err => {
        expect(err.message).toEqual(
          'Expecting 2 results, 1 from each SPDZ engine, got 1.'
        )
        done()
      })
  })

  it('Rejects if the retrieveRegIntsAsHexString function throws', done => {
    // prettier-ignore
    const clientId1 = Uint8Array.of(1,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,5,0,0,0,6,0,0,0,7,0,0,0,8,0,0,0)
    // prettier-ignore
    const clientId2 = Uint8Array.of(1,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,5,0,0,0,6,0,0,0,7,0,0,0,8,0,0,0)
    consumeDataFromProxies.mockImplementationOnce(() =>
      Promise.resolve([clientId1, clientId2])
    )

    regIntToHexString.mockImplementationOnce(() => {
      throw new Error('Fake error for extractClientId.')
    })

    retrieveRegIntsAsHexString(twoProxiesWith2Connected, '/apiroot', 'a1a2a3a4')
      .then(() => {
        done.fail('Expecting test to throw.')
      })
      .catch(err => {
        expect(err.message).toEqual('Fake error for extractClientId.')
        done()
      })
  })
})
