// Node has no Web Storage; zustand's persist middleware needs one at store creation.
// (jsdom provides its own; only install the shim where it is missing.)
if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.getItem !== 'function') {
  const mem = new Map<string, string>()
  globalThis.localStorage = {
    getItem: k => mem.get(k) ?? null,
    setItem: (k, v) => void mem.set(k, String(v)),
    removeItem: k => void mem.delete(k),
    clear: () => mem.clear(),
    key: i => [...mem.keys()][i] ?? null,
    get length() {
      return mem.size
    },
  } as Storage
}

// Browser APIs motion uses that jsdom lacks.
if (typeof window !== 'undefined') {
  await import('@testing-library/jest-dom/vitest')
  // Vitest runs without globals, so RTL's auto-cleanup must be registered explicitly.
  const [{ afterEach }, { cleanup }] = await Promise.all([import('vitest'), import('@testing-library/react')])
  afterEach(() => cleanup())
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  window.IntersectionObserver ??= IO as unknown as typeof IntersectionObserver
  window.scrollTo = () => {}
}
export {}
