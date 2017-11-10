import {
  shiftedIntegerToJSFixed,
  roundFixed,
  jsNumberToShiftedInteger
} from './numericConversions'
import { Gfp, initFixedPointParams } from './Gfp'

// Override default fixed point params
initFixedPointParams(10, 41)

const f = Gfp.fixedPointDecBitLength()
const k = Gfp.fixedPointWholeBitLength()

describe('Convert SPDZ fixed point integer to JS Number', () => {
  it('converts a shifted integer as expected', () => {
    const input = 100 << f
    const result = shiftedIntegerToJSFixed(input, f)
    expect(result).toEqual(100)
  })
  it('converts a shifted fixed point number as expected', () => {
    const input = 505513
    const result = shiftedIntegerToJSFixed(input, f)
    expect(roundFixed(result, f)).toEqual('493.665')
  })
  it('converts a negative shifted fixed point number as expected', () => {
    const input = -505513
    const result = shiftedIntegerToJSFixed(input, f)
    expect(roundFixed(result, f)).toEqual('-493.665')
  })
  it('handles zero', () => {
    const input = 0
    const result = shiftedIntegerToJSFixed(input, f)
    expect(result).toEqual(0)
  })
  it('handles max large 32 bit number with decimal part ', () => {
    const input = 2199023255551
    const result = shiftedIntegerToJSFixed(input, f)
    expect(roundFixed(result, f)).toEqual('2147483647.999')
  })
})

describe('Convert real number to SPDZ fixed point integer representation', () => {
  it('converts an integer as expected', () => {
    expect(jsNumberToShiftedInteger(100, f, k)).toEqual(102400)
  })
  it('converts a real number as expected', () => {
    expect(jsNumberToShiftedInteger(493.665, f, k)).toEqual(505513)
  })
  it('converts 0 as expected', () => {
    expect(jsNumberToShiftedInteger(0, f, k)).toEqual(0)
  })
  it('converts a negative number as expected', () => {
    expect(jsNumberToShiftedInteger(-493.665, f, k)).toEqual(-505513)
  })
  it('converts negative integer to SPDZ fixed point and back', () => {
    const spdzFp = jsNumberToShiftedInteger(-1, f, k)
    expect(spdzFp).toEqual(-1024)
    expect(shiftedIntegerToJSFixed(spdzFp, f)).toEqual(-1)
  })
  it('throws an error if max 32 bit integer exceeded', () => {
    const testThrows = () => {
      jsNumberToShiftedInteger(2 ** 31, f, k)
    }
    expect(testThrows).toThrowError(
      'Converting real number to fixed point, integer part exceeded 31 bits.'
    )
  })
})
