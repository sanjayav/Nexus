import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ContourField, NumberTicker } from '../ui'
import { FRAMEWORKS } from '../../lib/frameworks'
import { SplineScene } from '../SplineScene'
import { useHeroScene } from './useHeroScene'

/**
 * AuthHero — the ink panel beside the sign-in form (desktop only).
 *
 * The static layer is the product's contour motif drawing in, plus three
 * catalogue facts that roll in with NumberTicker. It is complete on its own:
 * this is what phones, Chinese-language visitors and mainland time zones get.
 * On eligible desktops the scene host is probed after the page is idle; only
 * if it answers within 3.5 s is the Spline runtime fetched, and the scene
 * fades in over the contours. If anything fails or is blocked, nothing changes.
 */
const SCENE_URL = 'https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode'

const FRAMEWORK_COUNT = FRAMEWORKS.filter((f) => f.status === 'active').length
const ITEM_COUNT = FRAMEWORKS.reduce((n, f) => n + (f.questionCount ?? 0), 0)
const CODES = ['GRI', 'ESRS', 'ISSB', 'TCFD', 'CDP', 'SSE', 'CSDS', 'HKEX ESG', 'CASS-ESG']

export default function AuthHero() {
  const { t, i18n } = useTranslation()
  const showScene = useHeroScene(i18n.language ?? 'en')
  const [sceneReady, setSceneReady] = useState(false)
  // Probe the scene host before pulling ~1.5 MB of runtime: a blocked or slow
  // host (mainland networks, corporate proxies) keeps the static artwork.
  const [reachable, setReachable] = useState(false)
  useEffect(() => {
    if (!showScene || reachable) return
    const ctrl = new AbortController()
    const timer = window.setTimeout(() => ctrl.abort(), 3500)
    fetch(SCENE_URL, { method: 'HEAD', mode: 'no-cors', signal: ctrl.signal })
      .then(() => setReachable(true))
      .catch(() => { /* blocked or slow — stay static */ })
      .finally(() => window.clearTimeout(timer))
    return () => { ctrl.abort(); window.clearTimeout(timer) }
  }, [showScene, reachable])

  const facts = [
    { value: FRAMEWORK_COUNT, label: t('auth.hero.facts.frameworks') },
    { value: ITEM_COUNT, label: t('auth.hero.facts.items') },
    { value: 2, label: t('auth.hero.facts.languages') },
  ]

  return (
    <aside
      className="relative hidden lg:flex flex-col justify-between overflow-hidden rounded-[20px] isolate lg:sticky lg:top-4 lg:self-start lg:h-[calc(100dvh-2rem)] lg:min-h-[600px]"
      style={{
        background: 'radial-gradient(120% 80% at 100% 0%, rgba(16,185,129,0.16), transparent 55%), var(--bg-inverse)',
        color: 'var(--sidebar-fg)',
        boxShadow: 'var(--shadow-raised), inset 0 0 0 1px var(--sidebar-edge)',
      }}
      aria-label={t('auth.hero.aria')}
    >
      {/* Static artwork — always present */}
      <ContourField
        className="absolute inset-0 w-full h-full -z-10 !text-[color:var(--accent-400)] !opacity-40"
        anchor="top-right"
        rings={22}
        animate
        seed={7}
      />

      {/* Optional 3D layer — desktop, non-CN, after idle */}
      {showScene && reachable && (
        <div
          className="absolute inset-0 -z-10 transition-opacity duration-700"
          style={{ opacity: sceneReady ? 1 : 0 }}
          aria-hidden
        >
          <SplineScene scene={SCENE_URL} className="w-full h-full" onLoad={() => setSceneReady(true)} />
        </div>
      )}

      {/* Legibility scrim for the copy */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[62%] -z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to top, var(--bg-inverse) 18%, transparent)' }}
      />

      <div className="relative p-10 pb-0 pointer-events-none">
        <p className="text-[13px] font-medium" style={{ color: 'var(--sidebar-accent)' }}>
          {t('auth.hero.kicker')}
        </p>
      </div>

      <div className="relative p-10 pointer-events-none">
        <h2
          className="type-display max-w-[440px]"
          style={{ color: 'var(--sidebar-fg)', textWrap: 'balance' }}
        >
          {t('auth.hero.line1')}<br />{t('auth.hero.line2')}
        </h2>
        <p className="mt-4 max-w-[420px] type-body" style={{ color: 'var(--sidebar-fg-muted)' }}>
          {t('auth.hero.body')}
        </p>

        <dl
          className="mt-8 grid grid-cols-3 max-w-[480px]"
          style={{ borderTop: '1px solid var(--sidebar-divider)' }}
        >
          {facts.map((f, i) => (
            <div
              key={f.label}
              className="pt-4 pr-4 flex flex-col-reverse"
              style={{ borderLeft: i === 0 ? 'none' : '1px solid var(--sidebar-divider)', paddingLeft: i === 0 ? 0 : 16 }}
            >
              <dt className="mt-2 type-caption" style={{ color: 'var(--sidebar-fg-muted)' }}>{f.label}</dt>
              <dd className="type-figure text-[28px] leading-none" style={{ color: 'var(--sidebar-fg)' }}>
                <NumberTicker value={f.value} />
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-8 type-caption tracking-[0.02em]" style={{ color: 'var(--sidebar-fg-subtle)' }}>
          {CODES.join('  ·  ')}
        </p>
      </div>
    </aside>
  )
}
