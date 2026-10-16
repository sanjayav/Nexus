import EmptyState, { type EmptyStateProps } from '../../components/EmptyState'

/**
 * Design-system entry for the one EmptyState (implementation lives in
 * `components/EmptyState`). Historically this variant rendered inside a
 * dashed outline frame, so `framed` defaults to true here.
 */
export default function DSEmptyState({ framed = true, ...props }: EmptyStateProps) {
  return <EmptyState framed={framed} {...props} />
}

export type { EmptyStateProps, EmptyVariant, EmptyStateCta } from '../../components/EmptyState'
