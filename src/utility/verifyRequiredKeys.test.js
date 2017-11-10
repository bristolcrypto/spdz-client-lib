import verifyRequiredKeys from './verifyRequiredKeys'

describe('Verifies shape of objects', () => {
  it('Successfully verifies keys in the list of objects', () => {
    const inList = [
      { key1: 'content1', key2: 'content2', key3: 'content3' },
      { key1: 'zcontent1', key2: 'zcontent2' }
    ]
    const result = verifyRequiredKeys(inList, 'key1', 'key2')
    expect(result).toBeTruthy()
  })

  it('Fails if array not passed', () => {
    const inList = { 1: 'nope' }
    const result = verifyRequiredKeys(inList, 'key1', 'key2')
    expect(result).toBeFalsy()
  })

  it('Fails if missing key', () => {
    const inList = [
      { key1: 'content1', key3: 'content3' },
      { key1: 'zcontent1', key2: 'zcontent2' }
    ]
    const result = verifyRequiredKeys(inList, 'key1', 'key2')
    expect(result).toBeFalsy()
  })

  it('Fails if no array members', () => {
    const inList = []
    const result = verifyRequiredKeys(inList, 'key1', 'key2')
    expect(result).toBeFalsy()
  })
})
