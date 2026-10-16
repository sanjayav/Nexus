import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { FRAMEWORKS, useFramework, type Framework } from '../../lib/frameworks'
import { StatusPill, notify } from '../ui'
import { transition } from '../../motion/tokens'
import { Switch } from './primitives'

type Region = 'all' | 'global' | 'eu' | 'us' | 'cn'

const REGION_OF: Record<string, Exclude<Region, 'all'>> = {
  gri: 'global', 'issb-s1': 'global', 'issb-s2': 'global', tcfd: 'global', 'cdp-2024': 'global',
  'eu-taxonomy': 'eu', 'sec-climate': 'us', 'ca-sb253': 'us', 'ca-sb261': 'us',
  'cn-sse': 'cn', 'cn-csds': 'cn', 'hkex-esg': 'cn', 'cass-esg': 'cn',
}
const regionOf = (f: Framework): Exclude<Region, 'all'> => REGION_OF[f.id] ?? (f.id.startsWith('csrd') ? 'eu' : 'global')

function zhField(f: Framework, field: 'name' | 'body' | 'description', zh: boolean): string {
  if (zh) {
    const v = f[`${field}Zh` as 'nameZh' | 'bodyZh' | 'descriptionZh']
    if (v) return v
  }
  return f[field]
}

export default function FrameworksSettings() {
  const { t, i18n } = useTranslation()
  const zh = i18n.language?.startsWith('zh') ?? false
  const { active, enabled, setEnabled } = useFramework()
  const [region, setRegion] = useState<Region>('all')

  const counts = useMemo(() => {
    const c: Record<Region, number> = { all: FRAMEWORKS.length, global: 0, eu: 0, us: 0, cn: 0 }
    for (const f of FRAMEWORKS) c[regionOf(f)]++
    return c
  }, [])
  const list = FRAMEWORKS.filter((f) => region === 'all' || regionOf(f) === region)
  const enabledCount = FRAMEWORKS.filter((f) => enabled.includes(f.id)).length

  const toggle = (f: Framework) => {
    if (f.status !== 'active') return
    const on = enabled.includes(f.id)
    if (on) {
      if (enabled.length === 1) {
        notify.info(t('settings.frameworks.keepOne'))
        return
      }
      const prev = enabled
      setEnabled(enabled.filter((x) => x !== f.id))
      notify.success(t('settings.frameworks.turnedOff', { name: zhField(f, 'name', zh) }), { undo: () => setEnabled(prev) })
    } else {
      setEnabled([...enabled, f.id])
    }
  }

  const cover = (c: string) => t(`settings.frameworks.coverage.${c}`, { defaultValue: c })
  const version = (v: string) => t(`settings.frameworks.versions.${v}`, { defaultValue: v })

  return (
    <div className="pt-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="type-h3 text-[var(--text-primary)]">{t('settings.frameworks.heading')}</h2>
          <p className="mt-1 max-w-[64ch] text-small text-[var(--text-secondary)]">
            {t('settings.frameworks.intro', { name: zhField(active, 'name', zh) })}
          </p>
        </div>
        <p className="text-small text-[var(--text-secondary)] whitespace-nowrap">
          {t('settings.frameworks.enabledCount', { count: enabledCount, total: FRAMEWORKS.length })}
        </p>
      </div>

      <div role="group" aria-label={t('settings.frameworks.regionAria')} className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {(['all', 'global', 'eu', 'us', 'cn'] as const).map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={region === r}
            onClick={() => setRegion(r)}
            className={`chip h-9 flex-shrink-0 px-3 text-small focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] ${region === r ? 'chip-active' : ''}`}
          >
            {t(`settings.frameworks.regions.${r}`)}
            <span className="tabular-nums text-[var(--text-tertiary)]">{counts[r]}</span>
          </button>
        ))}
      </div>

      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        <AnimatePresence initial={false} mode="popLayout">
          {list.map((f) => {
            const on = enabled.includes(f.id)
            const isActive = f.id === active.id
            const locked = f.status !== 'active'
            const name = zhField(f, 'name', zh)
            return (
              <motion.li
                key={f.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={transition.fast}
                className={`surface-paper flex gap-3 p-4 transition-colors ${on ? 'border-[var(--status-success-line)]' : ''} ${locked ? 'bg-[var(--bg-secondary)]' : ''}`}
              >
                <span
                  aria-hidden
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] text-caption font-semibold tracking-tight
                    ${on ? 'bg-[var(--bg-inverse)] text-[var(--sidebar-accent)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'}`}
                >
                  {f.code.split(' ')[0].slice(0, 4)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-small font-semibold leading-5 text-[var(--text-primary)]">{name}</h3>
                      <div className="mt-0.5 text-caption text-[var(--text-tertiary)]">
                        {zhField(f, 'body', zh)} · {zh && f.versionZh ? f.versionZh : version(f.version)}
                        {f.questionCount != null && ` · ${t('settings.frameworks.lineItems', { count: f.questionCount })}`}
                      </div>
                    </div>
                    {locked ? (
                      <StatusPill tone="neutral" size="sm">{t('settings.frameworks.comingSoon')}</StatusPill>
                    ) : (
                      <Switch checked={on} onChange={() => toggle(f)} label={t('settings.frameworks.toggleAria', { name })} />
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-caption text-[var(--text-secondary)]">{zhField(f, 'description', zh)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {isActive && <StatusPill tone="brand" size="sm">{t('settings.frameworks.currentlyActive')}</StatusPill>}
                    {f.coverage.slice(0, 4).map((c) => (
                      <span key={c} className="rounded-[var(--radius-xs)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-caption text-[var(--text-tertiary)] whitespace-nowrap">
                        {cover(c)}
                      </span>
                    ))}
                    {f.coverage.length > 4 && <span className="text-caption text-[var(--text-tertiary)]">+{f.coverage.length - 4}</span>}
                  </div>
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </div>
  )
}
