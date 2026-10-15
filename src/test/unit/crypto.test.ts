/**
 * api/_crypto.ts uses Node's `crypto` and reads MFA_ENC_KEY at call time.
 * setup.ts sets the env var before this file is imported.
 */
import { encrypt, decrypt } from '../../../api/_crypto'

describe('AES-256-GCM crypto helpers', () => {
  it('round-trips plaintext through encrypt/decrypt', () => {
    const plain = 'JBSWY3DPEHPK3PXP'
    const ct = encrypt(plain)
    expect(ct).not.toBe(plain)
    expect(decrypt(ct)).toBe(plain)
  })

  it('produces unique ciphertext on repeated encrypt (random IVs)', () => {
    const plain = 'secret'
    const a = encrypt(plain)
    const b = encrypt(plain)
    expect(a).not.toBe(b)
    // First 12 bytes (16 base64 chars w/ no padding) is the IV — must differ.
    expect(a.slice(0, 16)).not.toBe(b.slice(0, 16))
  })

  it('rejects tampered ciphertext (GCM auth tag mismatch)', () => {
    const ct = encrypt('hello')
    // Flip the last char to corrupt the body
    const tampered = ct.slice(0, -2) + (ct.slice(-2) === 'AA' ? 'BB' : 'AA')
    expect(() => decrypt(tampered)).toThrow()
  })

  it('rejects truncated ciphertext', () => {
    const ct = encrypt('hello')
    expect(() => decrypt(ct.slice(0, 10))).toThrow()
  })

  it('handles empty string', () => {
    expect(decrypt(encrypt(''))).toBe('')
  })

  it('handles unicode', () => {
    const msg = 'hello สวัสดี 🌍'
    expect(decrypt(encrypt(msg))).toBe(msg)
  })
})
