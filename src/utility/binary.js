/**
 * General purpose binary functions.
 */

// Care on this import as it must override builtin Node Buffer global for testing.
import { Buffer } from 'buffer/'

const padHex = hex => (hex.length % 2 !== 0 ? '0' + hex : hex)

/**
 * Convert binary to padded hex string (i.e. always multiple of 2)
 * @param {binaryArray} Uint8Array or equivalent such as node Buffer.
 * @returns Padded hex string.
 */
const binaryToHex = binaryArray => {
  return binaryArray.reduce((hexString, i) => {
    return hexString + padHex(i.toString(16))
  }, '')
}

/**
 * Convert a string of hex  into a base64 encoded string, representing a big endian integer.
 * @param {string} hexString e.g. '6e70f'
 */
const base64Encode = hexString => {
  if (!(typeof hexString === 'string')) {
    throw new Error('base64Encode expects a hex string.')
  }
  let hexValue = padHex(hexString)
  const buf = Buffer.from(hexValue, 'hex')
  return buf.toString('base64')
}

export { binaryToHex, base64Encode }
