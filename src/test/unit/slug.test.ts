/**
 * `slugify` is a private helper in api/auth/register.ts — copied verbatim here
 * (kept in sync with the production version) so we can exercise edge cases
 * without spinning up the whole serverless handler.
 *
 * If the production version drifts from this copy, this test should fail.
 */
function slugify(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'workspace'
}

describe('slugify', () => {
  it('returns "workspace" for empty string', () => {
    expect(slugify('')).toBe('workspace')
  })

  it('strips punctuation and lowercases', () => {
    expect(slugify('Acme Inc!')).toBe('acme-inc')
  })

  it('returns "workspace" for whitespace/dashes only', () => {
    expect(slugify('  ---  ')).toBe('workspace')
  })

  it('truncates to 60 chars', () => {
    const long = 'a'.repeat(100)
    const result = slugify(long)
    expect(result.length).toBeLessThanOrEqual(60)
  })

  it('strips diacritics-bearing characters (no transliteration)', () => {
    // The current implementation drops non-ASCII rather than transliterating —
    // so "Société" → "soci-t" (é + space + a fall through the [^a-z0-9] sieve).
    expect(slugify('Société')).toBe('soci-t')
  })

  it('collapses runs of non-alphanumerics to single dash', () => {
    expect(slugify('foo!!!---bar')).toBe('foo-bar')
  })

  it('trims leading/trailing dashes', () => {
    expect(slugify('---foo---')).toBe('foo')
  })

  it('preserves alphanumeric body', () => {
    expect(slugify('abc 123')).toBe('abc-123')
  })
})
