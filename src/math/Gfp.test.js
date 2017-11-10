import BigInt from 'big-integer'
import { Gfp, initFixedPointParams, fromMontgomery } from './Gfp'
import { roundFixed, jsNumberToShiftedInteger } from './numericConversions'

// Override default fixed point params
initFixedPointParams(10, 41)

describe('Map user input integers into Gfp finite field', () => {
  it('converts positive number to Gfp', () => {
    const gfp = Gfp.fromUserInput('1234')
    expect(gfp.toString()).toEqual('1234')
    expect(fromMontgomery(gfp.getValue()).toString()).toEqual('1234')

    expect(gfp.toNativeString()).toEqual(
      '142756747521148069727608861851958900344 Montgomery'
    )
    expect(gfp.toNativeHexString()).toEqual('6b65f311370d2ce7e9fe8f6c3d67f678')
  })

  it('converts 0 to Gfp', () => {
    const gfp = Gfp.fromUserInput('0')
    expect(gfp.toString()).toEqual('0')
    expect(gfp.toNativeString()).toEqual('0 Montgomery')
    expect(gfp.toNativeHexString()).toEqual('0')
  })

  it('converts negative number to Gfp', () => {
    const gfp = Gfp.fromUserInput('-60')
    expect(gfp.toString()).toEqual('-60')
    expect(fromMontgomery(gfp.getValue()).toString()).toEqual(
      '172035116406933162231178957667602464709'
    )
    expect(gfp.toNativeString()).toEqual(
      '55236837168738497707819516538600620151 Montgomery'
    )
    expect(gfp.toNativeHexString()).toEqual('298e3a55ed78f51a0a4e56cd4aa50077')
  })

  it('converts max positive number to Gfp', () => {
    const gfp = Gfp.fromUserInput('86017558203466581115589478833801232383')
    expect(gfp.toString()).toEqual('86017558203466581115589478833801232383')
  })

  it('converts min positive number to Gfp', () => {
    const gfp = Gfp.fromUserInput('-86017558203466581115589478833801232385')
    expect(gfp.toString()).toEqual('-86017558203466581115589478833801232385')
  })

  it('throws if number to small/large for field', () => {
    const testThrowsTooBig = () =>
      Gfp.fromUserInput('86017558203466581115589478833801232384')

    const testThrowsTooSmall = () =>
      Gfp.fromUserInput('-86017558203466581115589478833801232386')

    expect(testThrowsTooBig).toThrowError(
      'Got an integer 86017558203466581115589478833801232384 which exceeds the field size -prime/2 to prime/2.'
    )

    expect(testThrowsTooSmall).toThrowError(
      'Got an integer -86017558203466581115589478833801232386 which exceeds the field size -prime/2 to prime/2.'
    )
  })
})

describe('Wrap SPDZ output in Gfp type', () => {
  it('reads SPDZ output of 1234 in montgomery format into Gfp', () => {
    const nativeGfp = Gfp.fromSpdz('6b65f311370d2ce7e9fe8f6c3d67f678')

    expect(nativeGfp.toNativeString()).toEqual(
      '142756747521148069727608861851958900344 Montgomery'
    )
    expect(nativeGfp.toString()).toEqual('1234')
    expect(nativeGfp.toJSInteger()).toEqual(1234)
  })

  it('reads SPDZ output of -464646 in montgomery format into Gfp', () => {
    const nativeGfp = Gfp.fromSpdz('4958d2da7e2a1605f1f3141f02d00616')

    expect(nativeGfp.toNativeString()).toEqual(
      '97494842432652108637347160684095342102 Montgomery'
    )
    expect(nativeGfp.toString()).toEqual('-464646')
    expect(nativeGfp.toJSInteger()).toEqual(-464646)
  })

  it('throws if number too big/small to JS number', () => {
    const testThrowsTooBig = () =>
      Gfp.fromUserInput('9007199254740992').toJSInteger()

    const testThrowsTooSmall = () =>
      Gfp.fromUserInput('-9007199254740992').toJSInteger()

    expect(testThrowsTooBig).toThrowError(
      'Overflow converting Gfp 9007199254740992 to JS Integer.'
    )
    expect(testThrowsTooSmall).toThrowError(
      'Overflow converting Gfp -9007199254740992 to JS Integer.'
    )
  })
})

describe('Manages fixed point numbers from user input and from SPDZ output', () => {
  it('converts to JS real from SPDZ representation of fixed point ', () => {
    const userInputAfterShift = jsNumberToShiftedInteger(
      493.665,
      Gfp.fixedPointDecBitLength(),
      Gfp.fixedPointWholeBitLength()
    )
    expect(userInputAfterShift).toEqual(505513)

    const gfp = Gfp.fromUserInput(userInputAfterShift)

    expect(
      roundFixed(gfp.toJSFixedPoint(), Gfp.fixedPointDecBitLength())
    ).toEqual('493.665')
  })

  it('converts GFP fixed point negative number into JS Integer', () => {
    const gfp = Gfp.fromSpdz('46b82604619b75c83f98b275a73e07ea')
    expect(gfp.toNativeString()).toEqual(
      '94002113405600093872970224431945091050 Montgomery'
    )

    expect(fromMontgomery(gfp.getValue()).toString()).toEqual(
      '172035116406933162231178957667602463745'
    )

    expect(gfp.toString()).toEqual('-1024')

    expect(gfp.toJSFixedPoint()).toEqual(-1)
  })
})

describe('Handles simple algebra', () => {
  it('adds 2 numbers', () => {
    const a = Gfp.fromUserInput('12')
    const b = Gfp.fromUserInput('16')
    const c = Gfp.fromUserInput('28')

    expect(a.add(b)).toEqual(c)
  })

  it('adds large numbers', () => {
    const a = Gfp.fromUserInput('86017558203466581115589478833801232383')
    const b = Gfp.fromUserInput('10')
    const c = Gfp.fromUserInput('7')

    expect(a.add(a).add(b)).toEqual(c)
  })

  it('multiplies 2 numbers', () => {
    const a = Gfp.fromUserInput('12')
    const b = Gfp.fromUserInput('16')
    const c = Gfp.fromUserInput('192')

    expect(a.multiply(b)).toEqual(c)
  })

  it('multiplies signed numbers', () => {
    const a = Gfp.fromUserInput('50')
    const b = Gfp.fromUserInput('-1000')
    const c = Gfp.fromUserInput('-50000')

    expect(a.multiply(b)).toEqual(c)
  })

  it('checks for equality correctly', () => {
    expect(
      Gfp.fromUserInput('12345').equals(Gfp.fromUserInput('12345'))
    ).toBeTruthy()
    expect(Gfp.fromUserInput('44').equals(Gfp.fromUserInput('45'))).toBeFalsy()
    expect(new Gfp(BigInt('99'), false).equals('why am I here')).toBeFalsy()
  })
})
