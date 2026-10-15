import crypto from 'crypto'

/**
 * AES-256-GCM helpers for TOTP secret + recovery code encryption.
 *
 * Key derivation:
 *  - Reads MFA_ENC_KEY if set (preferred — rotate independently of session secret).
 *  - Falls back to JWT_SECRET so deployments that haven't provisioned a separate
 *    MFA key still work without crashing at import time.
 *  - SHA-256 of the raw value gives us a deterministic 32-byte key.
 *
 * Output format: base64(iv ‖ tag ‖ ciphertext) so decrypt() can split on fixed
 * offsets (12 byte IV + 16 byte auth tag).
 */
function getMfaKey(): Buffer {
  const raw = process.env.MFA_ENC_KEY ?? process.env.JWT_SECRET
  if (!raw || raw.length < 32) {
    throw new Error('MFA_ENC_KEY (or fallback JWT_SECRET) must be ≥32 chars')
  }
  return crypto.createHash('sha256').update(raw).digest()
}

export function encrypt(plaintext: string): string {
  const key = getMfaKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ct]).toString('base64')
}

export function decrypt(b64: string): string {
  const key = getMfaKey()
  const buf = Buffer.from(b64, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const ct = buf.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}
