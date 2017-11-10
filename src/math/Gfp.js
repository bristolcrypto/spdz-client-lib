/**
 * Represent a big integer in a finite field (mod P) in montgomery format.
 */
import BigInt from 'big-integer'
import { shiftedIntegerToJSFixed } from './numericConversions'

/**
 * Hard code prime for gfp, montgomery conversion primatives.
 * Assumption that spdz is using a 128 bit prime field.
 */
const INTEGER_LENGTH_BYTES = 16
const GFP_PRIME = BigInt('172035116406933162231178957667602464769')
const GFP_NEGATIVE_BOUNDARY = GFP_PRIME.divide(2)
const MIN_NEGATIVE = GFP_NEGATIVE_BOUNDARY.minus(GFP_PRIME)
const R = BigInt(2).pow(INTEGER_LENGTH_BYTES * 8)
const R_INVERSE = R.modInv(GFP_PRIME)
/**
 * Fixed point parameters. The SPDZ VM handles these as sint/cints in gfp which have been bit shifted.
 * The client must bit shift before sending/after receiving. Params are:
 *   f - the bitlength of the decimal part
 *   k - the whole bitlength of fixed point
 * These must match MPC program params:
 *   sfix.set_precision(f, k)
 *   cfix.set_precision(f, k)
 */
let fix_decimal_bitlength = 20
let fix_whole_bitlength = 40

/**
 * @description Setup the fixed point parameters to match the SPDZ MPC parameters, equivalent to instruction (cfix | sfix).set_precision(f, k).
 * Defaults are (f,k) of (20,40).
 * 
 * @param {Number} f integer to override default fixed point decimal bit length
 * @param {Number} k integer to override default fixed point whole bit length 
 * 
 * @access public
 */
const initFixedPointParams = (f, k) => {
  fix_decimal_bitlength = f
  fix_whole_bitlength = k
}

/**
 * Convert bigint to a montgomery representation
 */
const toMontgomery = value => value.multiply(R).mod(GFP_PRIME)

/**
 * Convert bigint from a montgomery representation
 */
const fromMontgomery = value => value.multiply(R_INVERSE).mod(GFP_PRIME)

/**
 * Remap Gfp field ( 0->Prime) to (min_negative->gfp_negative_boundary-1)
 */
const fromGfpMapping = bigIntGfp => {
  return bigIntGfp.greaterOrEquals(GFP_NEGATIVE_BOUNDARY)
    ? bigIntGfp.minus(GFP_PRIME)
    : bigIntGfp
}

/**
 * Act as a translation between the Gfp type in SPDZ and integer numbers for user I/O.
 */
class Gfp {
  /**
   * Wrap BigInt as Gfp to mimic SPDZ implementation (negative mapping and montgomery representation).
   * 
   * Look at methods which are more explicit:
   *    Gfp.fromUserInput - convert user supplied integer into Gfp type.
   *    Gfp.fromSpdz - wrap integer already in Gfp field in Gfp type.
   *    toJSInteger - convert Gfp type into integer.
   * 
   * @param {BigInt} value BigInteger value, 
   * @param {boolean} isMapped is value already represented in Gfp field.
   *
   */
  constructor(value, isMapped) {
    if (!(value instanceof BigInt)) {
      throw new Error('Gfp type must wrap a BigInt type.')
    }

    if (isMapped) {
      if (value.lt(0) || value.gt(GFP_PRIME)) {
        throw new Error(
          `Got a Gfp integer ${value.toString()} which exceeds the field size 0 to prime.`
        )
      }
      this.val = value
    } else {
      if (value.lt(MIN_NEGATIVE) || value.geq(GFP_NEGATIVE_BOUNDARY)) {
        throw new Error(
          `Got an integer ${value.toString()} which exceeds the field size -prime/2 to prime/2.`
        )
      }
      this.val = toMontgomery(value.lt(0) ? value.add(GFP_PRIME) : value)
    }
  }

  /**
   * Create Gfp from integer held in string supplied by user.
   * Integer will be mapped into Gfp field and converted into Montogomery format.
   */
  static fromUserInput(integerString) {
    const inputStr =
      typeof integerString !== 'string'
        ? integerString.toString()
        : integerString
    return new Gfp(BigInt(inputStr), false)
  }

  /**
   * Create Gfp from SPDZ supplied gfp, in hex string format.
   */
  static fromSpdz(hexString) {
    return new Gfp(BigInt(hexString, 16), true)
  }

  add(other) {
    if (!(other instanceof Gfp)) {
      throw new Error('Add requires a Gfp type.')
    }
    return new Gfp(this.val.add(other.val).mod(GFP_PRIME), true)
  }

  multiply(other) {
    if (!(other instanceof Gfp)) {
      throw new Error('Mult requires a Gfp type.')
    }
    return new Gfp(
      this.val
        .multiply(other.val)
        .multiply(R_INVERSE)
        .mod(GFP_PRIME),
      true
    )
  }

  getValue() {
    return this.val
  }

  /** String representation of integer in prime field. */
  toNativeString() {
    return this.val.toString() + ' Montgomery'
  }

  /** Hex string representation of integer in prime field. */
  toNativeHexString() {
    return this.val.toString(16)
  }

  /** String representation of integer in integers. */
  toString() {
    return fromGfpMapping(fromMontgomery(this.val)).toString()
  }

  /** Javascript Number representation of GFP integer. */
  toJSInteger() {
    const bigintVal = fromGfpMapping(fromMontgomery(this.val))

    if (
      bigintVal.geq(Number.MIN_SAFE_INTEGER) &&
      bigintVal.leq(Number.MAX_SAFE_INTEGER)
    ) {
      return bigintVal.toJSNumber()
    } else {
      throw new Error(
        `Overflow converting Gfp ${bigintVal.toString()} to JS Integer.`
      )
    }
  }

  /** Javascript Number as fixed point from GFP integer representing fixed point. */
  toJSFixedPoint() {
    return shiftedIntegerToJSFixed(
      this.toJSInteger(),
      fix_decimal_bitlength,
      fix_whole_bitlength
    )
  }

  equals(other) {
    if (!(other instanceof Gfp)) {
      return false
    }
    return this.val.equals(other.val)
  }

  static integerLengthBytes() {
    return INTEGER_LENGTH_BYTES
  }

  static fixedPointDecBitLength() {
    return fix_decimal_bitlength
  }

  static fixedPointWholeBitLength() {
    return fix_whole_bitlength
  }
}

export { Gfp, initFixedPointParams, toMontgomery, fromMontgomery }
