import { RefObject, useEffect, useRef } from 'react'

/** Close a popover on outside click or Escape. */
export function useDismiss(ref: RefObject<HTMLElement>, active: boolean, close: () => void) {
  const latest = useRef(close)
  latest.current = close
  useEffect(() => {
    if (!active) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) latest.current()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && latest.current()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, active])
}
