import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { server } from './server'

// Ensure crypto is available for jose / api/_crypto.ts.
// jsdom in vitest already provides it, but be explicit.

// MFA encryption key for api/_crypto.ts (must be ≥ 32 chars).
if (!process.env.MFA_ENC_KEY && !process.env.JWT_SECRET) {
  process.env.MFA_ENC_KEY = 'unit-test-mfa-enc-key-12345678901234567890'
}

// IntersectionObserver / ResizeObserver shims for components that use them.
class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
  root: Element | null = null
  rootMargin = ''
  thresholds: number[] = []
}
vi.stubGlobal('IntersectionObserver', IO as unknown as typeof IntersectionObserver)
vi.stubGlobal('ResizeObserver', IO as unknown as typeof ResizeObserver)

// matchMedia shim
if (!window.matchMedia) {
  window.matchMedia = (q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList
}

// localStorage in jsdom already exists but we make sure it's fresh per file
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
})
afterAll(() => server.close())
