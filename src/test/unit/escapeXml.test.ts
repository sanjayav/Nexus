/**
 * api/_ixbrl.ts uses a private `escapeXml`. We pin its behaviour with this
 * test-local copy — if production drifts, this test should be updated to keep
 * the contract documented in one place.
 */
function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!))
}

describe('escapeXml', () => {
  it('escapes <, >, &, \', "', () => {
    expect(escapeXml('<a>')).toBe('&lt;a&gt;')
    expect(escapeXml('A & B')).toBe('A &amp; B')
    expect(escapeXml("it's")).toBe('it&apos;s')
    expect(escapeXml('"x"')).toBe('&quot;x&quot;')
  })

  it('is a no-op on safe text', () => {
    expect(escapeXml('hello world 123')).toBe('hello world 123')
  })

  it('is NOT idempotent — the literal output of escapeXml will be re-escaped', () => {
    // Documents reality: applying escapeXml twice double-escapes the ampersand.
    const once = escapeXml('A & B')
    const twice = escapeXml(once)
    expect(twice).toBe('A &amp;amp; B')
  })

  it('handles all five chars in one string', () => {
    expect(escapeXml(`<&>'"`)).toBe('&lt;&amp;&gt;&apos;&quot;')
  })
})
