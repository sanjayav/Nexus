import { useRef, useEffect } from 'react'

/**
 * useTilt — 3D mouse parallax like Linear changelog cards / Arc homepage.
 *
 * Writes `--rx` and `--ry` CSS variables on the target element based on
 * cursor position. Combine with `className="tilt"` (defined in index.css)
 * for the transform: perspective(…) rotateX(var(--rx)) rotateY(var(--ry)).
 */
export function useTilt<T extends HTMLElement>(max = 6) {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width
      const py = (e.clientY - r.top) / r.height
      const ry = (px - 0.5) * max * 2
      const rx = (0.5 - py) * max * 2
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--rx', `${rx}deg`)
        el.style.setProperty('--ry', `${ry}deg`)
      })
    }
    const reset = () => {
      el.style.setProperty('--rx', '0deg')
      el.style.setProperty('--ry', '0deg')
    }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', reset)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', reset)
      cancelAnimationFrame(raf)
    }
  }, [max])
  return ref
}

/**
 * useSpotlight — paints a soft glow at the cursor via CSS variables.
 * Pair with className="spotlight".
 */
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
      el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
    }
    el.addEventListener('mousemove', onMove)
    return () => el.removeEventListener('mousemove', onMove)
  }, [])
  return ref
}
