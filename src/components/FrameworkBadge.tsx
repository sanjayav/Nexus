import { useState } from 'react'
import { ChevronDown, Check, Clock, BookMarked } from 'lucide-react'
import { FRAMEWORKS, useFramework, type Framework } from '../lib/frameworks'

/**
 * Inline chip showing the currently-active framework. Phase 1: locked to
 * GRI 305, but still rendered as a chip everywhere to signal that the
 * product is multi-framework and other standards are queued.
 */
export function FrameworkBadge({
  size = 'sm', tone = 'soft',
}: {
  size?: 'sm' | 'md'
  tone?: 'soft' | 'solid' | 'outline'
}) {
  const { active } = useFramework()
  const cls =
    tone === 'solid'
      ? `bg-[${active.color}] text-white`
      : tone === 'outline'
        ? 'border border-[var(--border-default)] text-[var(--text-primary)] bg-[var(--bg-primary)]'
        : 'bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]'
  const pad = size === 'md' ? 'px-2.5 py-1 text-[11px]' : 'px-2 py-0.5 text-[10px]'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] font-semibold uppercase tracking-wider ${pad} ${cls}`}>
      <BookMarked className={size === 'md' ? 'w-3 h-3' : 'w-2.5 h-2.5'} style={{ color: tone === 'solid' ? '#fff' : active.color }} />
      {active.code}
      <span className="font-normal normal-case tracking-normal opacity-70">{active.version}</span>
    </span>
  )
}

/**
 * Dropdown for switching between enabled frameworks. In Phase 1 only GRI is
 * active; every other row is shown greyed out with a "soon" tag so the user
 * sees the roadmap and the admin knows what's coming.
 */
export function FrameworkSelector({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const { active, setActive, enabled } = useFramework()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] transition-colors ${
          size === 'md' ? 'px-3 py-1.5 text-[var(--text-xs)]' : 'px-2.5 py-1 text-[11px]'
        }`}
      >
        <BookMarked className="w-3.5 h-3.5" style={{ color: active.color }} />
        <span className="font-semibold text-[var(--text-primary)]">{active.code}</span>
        <span className="text-[var(--text-tertiary)]">·</span>
        <span className="text-[var(--text-secondary)] font-medium truncate max-w-[160px]">{active.name.replace(active.code + ': ', '')}</span>
        <ChevronDown className="w-3 h-3 text-[var(--text-tertiary)]" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1.5 w-[380px] rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] shadow-lg z-50 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">Reporting framework</span>
              <span className="text-[10px] text-[var(--text-tertiary)]">Phase 1 · GRI only</span>
            </div>
            <ul className="max-h-[400px] overflow-y-auto py-1">
              {FRAMEWORKS.map(f => {
                const isEnabled = enabled.includes(f.id)
                const canPick = f.status === 'active' && isEnabled
                return (
                  <FrameworkRow
                    key={f.id}
                    framework={f}
                    active={f.id === active.id}
                    enabled={isEnabled}
                    canPick={canPick}
                    onPick={() => {
                      if (canPick) {
                        setActive(f.id)
                        setOpen(false)
                      }
                    }}
                  />
                )
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

function FrameworkRow({
  framework, active, enabled, canPick, onPick,
}: {
  framework: Framework
  active: boolean
  enabled: boolean
  canPick: boolean
  onPick: () => void
}) {
  const locked = !canPick
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        disabled={locked}
        className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors ${
          active ? 'bg-[var(--color-brand-soft)]/70' : locked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--bg-secondary)]'
        }`}
      >
        <span
          className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
          style={{ background: framework.color }}
        >
          {framework.code.split(' ')[0].slice(0, 3)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--text-xs)] font-semibold text-[var(--text-primary)]">{framework.name}</span>
            {framework.status === 'active' && enabled && (
              <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--status-ok)] bg-[var(--accent-green-light)] px-1.5 py-0.5 rounded">On</span>
            )}
            {framework.status === 'active' && !enabled && (
              <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">Off</span>
            )}
            {framework.status === 'coming_soon' && (
              <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--status-pending)] bg-[var(--accent-blue-light)] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
                <Clock className="w-2 h-2" /> Soon
              </span>
            )}
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 line-clamp-2">{framework.description}</p>
          <div className="flex items-center gap-1 mt-1 text-[9px] text-[var(--text-tertiary)]">
            <span>{framework.body}</span>
            <span>·</span>
            <span>v{framework.version}</span>
            {framework.questionCount != null && <><span>·</span><span>{framework.questionCount} items</span></>}
          </div>
        </div>
        {active && <Check className="w-4 h-4 text-[var(--color-brand)] flex-shrink-0 mt-0.5" />}
      </button>
    </li>
  )
}
