import type { ReactNode } from 'react'

/**
 * ModuleHeader — title block for a Data collection module (raw upload,
 * measured data, entity submissions). The hub page (`/data`) owns the page
 * entrance and breadcrumb; modules only state what they are and their action.
 */
export default function ModuleHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  /** Quiet status line beside the title (live feed, last sync). */
  meta?: ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="type-h1 text-[var(--text-primary)] text-balance">{title}</h1>
          {meta}
        </div>
        {description && <p className="type-body text-[var(--text-secondary)] mt-2 max-w-2xl text-pretty">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0 [&>*]:flex-1 sm:[&>*]:flex-initial">{actions}</div>}
    </div>
  )
}
