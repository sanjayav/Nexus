import { createElement } from 'react'
import Illustration, { type IllustrationName } from '../design-system/illustrations/Illustration'

/**
 * Legacy illustration names → the Nexus contour-line set
 * (`design-system/illustrations`). Kept so existing imports keep working;
 * new code should use `<Illustration name="…" />` or `<EmptyState variant=… />`.
 *
 * Each still accepts `className` for sizing; colour comes from the
 * illustration tokens (--ill-stroke / --ill-fill / --ill-ink) unless a
 * text-* class overrides currentColor.
 */
type IllustrationProps = { className?: string }

const legacy = (name: IllustrationName) =>
  function LegacyIllustration({ className = '' }: IllustrationProps) {
    return createElement(Illustration, { name, className })
  }

export const EmptyTasksIllustration = legacy('cleared')
export const EmptyInboxIllustration = legacy('inbox')
export const EmptyReportsIllustration = legacy('published')
export const EmptyEvidenceIllustration = legacy('upload')
export const EmptyDataIllustration = legacy('noData')
