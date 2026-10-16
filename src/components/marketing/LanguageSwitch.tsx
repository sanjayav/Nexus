import { motion } from 'framer-motion'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { spring } from '../../motion/tokens'

/**
 * LanguageSwitch — segmented EN / 中文 control for public surfaces (marketing
 * header, sign-in). The active pill slides with a shared layout id. Persisted
 * by i18next's detector (localStorage `aeiforo_lng`), same as the in-app
 * TopBar switcher.
 *
 * `tone="ink"` renders on the dark ink surfaces (login hero / mobile drawer).
 */
const LANGS = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'zh', label: '中文', name: '简体中文' },
] as const

export default function LanguageSwitch({ className = '', size = 'md' }: { className?: string; size?: 'sm' | 'md' }) {
  const { t, i18n } = useTranslation()
  const pillId = useId()
  const current = i18n.language?.startsWith('zh') ? 'zh' : 'en'
  const h = size === 'sm' ? 'h-8' : 'h-9'

  return (
    <div
      role="group"
      aria-label={t('marketing.language.label')}
      className={`relative inline-flex items-center rounded-full p-0.5 ${className}`}
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
    >
      {LANGS.map((l) => {
        const active = current === l.code
        return (
          <button
            key={l.code}
            type="button"
            lang={l.code === 'zh' ? 'zh-CN' : 'en'}
            aria-pressed={active}
            title={l.name}
            onClick={() => { if (!active) void i18n.changeLanguage(l.code) }}
            className={`relative ${h} min-w-[44px] px-3 rounded-full text-[13px] font-medium transition-colors`}
            style={{ color: active ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
          >
            {active && (
              <motion.span
                layoutId={`lang-pill-${pillId}`}
                className="absolute inset-0 rounded-full"
                style={{ background: 'var(--bg-primary)', boxShadow: 'var(--shadow-card), 0 0 0 1px var(--border-default)' }}
                transition={spring.snappy}
                aria-hidden
              />
            )}
            <span className="relative">{l.label}</span>
          </button>
        )
      })}
    </div>
  )
}
