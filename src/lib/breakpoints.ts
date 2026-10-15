import { useEffect, useState } from 'react'

/**
 * Named breakpoints aligned with Tailwind's default scale so a JS-side
 * `useBreakpoint()` returns the same threshold that `sm: md: lg:` utility
 * classes use. Consumers that want a single coarse signal can use
 * `useIsMobile()` or `useIsBelowLg()`.
 */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const BPS: Record<Breakpoint, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
}

function resolve(w: number): Breakpoint {
  if (w >= BPS.xl) return 'xl'
  if (w >= BPS.lg) return 'lg'
  if (w >= BPS.md) return 'md'
  if (w >= BPS.sm) return 'sm'
  return 'xs'
}

/**
 * Subscribe to viewport-width changes. SSR-safe: in non-browser environments
 * (vitest, prerender) it falls back to `xl` so desktop layouts render by
 * default and don't accidentally show the mobile drawer in a test snapshot.
 */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() =>
    resolve(typeof window !== 'undefined' ? window.innerWidth : BPS.xl),
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setBp(resolve(window.innerWidth))
    window.addEventListener('resize', onResize, { passive: true })
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return bp
}

/** True at < 768px — the "phone" tier where stacked layouts win. */
export function useIsMobile(): boolean {
  const b = useBreakpoint()
  return b === 'xs' || b === 'sm'
}

/** True at < 1024px — the tier where the desktop sidebar collapses to a drawer. */
export function useIsBelowLg(): boolean {
  const b = useBreakpoint()
  return b !== 'lg' && b !== 'xl'
}
