import { useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { FRAMEWORKS } from '../../lib/frameworks'
import { NumberTicker } from '../ui'
import { Reveal } from './motion'

/**
 * FrameworkStrip — replaces the old placeholder logo cloud (which listed
 * invented "customers"). Nothing here is a claim about who uses Nexus: it is
 * the catalogue of frameworks the product ships, read from lib/frameworks,
 * with counts computed from the same data.
 */
export const FRAMEWORK_COUNT = FRAMEWORKS.filter((f) => f.status === 'active').length
export const DISCLOSURE_ITEM_COUNT = FRAMEWORKS.reduce((n, f) => n + (f.questionCount ?? 0), 0)

type Chip = { code: string; meta: string; cn?: boolean }

function buildChips(isZh: boolean): Chip[] {
  const out: Chip[] = []
  let esrsAdded = false
  for (const f of FRAMEWORKS) {
    if (f.status !== 'active') continue
    if (f.id.startsWith('csrd-')) {
      if (!esrsAdded) { out.push({ code: 'ESRS', meta: 'E1–E5 · S1–S4 · G1' }); esrsAdded = true }
      continue
    }
    const cn = ['cn-sse', 'cn-csds', 'hkex-esg', 'cass-esg'].includes(f.id)
    out.push({ code: f.code, meta: isZh && f.nameZh ? f.nameZh : f.version, cn })
  }
  return out
}

function Row({ chips, reverse, paused }: { chips: Chip[]; reverse?: boolean; paused: boolean }) {
  const reduce = useReducedMotion()
  const items = [...chips, ...chips]
  const content = items.map((c, i) => (
    <li
      key={`${c.code}-${i}`}
      aria-hidden={i >= chips.length ? true : undefined}
      className="flex-shrink-0 flex items-baseline gap-2.5 h-14 px-5 rounded-[14px] whitespace-nowrap"
      style={{
        background: 'var(--bg-primary)',
        border: `1px solid ${c.cn ? 'var(--status-success-line)' : 'var(--border-default)'}`,
        boxShadow: 'var(--shadow-card)',
        alignItems: 'center',
      }}
    >
      <span className="type-h3" style={{ color: 'var(--text-primary)' }}>{c.code}</span>
      <span className="type-caption max-w-[240px] truncate" style={{ color: 'var(--text-tertiary)' }}>{c.meta}</span>
    </li>
  ))
  if (reduce) {
    return <ul className="flex flex-wrap justify-center gap-2.5 px-4">{content.slice(0, chips.length)}</ul>
  }
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <ul
        className="flex gap-2.5 w-max"
        style={{
          animation: 'nx-marquee 80s linear infinite',
          animationDirection: reverse ? 'reverse' : 'normal',
          animationPlayState: paused ? 'paused' : 'running',
        }}
      >
        {content}
      </ul>
    </div>
  )
}

export default function FrameworkStrip() {
  const { t, i18n } = useTranslation()
  const isZh = !!i18n.language?.startsWith('zh')
  const chips = buildChips(isZh)
  const half = Math.ceil(chips.length / 2)
  const [paused, setPaused] = useState(false)

  return (
    <section className="py-20 sm:py-28" aria-labelledby="fw-strip-title">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8">
        <Reveal className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[1.2fr_1fr] gap-8 lg:gap-16 items-end">
          <div>
            <h2 id="fw-strip-title" className="type-display max-w-[640px]" style={{ color: 'var(--text-primary)', textWrap: 'balance' }}>
              {t('landing.frameworks.heading')}
            </h2>
            <p className="mt-4 text-[16px] leading-[1.65] max-w-[560px]" style={{ color: 'var(--text-secondary)' }}>
              {t('landing.frameworks.lead')}
            </p>
          </div>
          <dl className="grid grid-cols-3" style={{ borderTop: '1px solid var(--border-default)' }}>
            {[
              { v: FRAMEWORK_COUNT, label: t('landing.frameworks.stat.frameworks') },
              { v: DISCLOSURE_ITEM_COUNT, label: t('landing.frameworks.stat.items') },
              { v: 2, label: t('landing.frameworks.stat.languages') },
            ].map((s, i) => (
              <div key={s.label} className="pt-4 flex flex-col-reverse" style={{ paddingLeft: i ? 16 : 0, borderLeft: i ? '1px solid var(--border-subtle)' : 'none' }}>
                <dt className="mt-1.5 type-caption" style={{ color: 'var(--text-tertiary)' }}>{s.label}</dt>
                <dd className="type-figure text-[32px] sm:text-[40px] leading-none" style={{ color: 'var(--text-primary)' }}>
                  <NumberTicker value={s.v} />
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>

      <style>{'@keyframes nx-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}'}</style>
      <div
        className="mt-12 space-y-2.5"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        aria-label={t('landing.frameworks.listAria')}
        role="region"
      >
        <Row chips={chips.slice(0, half)} paused={paused} />
        <Row chips={chips.slice(half)} reverse paused={paused} />
      </div>
      <p className="mt-6 text-center type-caption px-4" style={{ color: 'var(--text-tertiary)' }}>
        {t('landing.frameworks.note')}
      </p>
    </section>
  )
}
