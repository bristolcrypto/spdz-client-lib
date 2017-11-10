import listComparison from './listComparison'

describe('List comparison to determine if list is valid', () => {
  it('returns true if all elements pass the test', () => {
    const result = listComparison([1, 1, 1], (a, b) => a === b)
    expect(result).toBeTruthy()
  })
  it('returns false if not all elements pass the test', () => {
    const result = listComparison([1, 'a', 1], (a, b) => a === b)
    expect(result).toBeFalsy()
  })
  it('returns true if an empty list', () => {
    const result = listComparison([], (a, b) => a === b)
    expect(result).toBeTruthy()
  })
  it('returns true if a single value list', () => {
    const result = listComparison([1], (a, b) => a === b)
    expect(result).toBeTruthy()
  })
  it('checks if all numeric types are consistent', () => {
    const result1 = listComparison(
      [1.2, 2.3, 1.3],
      (a, b) => Number.isInteger(a) === Number.isInteger(b)
    )
    expect(result1).toBeTruthy()

    const result2 = listComparison(
      [1.2, 3, 3],
      (a, b) => Number.isInteger(a) === Number.isInteger(b)
    )
    expect(result2).toBeFalsy()
  })
  it('supports the last element begin 0', () => {
    // prettier-ignore
    const input = [1,1690861316,2,-4,0]

    const validNumbers = listComparison(
      input,
      (a, b) => typeof a === 'number' && typeof b === 'number'
    )

    expect(validNumbers).toBeTruthy()
  })
})
