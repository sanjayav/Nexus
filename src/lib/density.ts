import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

/**
 * Density preference — a user-level toggle that swaps the spacing scale across
 * the app. We *only* expose this as a `data-density="…"` attribute on
 * `<html>`; visual rules live in CSS so individual components stay unaware:
 *
 *   :root[data-density="compact"]     .card-premium { padding: 1.25rem; }
 *   :root[data-density="comfortable"] .card-premium { padding: 2rem; }
 *
 * Default is `comfortable` — generous breathing room is the recommended
 * Big-4-brochure feel. Power users who want to fit more on screen can flip
 * the toggle from Settings → Display.
 */
export type Density = 'comfortable' | 'compact'

const STORAGE_KEY = 'aeiforo_density'

type DensityContextValue = {
  density: Density
  setDensity: (d: Density) => void
}

const Ctx = createContext<DensityContextValue | null>(null)

export function DensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<Density>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'compact' || stored === 'comfortable') return stored
    } catch {
      /* ignore — localStorage unavailable */
    }
    return 'comfortable'
  })

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-density', density)
    }
    try {
      localStorage.setItem(STORAGE_KEY, density)
    } catch {
      /* ignore */
    }
  }, [density])

  return createElement(
    Ctx.Provider,
    { value: { density, setDensity: setDensityState } },
    children,
  )
}

export function useDensity(): DensityContextValue {
  const c = useContext(Ctx)
  if (!c) throw new Error('useDensity must be used inside a DensityProvider')
  return c
}
