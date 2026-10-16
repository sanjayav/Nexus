import { useRef } from 'react'
import { useInView } from 'framer-motion'

/**
 * useFirstView — gate a chart's mount on its first appearance in the
 * viewport so Recharts' draw-in (lines draw, bars grow from the baseline)
 * plays when the reader actually sees it, once.
 *
 *   const [ref, seen] = useFirstView<HTMLDivElement>()
 *   <div ref={ref}>{seen ? <ChartFrame…/> : <Skeleton…/>}</div>
 */
export default function useFirstView<T extends Element = HTMLDivElement>(margin = '0px 0px -10% 0px') {
  const ref = useRef<T>(null)
  // framer's useInView types `margin` as a CSS-margin template literal.
  const seen = useInView(ref, { once: true, margin: margin as `${number}px` })
  return [ref, seen] as const
}
