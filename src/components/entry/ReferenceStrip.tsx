import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { History, TrendingUp, TrendingDown, Users } from 'lucide-react'
import { orgStore, type HistoricalReference } from '../../lib/orgStore'
import { useFmt } from '../../lib/fmt'
import { Skeleton } from '../Skeleton'

type Ref = { state: 'loading' } | { state: 'error' } | { state: 'ready'; data: HistoricalReference }

/** Shared loader so the strip and the side panel ask once per item. */
export function useHistoricalReference(questionId: string, entityId?: string | null): Ref {
  const [ref, setRef] = useState<Ref>({ state: 'loading' })
  useEffect(() => {
    let cancelled = false
    setRef({ state: 'loading' })
    orgStore.historicalReference(questionId, entityId ?? undefined)
      .then(data => { if (!cancelled) setRef({ state: 'ready', data }) })
      .catch(() => { if (!cancelled) setRef({ state: 'error' }) })
    return () => { cancelled = true }
  }, [questionId, entityId])
  return ref
}

/**
 * Compact history + compare context, under the value field. Last filed value
 * (one-click reuse), three-year average with range, peer average, and the
 * change versus last year — flagged when it moves more than 30 %.
 */
export default function ReferenceStrip({
  questionId, entityId, unit, current, onUse, disabled, columns = 4,
}: {
  questionId: string
  entityId?: string | null
  unit?: string | null
  current: number | null
  onUse: (v: number) => void
  disabled?: boolean
  columns?: 2 | 4
}) {
  const { t } = useTranslation()
  const f = useFmt()
  const ref = useHistoricalReference(questionId, entityId)

  if (ref.state === 'loading') {
    return (
      <div className={`grid gap-px rounded-[var(--radius-md)] overflow-hidden border border-[var(--border-subtle)] ${columns === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`} aria-busy="true">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="bg-[var(--bg-primary)] p-3 space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-20" /></div>
        ))}
      </div>
    )
  }
  if (ref.state === 'error') {
    return <p className="text-caption text-[var(--text-tertiary)]">{t('entry.reference.unavailable')}</p>
  }

  // Tolerate partial payloads (no history / peers arrays).
  const history = Array.isArray(ref.data?.history) ? ref.data.history : []
  const peers = Array.isArray(ref.data?.peers) ? ref.data.peers : []
  const series = [...history].sort((a, b) => a.year - b.year)
  if (series.length === 0 && peers.length === 0) {
    return <p className="text-caption text-[var(--text-tertiary)]">{t('entry.reference.none')}</p>
  }
  const last = series[series.length - 1]
  const recent = series.slice(-3)
  const avg = recent.length ? recent.reduce((s, p) => s + p.value, 0) / recent.length : null
  const min = recent.length ? Math.min(...recent.map(p => p.value)) : null
  const max = recent.length ? Math.max(...recent.map(p => p.value)) : null
  const peerAvg = peers.length ? peers.reduce((s, p) => s + p.value, 0) / peers.length : null
  const delta = last && current != null && last.value !== 0 ? (current - last.value) / Math.abs(last.value) : null
  const unusual = delta != null && Math.abs(delta) > 0.3

  const cell = 'bg-[var(--bg-primary)] px-3 py-2.5 min-w-0'
  const label = 'text-caption text-[var(--text-tertiary)] truncate flex items-center gap-1'
  const fig = 'type-figure text-[15px] leading-6 text-[var(--text-primary)] truncate'

  return (
    <div>
      <div className={`grid gap-px rounded-[var(--radius-md)] overflow-hidden border border-[var(--border-subtle)] bg-[var(--border-subtle)] ${columns === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
        <div className={cell}>
          <div className={label}><History className="w-3 h-3 flex-shrink-0" aria-hidden />{last ? t('entry.reference.lastFiled', { year: last.year }) : t('entry.reference.lastFiledNone')}</div>
          <div className={fig}>{last ? f.number(last.value) : '—'}</div>
          {last && !disabled && (
            <button type="button" onClick={() => onUse(last.value)} className="mt-0.5 text-caption font-semibold text-[var(--color-brand-strong)] hover:underline underline-offset-2">
              {t('entry.reference.use')}
            </button>
          )}
        </div>
        <div className={cell}>
          <div className={label}>{t('entry.reference.avg', { count: recent.length })}</div>
          <div className={fig}>{avg != null ? f.number(avg) : '—'}</div>
          {min != null && max != null && <div className="text-caption text-[var(--text-tertiary)] tabular-nums truncate">{f.number(min)} – {f.number(max)}</div>}
        </div>
        <div className={cell}>
          <div className={label}>{delta != null && delta < 0 ? <TrendingDown className="w-3 h-3 flex-shrink-0" aria-hidden /> : <TrendingUp className="w-3 h-3 flex-shrink-0" aria-hidden />}{t('entry.reference.change')}</div>
          <div className={`${fig} ${unusual ? '!text-[var(--status-warning)]' : ''}`}>{delta != null ? f.percent(delta, { ratio: true, signed: true, precision: 1 }) : '—'}</div>
          {unusual && <div className="text-caption text-[var(--status-warning)] truncate">{t('entry.reference.unusual')}</div>}
        </div>
        <div className={cell}>
          <div className={label}><Users className="w-3 h-3 flex-shrink-0" aria-hidden />{t('entry.reference.peers')}</div>
          <div className={fig}>{peerAvg != null ? f.number(peerAvg) : '—'}</div>
          <div className="text-caption text-[var(--text-tertiary)] truncate">{peers.length ? t('entry.reference.peerCount', { count: peers.length }) : t('entry.reference.noPeers')}</div>
        </div>
      </div>
      {unit && <p className="sr-only">{t('entry.reference.unitNote', { unit })}</p>}
    </div>
  )
}
