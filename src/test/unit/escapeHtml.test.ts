/**
 * api/_notify.ts uses a private `escapeHtml`. Copied here for unit testing —
 * change both together.
 */
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

describe('escapeHtml (email body)', () => {
  it('escapes the five HTML-significant chars', () => {
    expect(escapeHtml('<')).toBe('&lt;')
    expect(escapeHtml('>')).toBe('&gt;')
    expect(escapeHtml('&')).toBe('&amp;')
    expect(escapeHtml('"')).toBe('&quot;')
    expect(escapeHtml("'")).toBe('&#39;')
  })

  it('handles XSS-shaped input safely', () => {
    expect(escapeHtml('<script>alert("x")</script>'))
      .toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
  })

  it('is a no-op on plain text', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })

  it('escapes ampersand BEFORE the other entities to avoid double-encoding artefacts', () => {
    // "&lt;" itself should round-trip to "&amp;lt;" — the function must NOT
    // skip the leading & once it sees "lt;".
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
  })
})
