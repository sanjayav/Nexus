import { Suspense, lazy } from 'react'

// Spline is ~600 KB gzipped. Lazy-load so it never blocks initial paint.
const Spline = lazy(() => import('@splinetool/react-spline'))

interface SplineSceneProps {
  scene: string
  className?: string
}

/**
 * Interactive 3D scene from Spline. Renders a subtle loading state while
 * the WebGL runtime and the .splinecode asset fetch over the network.
 */
export function SplineScene({ scene, className }: SplineSceneProps) {
  return (
    <Suspense
      fallback={
        <div className={`w-full h-full flex items-center justify-center ${className ?? ''}`}>
          <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
        </div>
      }
    >
      <Spline scene={scene} className={className} />
    </Suspense>
  )
}
