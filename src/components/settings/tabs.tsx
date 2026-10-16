import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Bell, BookMarked, Building2, Globe2, Languages, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react'
import { spring } from '../../motion/tokens'

export const SETTINGS_TABS = ['organisation', 'market', 'frameworks', 'notifications', 'ai', 'security', 'language'] as const
export type SettingsTab = (typeof SETTINGS_TABS)[number]

export const TAB_ICON: Record<SettingsTab, LucideIcon> = {
  organisation: Building2,
  market: Globe2,
  frameworks: BookMarked,
  notifications: Bell,
  ai: Sparkles,
  security: ShieldCheck,
  language: Languages,
}

export function isSettingsTab(v: string | null): v is SettingsTab {
  return !!v && (SETTINGS_TABS as readonly string[]).includes(v)
}

/**
 * Sticky tab bar with a sliding underline (shared layoutId, snappy spring).
 * Scrolls horizontally on narrow screens and keeps the active tab in view.
 * Arrow keys / Home / End move focus and selection (WAI-ARIA tabs pattern).
 */
export function SettingsTabBar({
  value,
  onChange,
  badges = {},
}: {
  value: SettingsTab
  onChange: (tab: SettingsTab) => void
  /** Small dot on a tab that needs attention (e.g. 2FA off). */
  badges?: Partial<Record<SettingsTab, 'warning' | 'danger'>>
}) {
  const { t } = useTranslation()
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-tab="${value}"]`)
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [value])

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = SETTINGS_TABS.indexOf(value)
    let next: SettingsTab | null = null
    if (e.key === 'ArrowRight') next = SETTINGS_TABS[(i + 1) % SETTINGS_TABS.length]
    else if (e.key === 'ArrowLeft') next = SETTINGS_TABS[(i - 1 + SETTINGS_TABS.length) % SETTINGS_TABS.length]
    else if (e.key === 'Home') next = SETTINGS_TABS[0]
    else if (e.key === 'End') next = SETTINGS_TABS[SETTINGS_TABS.length - 1]
    if (!next) return
    e.preventDefault()
    onChange(next)
    listRef.current?.querySelector<HTMLElement>(`[data-tab="${next}"]`)?.focus()
  }

  return (
    <div className="sticky top-0 z-20 bg-[var(--bg-app)]">
      <div
        ref={listRef}
        role="tablist"
        aria-label={t('settings.tabs.aria')}
        onKeyDown={onKeyDown}
        className="relative flex gap-1 overflow-x-auto border-b border-[var(--border-default)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SETTINGS_TABS.map((tab) => {
          const on = tab === value
          const Icon = TAB_ICON[tab]
          const badge = badges[tab]
          return (
            <button
              key={tab}
              id={`settings-tab-${tab}`}
              data-tab={tab}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`settings-panel-${tab}`}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(tab)}
              className={`relative flex h-12 flex-shrink-0 items-center gap-2 px-3 text-small font-medium whitespace-nowrap transition-colors duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand)] rounded-t-[var(--radius-sm)]
                ${on ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
            >
              <Icon className={`h-4 w-4 ${on ? 'text-[var(--color-brand)]' : ''}`} aria-hidden />
              {t(`settings.tabs.${tab}`)}
              {badge && (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: badge === 'danger' ? 'var(--status-danger)' : 'var(--status-warning)' }}
                  aria-label={t('settings.tabs.attention')}
                />
              )}
              {on && (
                <motion.span
                  layoutId="settings-tab-indicator"
                  transition={spring.snappy}
                  aria-hidden
                  className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-[var(--color-brand)]"
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
