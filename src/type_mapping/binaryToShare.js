/**
 * Given a list of Uint8Array buffers, from each SPDZ proxy, holding 1 or more triples:
 *  Check buffers are a multiple of expected length
 *  Convert to Gfp triples.
 *  Add together and verify.
 *  Return list of first triple, Gfp still in montgomery format - used to apply to input.
 */
import { binaryToGfpArray } from './binaryToArray'

import { Gfp } from '../math/Gfp'

const TRIPLE_BYTES = 3 * Gfp.integerLengthBytes()

// Generate array containing 0, 1, .. length-1
const range = length => [...Array(length).keys()]

/**
 * Triple represents montgomery Gfps [A, B, C]. 
 */
class Triple {
  constructor(byteBuffer) {
    const gfpArray = binaryToGfpArray([byteBuffer])
    this.a = gfpArray[0]
    this.b = gfpArray[1]
    this.c = gfpArray[2]
  }
  static zero() {
    return new Triple(new Uint8Array(3 * Gfp.integerLengthBytes()))
  }
  checkRelation() {
    return this.a.multiply(this.b).equals(this.c)
  }
  add(triple) {
    this.a = this.a.add(triple.a)
    this.b = this.b.add(triple.b)
    this.c = this.c.add(triple.c)
    return this
  }
  toString() {
    return `a is ${this.a.toString()}, b is ${this.b.toString()}, c is ${this.c.toString()}`
  }
}

/**
 * Integers are supplied as 16 byte numbers so validate length of all spdz engine triples
 */
const checkBufferLength = clearValues => {
  const lengthMsgs = clearValues.map((clearValue, index) => {
    return clearValue.length > 0 && clearValue.length % TRIPLE_BYTES === 0
      ? ''
      : `Spdz proxy ${index} provided triple with ${clearValue.length} bytes, must be a multiple of ${TRIPLE_BYTES}.`
  })

  //TODO check each value is same length
  const sameLengths = !!clearValues.reduce((a, b) => {
    return a.length === b.length ? a : NaN
  })

  if (!sameLengths) {
    lengthMsgs.push(
      'Shares from each proxy are expected to be the same byte length.'
    )
  }

  return lengthMsgs.filter(message => message.length > 0).join('\n')
}

export default byteBufferList => {
  if (!(byteBufferList instanceof Array)) {
    throw new Error('binaryToShare requires an Array as input.')
  }

  byteBufferList.map(byteBuffer => {
    if (!(byteBuffer instanceof Uint8Array)) {
      throw new Error('binaryToShare requires an Array of Uint8Array buffers.')
    }
  })

  const errorMessage = checkBufferLength(byteBufferList)
  if (errorMessage.length > 0) {
    throw new Error(errorMessage)
  }

  const expectedNum = byteBufferList[0].length / TRIPLE_BYTES

  return range(expectedNum).map(i => {
    const combinedTriple = byteBufferList
      .map(
        byteBuffer =>
          new Triple(byteBuffer.slice(i * TRIPLE_BYTES, (i + 1) * TRIPLE_BYTES))
      )
      .reduce((sumTriple, triple) => sumTriple.add(triple), Triple.zero())

    if (!combinedTriple.checkRelation()) {
      throw new Error('Triple to be used for a share failed check.')
    }

    return combinedTriple.a
  })
}
