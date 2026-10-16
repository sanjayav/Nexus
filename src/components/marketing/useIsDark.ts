import { useEffect, useState } from 'react'

/** Tracks the resolved colour mode (`<html data-color-mode>`), live. */
export function useIsDark(): boolean {
  const read = () =>
    typeof document !== 'undefined' && document.documentElement.getAttribute('data-color-mode') === 'dark'
  const [dark, setDark] = useState(read)
  useEffect(() => {
    const el = document.documentElement
    const obs = new MutationObserver(() => setDark(read()))
    obs.observe(el, { attributes: true, attributeFilter: ['data-color-mode', 'data-theme'] })
    return () => obs.disconnect()
  }, [])
  return dark
}
