import { motion } from 'framer-motion'

/**
 * MeshBackground — the breathing aurora gradient seen in Linear / Framer / Arc.
 * Pure CSS + SVG, no three.js. Pass `intensity` (0–1) to scale the glow.
 * Place as the first child of a `position:relative` ancestor.
 */
export default function MeshBackground({
  variant = 'light',
  intensity = 1,
  grain = true,
  grid = false,
}: {
  variant?: 'light' | 'dark'
  intensity?: number
  grain?: boolean
  grid?: boolean
}) {
  if (variant === 'dark') {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{ background: '#0B1924' }} />
        {/* Animated blobs */}
        <motion.div
          className="absolute rounded-full"
          style={{ top: '-20%', left: '-10%', width: '70%', height: '70%', background: 'radial-gradient(circle, rgba(27,107,123,0.55), transparent 60%)', filter: 'blur(80px)', opacity: intensity }}
          animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{ top: '30%', right: '-10%', width: '55%', height: '55%', background: 'radial-gradient(circle, rgba(47,169,142,0.42), transparent 60%)', filter: 'blur(90px)', opacity: intensity }}
          animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{ bottom: '-20%', left: '20%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(94,53,177,0.38), transparent 60%)', filter: 'blur(100px)', opacity: intensity }}
          animate={{ x: [0, 20, 0], y: [0, -30, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Subtle stars */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.35]">
          <defs>
            <pattern id="stars" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="20" r="0.5" fill="white" />
              <circle cx="50" cy="60" r="0.4" fill="white" />
              <circle cx="70" cy="10" r="0.6" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#stars)" />
        </svg>
        {grain && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter><rect width='240' height='240' filter='url(%23n)' opacity='0.9'/></svg>")`,
              mixBlendMode: 'overlay',
              opacity: 0.25,
            }}
          />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 60%, rgba(11,25,36,0.7) 100%)' }} />
      </div>
    )
  }

  // Light variant — PTTGC navy + green aurora on a creamy base
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #FAFBFC 0%, #F4F7FA 100%)' }} />
      <motion.div
        className="absolute rounded-full"
        style={{ top: '-25%', left: '-10%', width: '70%', height: '70%', background: 'radial-gradient(circle, rgba(0,68,140,0.16), transparent 60%)', filter: 'blur(80px)', opacity: intensity }}
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{ top: '20%', right: '-15%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(0,166,81,0.14), transparent 60%)', filter: 'blur(90px)', opacity: intensity }}
        animate={{ x: [0, -30, 0], y: [0, -15, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{ bottom: '-25%', left: '20%', width: '55%', height: '55%', background: 'radial-gradient(circle, rgba(94,53,177,0.10), transparent 60%)', filter: 'blur(100px)', opacity: intensity }}
        animate={{ x: [0, 20, 0], y: [0, -25, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      {grid && (
        <div
          className="absolute inset-0 grid-dots-light opacity-60"
          style={{ maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)' }}
        />
      )}
      {grain && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0'/></filter><rect width='180' height='180' filter='url(%23n)' opacity='0.6'/></svg>")`,
            mixBlendMode: 'overlay',
            opacity: 0.18,
          }}
        />
      )}
    </div>
  )
}

/**
 * Spotlight — cursor-following soft light. Attach to any `.spotlight`
 * container; this hook writes CSS variables on mousemove.
 */
export function useSpotlight<T extends HTMLElement>() {
  return (node: T | null) => {
    if (!node) return
    const onMove = (e: MouseEvent) => {
      const r = node.getBoundingClientRect()
      const x = ((e.clientX - r.left) / r.width) * 100
      const y = ((e.clientY - r.top) / r.height) * 100
      node.style.setProperty('--mx', `${x}%`)
      node.style.setProperty('--my', `${y}%`)
    }
    node.addEventListener('mousemove', onMove)
  }
}
