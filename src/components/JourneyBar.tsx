import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Lock, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { computePipeline, type StageKey } from '../lib/journey'
import { useOrgData } from '../lib/useOrgData'

/**
 * Horizontal pipeline strip — Onboard → Assign → Collect → Review → Approve → Publish.
 * Each stage is a clickable chip showing state + headline. The stage the
 * current user should act on is accented.
 *
 * Variants:
 *   - 'full'    — tall, shows headlines under each stage (use on Dashboard)
 *   - 'compact' — single line, just dots + labels (use on sub-pages)
 */
export default function JourneyBar({
  variant = 'full',
  highlight,
}: {
  variant?: 'full' | 'compact'
  highlight?: StageKey
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data } = useOrgData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stages = useMemo(() => computePipeline(user, data), [user, data, i18n.language])

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1 text-caption text-[var(--text-tertiary)] overflow-x-auto">
        {stages.map((s, i) => {
          const active = s.state === 'active' || s.stage.key === highlight
          const done = s.state === 'done'
          const locked = s.state === 'locked'
          return (
            <div key={s.stage.key} className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                disabled={locked}
                onClick={() => !locked && navigate(s.stage.route)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full transition-colors ${
                  active ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] font-semibold'
                  : done ? 'bg-[var(--accent-green-light)] text-[var(--status-ok)] font-medium'
                  : locked ? 'opacity-40 cursor-not-allowed'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer'
                }`}
              >
                {done ? <Check className="w-3 h-3" />
                 : locked ? <Lock className="w-2.5 h-2.5" />
                 : <span className="w-3 h-3 rounded-full border-2 flex items-center justify-center"
                         style={{ borderColor: active ? '#fff' : 'currentColor' }}>
                     {active && <span className="w-1 h-1 rounded-full bg-white" />}
                   </span>}
                {s.stage.label}
              </button>
              {i < stages.length - 1 && <ArrowRight className="w-3 h-3 text-[var(--text-tertiary)]/40 flex-shrink-0" />}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden">
      <header className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div>
          <div className="text-micro uppercase tracking-[0.06em] font-semibold text-[var(--color-brand)]">
            {t('components.journey.pipeline')}
          </div>
          <h3 className="font-display text-[length:var(--text-sm)] font-semibold text-[var(--text-primary)] mt-0.5">
            {stages.find(s => s.state === 'active')?.stage.label ?? t('components.journey.allComplete')} · {' '}
            <span className="text-[var(--text-tertiary)] font-normal">
              {stages.find(s => s.state === 'active')?.headline ?? t('components.journey.publishGroup')}
            </span>
          </h3>
        </div>
        <ProgressMini stages={stages} />
      </header>

      <div className="grid grid-cols-6 divide-x divide-[var(--border-subtle)]">
        {stages.map((s, i) => {
          const active = s.state === 'active'
          const done = s.state === 'done'
          const locked = s.state === 'locked'
          const isMine = s.isMine

          return (
            <button
              key={s.stage.key}
              type="button"
              disabled={locked}
              onClick={() => !locked && navigate(s.stage.route)}
              className={`relative text-left p-3.5 transition-colors group ${
                active ? 'bg-[var(--color-brand-soft)]'
                : done ? 'hover:bg-[var(--bg-secondary)]'
                : locked ? 'opacity-50 cursor-not-allowed bg-[var(--bg-secondary)]/50'
                : 'hover:bg-[var(--bg-secondary)]'
              }`}
            >
              {isMine && (
                <span className="absolute top-1.5 right-1.5 text-micro uppercase tracking-[0.06em] font-bold text-[var(--color-brand)] bg-white px-1.5 py-0.5 rounded">
                  {t('components.journey.yourTurn')}
                </span>
              )}
              <div className="flex items-center gap-2 mb-1.5">
                <StepIcon state={s.state} idx={i + 1} />
                <span className={`text-[length:var(--text-xs)] font-semibold ${
                  active ? 'text-[var(--color-brand-strong)]'
                  : done ? 'text-[var(--status-ok)]'
                  : locked ? 'text-[var(--text-tertiary)]'
                  : 'text-[var(--text-primary)]'
                }`}>
                  {s.stage.label}
                </span>
              </div>
              <div className="text-caption text-[var(--text-secondary)] leading-snug line-clamp-2 min-h-[28px]">
                {s.headline}
              </div>
              {s.total > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-caption">
                  <div className="flex-1 h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(s.done / Math.max(s.total, 1)) * 100}%`,
                        background: done ? 'var(--status-ok)' : active ? 'var(--color-brand)' : 'var(--border-strong)',
                      }}
                    />
                  </div>
                  <span className="tabular-nums font-semibold text-[var(--text-tertiary)] w-12 text-right">
                    {s.done}/{s.total}
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function StepIcon({ state, idx }: { state: 'locked' | 'todo' | 'active' | 'done'; idx: number }) {
  const base = 'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-caption font-bold'
  if (state === 'done') return <span className={`${base} bg-[var(--status-ok)] text-white`}><Check className="w-3 h-3" /></span>
  if (state === 'active') return <span className={`${base} bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] ring-4 ring-[var(--color-brand)]/20`}>{idx}</span>
  if (state === 'locked') return <span className={`${base} bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]`}><Lock className="w-2.5 h-2.5" /></span>
  return <span className={`${base} bg-[var(--bg-tertiary)] text-[var(--text-secondary)]`}>{idx}</span>
}

function ProgressMini({ stages }: { stages: ReturnType<typeof computePipeline> }) {
  const { t } = useTranslation()
  const total = stages.length
  const done = stages.filter(s => s.state === 'done').length
  return (
    <div className="flex items-center gap-2 text-caption text-[var(--text-tertiary)]">
      <span className="font-semibold text-[var(--text-primary)] tabular-nums">{done}/{total}</span>
      <span>{t('components.journey.stagesComplete')}</span>
      <div className="flex items-center gap-0.5">
        {stages.map((s, i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full" style={{
            background: s.state === 'done' ? 'var(--status-ok)'
              : s.state === 'active' ? 'var(--color-brand)'
              : 'var(--border-default)',
          }} />
        ))}
      </div>
    </div>
  )
}
