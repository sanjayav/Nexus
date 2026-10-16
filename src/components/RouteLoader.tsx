import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SkeletonPage } from './Skeleton'

/**
 * Suspense fallback while a lazy route chunk loads. Waits 150 ms before
 * showing anything (most chunks arrive sooner — no flash), then shows a
 * page-shaped skeleton rather than a spinner so the layout doesn't jump.
 */
export default function RouteLoader() {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setShow(true), 150)
    return () => window.clearTimeout(id)
  }, [])
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="min-h-[60vh]">
      <span className="sr-only">{t('common.loading')}</span>
      {show && <SkeletonPage className="max-w-[1200px]" />}
    </div>
  )
}
