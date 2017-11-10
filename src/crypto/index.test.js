import sodium from 'libsodium-wrappers'
import {
  createClientPublicKey,
  createEncryptionKey,
  createDHKeyPair,
  setDHKeyPair,
  encrypt,
  decrypt
} from './'

describe('Check that crypto functions behaving as expected', () => {
  it('Generates a client public key on first use', () => {
    const publicKey = createClientPublicKey()
    const publicKeyAgain = createClientPublicKey()

    expect(publicKey.length).toEqual(64)
    expect(publicKey).toEqual(publicKeyAgain)
  })

  it('Will not generate encryption keys if the server key is the wrong format', () => {
    const functionWithThrow = () => createEncryptionKey('not a public key')
    expect(functionWithThrow).toThrowError(
      'Server public key must be a string of 64 hex characters, given <not a public key>'
    )
  })

  it('Will generate an encryption key', () => {
    const encryptionKey = createEncryptionKey(
      'a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8'
    )
    expect(encryptionKey.length).toEqual(32)
  })

  it('Will encrypt and decrypt binary data', () => {
    const encryptionKey1 = createEncryptionKey(
      'a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8'
    )
    const encryptionKey2 = createEncryptionKey(
      'a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b9'
    )

    const clearText = Uint8Array.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 0)
    const cipherText = encrypt(encryptionKey1, clearText)
    expect(cipherText.length).toEqual(
      sodium.crypto_secretbox_MACBYTES +
        clearText.length +
        sodium.crypto_secretbox_NONCEBYTES
    )

    const clearTextRecovered = decrypt(encryptionKey1, cipherText)
    expect(clearTextRecovered).toEqual(clearText)

    //Try again with a hex input string
    const clearTextAsHex = 'a1b2c3d4e5f6'
    const cipherTextAsHex = sodium.to_hex(
      encrypt(encryptionKey2, clearTextAsHex)
    )
    expect(sodium.to_hex(decrypt(encryptionKey2, cipherTextAsHex))).toEqual(
      clearTextAsHex
    )
  })

  it('Will fail if a different encryption/decryption key is used', () => {
    const encryptionKey1 = createEncryptionKey(
      'a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8'
    )
    const encryptionKey2 = createEncryptionKey(
      'a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b9'
    )

    const wrongKeyThrow = () =>
      decrypt(encryptionKey1, encrypt(encryptionKey2, 'a1'))
    expect(wrongKeyThrow).toThrowError('Authentication/decryption failed.')
  })

  it('Will return a new DH key pair and allow the key pair to be set', () => {
    const dhKeyPair = createDHKeyPair()
    expect(dhKeyPair.clientPublicKey.length).toEqual(64)
    expect(dhKeyPair.clientPrivateKey.length).toEqual(64)

    setDHKeyPair(dhKeyPair.clientPublicKey, dhKeyPair.clientPrivateKey)
    const publicKey = createClientPublicKey()

    expect(publicKey).toEqual(dhKeyPair.clientPublicKey)
  })
})
