import { Component, Suspense, lazy, type ReactNode } from 'react'

// The Spline runtime is ~1.5 MB gzipped plus a scene file from prod.spline.design.
// Never import this eagerly: callers gate it (see components/auth/useHeroScene).
const Spline = lazy(() => import('@splinetool/react-spline'))

interface SplineSceneProps {
  scene: string
  className?: string
  /** Fires once the scene has rendered its first frame. */
  onLoad?: () => void
  /** Fires if the runtime or the scene file fails (blocked host, no WebGL). */
  onError?: () => void
}

/**
 * Swallows runtime / network failures so a blocked scene host (for example
 * from mainland China) can never take the page down. The static artwork
 * underneath stays as the result.
 */
class SceneBoundary extends Component<{ children: ReactNode; onError?: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError?.()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/**
 * Interactive 3D scene from Spline. Renders nothing while loading — callers
 * paint a static fallback underneath and fade the scene in on `onLoad`.
 */
export function SplineScene({ scene, className, onLoad, onError }: SplineSceneProps) {
  return (
    <SceneBoundary onError={onError}>
      <Suspense fallback={null}>
        <Spline scene={scene} className={className} onLoad={() => onLoad?.()} />
      </Suspense>
    </SceneBoundary>
  )
}
