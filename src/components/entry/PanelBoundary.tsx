import { Component, type ReactNode } from 'react'

/**
 * Keeps a crashing side panel (history chart, linked data) from taking the
 * entry form down with it. Renders `fallback` (default: nothing) instead.
 */
export default class PanelBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err: Error) {
    if (import.meta.env.DEV) console.warn('[entry] side panel failed:', err.message)
  }
  render() { return this.state.failed ? (this.props.fallback ?? null) : this.props.children }
}
