import { useEffect, useState } from 'react'

/**
 * Decides whether the sign-in page may download the optional 3D scene.
 *
 * The Spline runtime is ~1.5 MB gzipped and its scene file lives on a foreign
 * host (prod.spline.design) that is blocked or very slow from mainland China.
 * It is a desktop-only flourish over a static contour illustration, so it is
 * fetched only when ALL of these hold:
 *
 *   - wide viewport (≥ 1024 px) with a fine pointer — never phones / tablets
 *   - the UI language is not Chinese, and no browser language is Chinese
 *   - the device clock is not set to a mainland-China time zone
 *   - the visitor has not asked for reduced motion or reduced data
 *   - the page has finished loading and the browser is idle (after first paint)
 *
 * Returns `false` until every condition is met; flips back to `false` if the
 * user switches the UI to Chinese or narrows the window.
 */
const MAINLAND_TZ = new Set(['Asia/Shanghai', 'Asia/Chongqing', 'Asia/Harbin', 'Asia/Urumqi', 'Asia/Kashgar', 'PRC'])

function staticAllowed(uiLang: string): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  if (uiLang.toLowerCase().startsWith('zh')) return false
  const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]) ?? []
  if (langs.some((l) => /^zh\b/i.test(l ?? ''))) return false
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz && MAINLAND_TZ.has(tz)) return false
  } catch { /* ignore */ }
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  if (conn?.saveData) return false
  if (conn?.effectiveType && /(^|-)2g|3g/.test(conn.effectiveType)) return false
  if (typeof window.matchMedia !== 'function') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  if (window.matchMedia('(prefers-reduced-data: reduce)').matches) return false
  return window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches
}

export function useHeroScene(uiLang: string): boolean {
  const [idle, setIdle] = useState(false)
  const [allowed, setAllowed] = useState(() => staticAllowed(uiLang))

  // Re-evaluate on language change and viewport changes.
  useEffect(() => {
    setAllowed(staticAllowed(uiLang))
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(min-width: 1024px) and (pointer: fine)')
    const onChange = () => setAllowed(staticAllowed(uiLang))
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [uiLang])

  // Wait for the load event, then an idle slot, so the form paints first.
  useEffect(() => {
    if (!allowed || idle) return
    let cancelled = false
    let idleHandle: number | undefined
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (h: number) => void }
    const schedule = () => {
      if (cancelled) return
      if (w.requestIdleCallback) idleHandle = w.requestIdleCallback(() => !cancelled && setIdle(true), { timeout: 2500 })
      else idleHandle = window.setTimeout(() => !cancelled && setIdle(true), 1200)
    }
    if (document.readyState === 'complete') schedule()
    else window.addEventListener('load', schedule, { once: true })
    return () => {
      cancelled = true
      window.removeEventListener('load', schedule)
      if (idleHandle !== undefined) {
        if (w.cancelIdleCallback) w.cancelIdleCallback(idleHandle)
        window.clearTimeout(idleHandle)
      }
    }
  }, [allowed, idle])

  return allowed && idle
}
