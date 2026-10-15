import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'

/**
 * Theme system (two independent axes)
 * ────────────────────────────────────
 *  • `theme` — visual style: 'demo-flat' (default, flat enterprise) | 'glass'
 *    Applied to <html data-theme="…">. Existing token system keys off this.
 *
 *  • `colorMode` — user color preference: 'light' | 'auto' | 'dark'
 *    Persisted as the user's intent. Resolved against OS preference when 'auto'.
 *    Applied to <html data-color-mode="…"> (only 'light' | 'dark' — auto resolves).
 *    The light overlay tokens live under `:root[data-color-mode='light']`; the
 *    dark overlay under `:root[data-color-mode='dark']`. The Sidebar reads from
 *    `--bg-inverse`, which stays dark on both modes (premium navigation chrome).
 */

export type Theme = 'demo-flat' | 'glass'
export type ColorMode = 'light' | 'auto' | 'dark'
export type ResolvedColorMode = 'light' | 'dark'

const THEME_STORAGE_KEY = 'nexus-theme'
const COLOR_MODE_STORAGE_KEY = 'aeiforo_color_mode'
const DEFAULT_THEME: Theme = 'demo-flat'
const DEFAULT_COLOR_MODE: ColorMode = 'auto'

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME
  const current = document.documentElement.getAttribute('data-theme')
  if (current === 'glass' || current === 'demo-flat') return current
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'glass' || stored === 'demo-flat') return stored
  return DEFAULT_THEME
}

function readInitialColorMode(): ColorMode {
  if (typeof window === 'undefined') return DEFAULT_COLOR_MODE
  try {
    const stored = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored
  } catch {
    // ignore
  }
  return DEFAULT_COLOR_MODE
}

function resolveColorMode(mode: ColorMode): ResolvedColorMode {
  if (mode === 'light' || mode === 'dark') return mode
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  colorMode: ColorMode
  resolvedColorMode: ResolvedColorMode
  setColorMode: (m: ColorMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme)
  const [colorMode, setColorModeState] = useState<ColorMode>(readInitialColorMode)
  const [resolvedColorMode, setResolvedColorMode] = useState<ResolvedColorMode>(() =>
    resolveColorMode(readInitialColorMode()),
  )

  // Apply visual style (demo-flat / glass).
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // localStorage unavailable (private mode, etc.) — in-memory only
    }
  }, [theme])

  // Apply color mode + listen for OS preference changes when in 'auto'.
  useEffect(() => {
    const resolved = resolveColorMode(colorMode)
    setResolvedColorMode(resolved)
    document.documentElement.setAttribute('data-color-mode', resolved)
    try {
      window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, colorMode)
    } catch {
      // ignore
    }

    if (colorMode !== 'auto' || typeof window === 'undefined' || !window.matchMedia) {
      return
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => {
      const next: ResolvedColorMode = e.matches ? 'dark' : 'light'
      setResolvedColorMode(next)
      document.documentElement.setAttribute('data-color-mode', next)
    }
    // Both modern and legacy listeners — older Safari uses addListener.
    if (media.addEventListener) media.addEventListener('change', onChange)
    else media.addListener(onChange)
    return () => {
      if (media.removeEventListener) media.removeEventListener('change', onChange)
      else media.removeListener(onChange)
    }
  }, [colorMode])

  const setTheme = useCallback((t: Theme) => setThemeState(t), [])
  const toggleTheme = useCallback(
    () => setThemeState(t => (t === 'demo-flat' ? 'glass' : 'demo-flat')),
    [],
  )
  const setColorMode = useCallback((m: ColorMode) => setColorModeState(m), [])

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, toggleTheme, colorMode, resolvedColorMode, setColorMode }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

/** Convenience hook for components that only care about the color axis. */
export function useColorMode() {
  const { colorMode, resolvedColorMode, setColorMode } = useTheme()
  return { colorMode, resolvedColorMode, setColorMode }
}
