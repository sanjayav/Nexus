import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, UserCog, Factory, CheckSquare, ShieldCheck, FileText, ArrowRight, Check,
} from 'lucide-react'
import { type StageKey, type StageStatus } from '../lib/journey'
import { ROLE_CATALOG, type PlatformRole } from '../lib/rbac'

/**
 * PipelineJourney — restrained enterprise stepper.
 *
 * Design rules (Linear / Attio / Stripe):
 *   — monochrome with a single accent (brand navy)
 *   — thin 1-2px connectors, not thick beams
 *   — small 28px nodes, not oversized badges
 *   — typography does the work, not color
 *   — "you" = subtle underline, not a sticker arrow
 *   — completed stages = solid tick, not a glowing halo
 */

const STAGE_ICONS: Record<StageKey, typeof Sparkles> = {
  onboard: Sparkles,
  assign:  UserCog,
  collect: Factory,
  review:  CheckSquare,
  approve: ShieldCheck,
  publish: FileText,
}

// One accent for the whole product. Status is expressed in typography + state shape.
const BRAND = 'var(--color-brand-strong)'
const BRAND_SOFT = 'var(--accent-teal-subtle)'

export default function PipelineJourney({
  stages,
  activeKey,
  myRole,
  onStageClick,
}: {
  stages: StageStatus[]
  activeKey?: StageKey
  myRole: PlatformRole
  onStageClick?: (stage: StageStatus) => void
}) {
  const navigate = useNavigate()
  const go = (s: StageStatus) => { if (onStageClick) onStageClick(s); else navigate(s.stage.route) }

  const myStageIdx = stages.findIndex(s => s.stage.owners.includes(myRole))
  const activeIdx = Math.max(0, stages.findIndex(s => s.stage.key === activeKey))
  const completedIdx = stages.findIndex(s => s.state !== 'done')
  const lastDone = completedIdx === -1 ? stages.length - 1 : Math.max(0, completedIdx - 1)

  return (
    <div className="surface-paper p-5 md:p-6">
      {/* header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-[5px] h-[5px] rounded-full" style={{ background: BRAND }} />
            <span className="text-[10.5px] uppercase tracking-[0.18em] font-semibold text-[var(--text-tertiary)]">Pipeline</span>
          </div>
          <span className="h-3 w-px bg-[var(--border-default)]" />
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)] tracking-[-0.005em] truncate">
            Plant → Report · six stages
          </h3>
        </div>
        {myStageIdx >= 0 && (
          <div className="inline-flex items-center gap-2 text-[11.5px] text-[var(--text-tertiary)]">
            <span>You work at</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {String(myStageIdx + 1).padStart(2, '0')} · {stages[myStageIdx].stage.label}
            </span>
          </div>
        )}
      </div>

      {/* stepper — thin, precise */}
      <div className="relative">
        {/* base track */}
        <div className="absolute left-0 right-0 top-[13px] h-px bg-[var(--border-default)]" aria-hidden />
        {/* fill */}
        <motion.div
          aria-hidden
          className="absolute left-0 top-[13px] h-px"
          style={{ background: BRAND }}
          initial={{ width: 0 }}
          animate={{ width: `${(lastDone / Math.max(1, stages.length - 1)) * 100}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />

        <div className="relative grid grid-cols-6">
          {stages.map((s, i) => {
            const Icon = STAGE_ICONS[s.stage.key]
            const isMe = s.stage.owners.includes(myRole)
            const isActive = s.stage.key === activeKey || i === activeIdx
            const isDone = s.state === 'done'
            const isLeft = i === 0
            const isRight = i === stages.length - 1

            return (
              <button
                key={s.stage.key}
                type="button"
                onClick={() => go(s)}
                className="group relative flex flex-col items-center text-center px-2"
                style={{ alignItems: isLeft ? 'flex-start' : isRight ? 'flex-end' : 'center' }}
              >
                {/* node */}
                <div
                  className="relative w-7 h-7 rounded-full flex items-center justify-center bg-[var(--bg-primary)] transition-all"
                  style={{
                    border: isDone
                      ? `1.5px solid ${BRAND}`
                      : isActive
                        ? `1.5px solid ${BRAND}`
                        : '1.5px solid var(--border-strong)',
                    background: isDone ? BRAND : isActive ? 'var(--bg-primary)' : 'var(--bg-primary)',
                    boxShadow: isActive && !isDone ? `0 0 0 4px ${BRAND_SOFT}` : 'none',
                  }}
                >
                  {isDone ? (
                    <Check className="w-[13px] h-[13px] text-white" strokeWidth={2.5} />
                  ) : (
                    <Icon
                      className="w-[13px] h-[13px]"
                      style={{ color: isActive ? BRAND : 'var(--text-quaternary)' }}
                      strokeWidth={2}
                    />
                  )}
                </div>

                {/* index + label */}
                <div className="mt-3 w-full max-w-[140px] px-0.5" style={{ textAlign: isLeft ? 'left' : isRight ? 'right' : 'center' }}>
                  <div className="flex items-center gap-1.5" style={{ justifyContent: isLeft ? 'flex-start' : isRight ? 'flex-end' : 'center' }}>
                    <span className="font-mono text-[9.5px] text-[var(--text-quaternary)] tabular-nums tracking-[0.05em]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className={`text-[12px] font-semibold tracking-[-0.005em] ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      {s.stage.label}
                    </span>
                  </div>
                  <div className="text-[10.5px] text-[var(--text-tertiary)] mt-0.5 truncate">
                    {shortOwnerLabel(s.stage.owners)}
                  </div>
                  <div className="text-[10.5px] text-[var(--text-secondary)] mt-1 leading-snug line-clamp-2 min-h-[26px]">
                    {s.headline}
                  </div>

                  {/* subtle "you" underline */}
                  {isMe && (
                    <motion.div
                      layoutId="you-marker"
                      className="mt-2 mx-auto h-[2px] rounded-full"
                      style={{ background: BRAND, width: 28 }}
                    />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* role note */}
      <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between gap-4 text-[11px] text-[var(--text-tertiary)]">
        <div className="flex items-center gap-4">
          <LegendDot state="done"    label="Complete" />
          <LegendDot state="active"  label="Active" />
          <LegendDot state="waiting" label="Upcoming" />
        </div>
        <div className="text-[11px] text-[var(--text-tertiary)] truncate">
          {ROLE_CATALOG[myRole].name} · {ROLE_CATALOG[myRole].description}
        </div>
      </div>
    </div>
  )
}

function LegendDot({ state, label }: { state: 'done' | 'active' | 'waiting'; label: string }) {
  const dot = state === 'done'
    ? <span className="w-2.5 h-2.5 rounded-full flex items-center justify-center" style={{ background: BRAND }}><Check className="w-2 h-2 text-white" strokeWidth={3} /></span>
    : state === 'active'
      ? <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--bg-primary)', boxShadow: `0 0 0 1.5px ${BRAND}, 0 0 0 3px ${BRAND_SOFT}` }} />
      : <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--bg-primary)', boxShadow: '0 0 0 1.5px var(--border-strong)' }} />
  return <span className="inline-flex items-center gap-1.5">{dot}{label}</span>
}

function shortOwnerLabel(owners: PlatformRole[]): string {
  const short: Record<PlatformRole, string> = {
    platform_admin: 'Admin',
    group_sustainability_officer: 'Group SO',
    subsidiary_lead: 'Subsidiary Lead',
    plant_manager: 'Plant Manager',
    data_contributor: 'Contributor',
    narrative_owner: 'Narrative',
    auditor: 'Auditor',
  }
  return owners.map(o => short[o] ?? o).slice(0, 2).join(' · ')
}

/**
 * NextAction — quiet directive card.
 * Left rail indicator, subtitle, big headline, primary CTA. No stickers.
 */
export function NextAction({
  stage,
  reason,
  cta,
  secondary,
  onPrimary,
  onSecondary,
}: {
  stage: StageStatus | null
  reason: string
  cta: string
  secondary?: string
  onPrimary: () => void
  onSecondary?: () => void
}) {
  const Icon = stage ? STAGE_ICONS[stage.stage.key] : Sparkles
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="surface-paper p-6 md:p-7 relative overflow-hidden"
      >
        {/* left rail accent */}
        <span
          aria-hidden
          className="absolute left-0 top-5 bottom-5 w-[2px] rounded-r-full"
          style={{ background: BRAND }}
        />

        <div className="relative flex items-start justify-between gap-8 flex-wrap">
          <div className="flex items-start gap-4 flex-1 min-w-[300px]">
            <div
              className="w-9 h-9 rounded-[9px] flex items-center justify-center flex-shrink-0"
              style={{ background: BRAND_SOFT, color: BRAND }}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.16em] font-semibold text-[var(--text-tertiary)]">
                <span>Do this next</span>
                {stage && <span className="text-[var(--text-quaternary)]">·</span>}
                {stage && <span>{stage.stage.label}</span>}
              </div>
              <h3 className="font-display text-[20px] md:text-[22px] text-[var(--text-primary)] leading-[1.2] tracking-[-0.015em] mt-1.5 max-w-2xl">
                {reason}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {secondary && onSecondary && (
              <button
                type="button"
                onClick={onSecondary}
                className="inline-flex items-center h-9 px-3 rounded-[8px] text-[12.5px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                {secondary}
              </button>
            )}
            <button
              type="button"
              onClick={onPrimary}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] text-white text-[12.5px] font-semibold transition-all active:translate-y-[0.5px]"
              style={{
                background: BRAND,
                boxShadow: '0 1px 2px rgba(11,18,32,0.08), inset 0 1px 0 rgba(255,255,255,0.18)',
              }}
            >
              {cta}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
