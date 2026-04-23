import { Check, Palette, Calendar, BookMarked, Clock, Plus } from 'lucide-react'
import { useTheme, type Theme } from '../theme/ThemeContext'
import { FRAMEWORKS, useFramework } from '../lib/frameworks'

interface ThemeOption {
  value: Theme
  label: string
  description: string
  swatches: string[]
}

const THEMES: ThemeOption[] = [
  {
    value: 'pttgc-flat',
    label: 'PTTGC Flat',
    description: 'Default. Teal brand, 8px grid, flat surfaces, WCAG 2.1 AA.',
    swatches: ['#1B6B7B', '#D5E8F0', '#2E7D32', '#E6A817', '#C62828'],
  },
  {
    value: 'glass',
    label: 'Glass UI',
    description: 'Aeiforo legacy. Soft shadows, blurred surfaces, rounded corners.',
    swatches: ['#0F7B6F', '#E6F5F0', '#16A34A', '#D97706', '#DC2626'],
  },
]

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const { active: activeFw, enabled, setEnabled } = useFramework()

  const toggleFramework = (id: string) => {
    // Only active (not coming_soon) frameworks can be toggled.
    const fw = FRAMEWORKS.find(f => f.id === id)
    if (!fw || fw.status !== 'active') return
    if (enabled.includes(id)) {
      if (enabled.length === 1) return // always keep at least one
      setEnabled(enabled.filter(x => x !== id))
    } else {
      setEnabled([...enabled, id])
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <h1 className="font-display text-[var(--text-3xl)] font-semibold text-[var(--text-primary)] mb-1">
          Settings
        </h1>
        <p className="text-[var(--text-sm)] text-[var(--text-secondary)]">
          Personal preferences for this Nexus workspace. Changes apply instantly and persist per user.
        </p>
      </header>

      {/* ── Frameworks (Phase 1 = GRI, other rows show the roadmap) ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-[var(--text-tertiary)]" />
            <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">
              Reporting frameworks
            </h2>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded">
            Phase 1
          </span>
        </div>
        <p className="text-[var(--text-sm)] text-[var(--text-secondary)]">
          Pick which frameworks this workspace reports against. We're shipping {activeFw.name} first; additional
          frameworks become available as they clear validation.
        </p>

        <ul className="space-y-2 pt-1">
          {FRAMEWORKS.map(f => {
            const on = enabled.includes(f.id)
            const isActive = f.id === activeFw.id
            const locked = f.status !== 'active'
            return (
              <li
                key={f.id}
                className={`rounded-[var(--radius-lg)] border transition-colors ${
                  isActive ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]/50'
                  : locked ? 'border-[var(--border-subtle)] bg-[var(--bg-secondary)]/40'
                  : 'border-[var(--border-default)] bg-[var(--bg-primary)]'
                }`}
              >
                <div className="p-4 flex items-start gap-4">
                  <span
                    className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-white"
                    style={{ background: f.color, opacity: locked ? 0.6 : 1 }}
                  >
                    {f.code.split(' ')[0].slice(0, 3)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{f.name}</h3>
                      {isActive && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--status-ok)] bg-[var(--accent-green-light)] px-1.5 py-0.5 rounded">
                          Currently active
                        </span>
                      )}
                      {f.status === 'coming_soon' && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--status-pending)] bg-[var(--accent-blue-light)] px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Coming soon
                        </span>
                      )}
                    </div>
                    <p className="text-[var(--text-xs)] text-[var(--text-secondary)] mt-1">{f.description}</p>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {f.coverage.map(c => (
                        <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] font-medium">
                          {c}
                        </span>
                      ))}
                    </div>
                    <div className="text-[10px] text-[var(--text-tertiary)] mt-2">
                      {f.body} · v{f.version}
                      {f.questionCount != null && ` · ${f.questionCount} line items`}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {locked ? (
                      <button
                        type="button"
                        disabled
                        className="text-[var(--text-xs)] font-semibold px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] text-[var(--text-tertiary)] cursor-not-allowed inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Request early access
                      </button>
                    ) : (
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleFramework(f.id)}
                          className="sr-only peer"
                        />
                        <span className={`relative w-9 h-5 rounded-full transition-colors ${on ? 'bg-[var(--color-brand)]' : 'bg-[var(--bg-tertiary)]'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-4' : 'left-0.5'}`} />
                        </span>
                        <span className="text-[var(--text-xs)] font-medium text-[var(--text-secondary)]">{on ? 'On' : 'Off'}</span>
                      </label>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-[var(--text-tertiary)]" />
          <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">
            Theme
          </h2>
        </div>
        <p className="text-[var(--text-sm)] text-[var(--text-secondary)]">
          Switch between the PTTGC-configured flat theme and the legacy Aeiforo Glass UI.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {THEMES.map(opt => {
            const active = theme === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={`
                  group relative text-left p-5 rounded-[var(--radius-lg)]
                  border transition-all duration-150
                  ${active
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]'
                    : 'border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)]'
                  }
                `}
                aria-pressed={active}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-display text-[var(--text-base)] font-semibold text-[var(--text-primary)]">
                      {opt.label}
                    </div>
                    <div className="text-[var(--text-xs)] text-[var(--text-secondary)] mt-1">
                      {opt.description}
                    </div>
                  </div>
                  {active && (
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--color-brand)] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {opt.swatches.map(s => (
                    <span
                      key={s}
                      className="w-5 h-5 rounded-[var(--radius-sm)] border border-black/5"
                      style={{ backgroundColor: s }}
                      title={s}
                    />
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--text-tertiary)]" />
          <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">
            Reporting Year
          </h2>
        </div>
        <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[var(--text-sm)] font-medium text-[var(--text-primary)]">Active reporting year</div>
              <div className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-0.5">FY2026 — inherits structure from PTTGC FY2025</div>
            </div>
            <span className="px-2.5 py-1 rounded-[var(--radius-sm)] text-[var(--text-xs)] font-medium bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]">
              FY2026 · Active
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
