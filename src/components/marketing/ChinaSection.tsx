import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { Landmark, Factory, Languages, BellRing, Cpu, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ContourField } from '../ui'
import { RevealGroup, RevealItem, Reveal } from './motion'
import { dur, ease, spring } from '../../motion/tokens'

/**
 * ChinaSection — "China-ready" positioning on the ink surface.
 *
 * Every line maps to something that exists in the codebase today: the China
 * framework packs (lib/frameworks: cn-sse, cn-csds, hkex-esg, cass-esg), MEE /
 * GB/T emission factors (api/_efCnFactors), Chinese PDF / Word / iXBRL report
 * output (api/_reportI18n, _reportFonts), DingTalk / Feishu / WeCom group-bot
 * notifications (api/_notifyChannels) and the per-org mainland AI provider
 * (api/_llm). No hosting, certification or customer claims.
 */
const POINTS = [
  { id: 'frameworks', icon: Landmark },
  { id: 'factors', icon: Factory },
  { id: 'reports', icon: FileText },
  { id: 'bilingual', icon: Languages },
  { id: 'im', icon: BellRing },
  { id: 'ai', icon: Cpu },
] as const

type Lang = 'en' | 'zh'

const REPORT: Record<Lang, { title: string; org: string; section: string; rows: [string, string][]; index: string[]; foot: string }> = {
  en: {
    title: 'Sustainability Report 2026',
    org: 'Sample Holdings Group',
    section: 'Climate · Greenhouse gas emissions',
    rows: [['Scope 1', '19,373'], ['Scope 2 (location-based)', '28,410'], ['Scope 3', '96,820']],
    index: ['SSE', 'CSDS', 'HKEX ESG', 'GRI 305'],
    foot: 'tCO₂e · Grid factor: MEE 2023 national average',
  },
  zh: {
    title: '2026 年可持续发展报告',
    org: '示例控股集团',
    section: '应对气候变化 · 温室气体排放',
    rows: [['范围一', '19,373'], ['范围二（基于位置）', '28,410'], ['范围三', '96,820']],
    index: ['SSE', 'CSDS', 'HKEX ESG', 'GRI 305'],
    foot: 'tCO₂e · 电网因子：生态环境部 2023 年全国平均',
  },
}

function BilingualPreview() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.5 })
  const [lang, setLang] = useState<Lang>('zh')
  const [auto, setAuto] = useState(true)

  useEffect(() => {
    if (!auto || reduce || !inView) return
    const id = window.setTimeout(() => setLang((l) => (l === 'en' ? 'zh' : 'en')), 3400)
    return () => window.clearTimeout(id)
  }, [lang, auto, inView, reduce])

  const r = REPORT[lang]

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="type-small" style={{ color: 'var(--sidebar-fg-muted)' }}>{t('landing.china.preview.label')}</span>
        <div
          role="group"
          aria-label={t('landing.china.preview.toggle')}
          className="relative inline-flex p-0.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--sidebar-divider)' }}
        >
          {(['en', 'zh'] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lang === l}
              onClick={() => { setAuto(false); setLang(l) }}
              className="relative h-9 min-w-[52px] px-3 rounded-full text-[13px] font-medium"
              style={{ color: lang === l ? 'var(--bg-inverse)' : 'var(--sidebar-fg-muted)' }}
            >
              {lang === l && (
                <motion.span layoutId="cn-preview-pill" className="absolute inset-0 rounded-full" style={{ background: 'var(--sidebar-accent)' }} transition={spring.snappy} aria-hidden />
              )}
              <span className="relative">{l === 'en' ? 'EN' : '中文'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* The report page */}
      <div
        className="relative rounded-[14px] overflow-hidden"
        style={{ background: '#FBFCFB', color: '#0C1714', boxShadow: '0 24px 60px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)' }}
        aria-live="polite"
      >
        <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #047857, #34D399)' }} aria-hidden />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={lang}
            lang={lang === 'zh' ? 'zh-CN' : 'en'}
            className="p-6 sm:p-8"
            initial={reduce ? false : { opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(4px)' }}
            transition={{ duration: dur.base, ease: ease.out }}
          >
            <p className="type-caption" style={{ color: '#66716D' }}>{r.org}</p>
            <p className="mt-1 text-[22px] sm:text-[26px] font-semibold leading-tight tracking-[-0.01em]">{r.title}</p>
            <div className="mt-6 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full" style={{ background: '#047857' }} aria-hidden />
              <p className="type-small font-semibold">{r.section}</p>
            </div>
            <table className="mt-3 w-full type-small">
              <tbody>
                {r.rows.map(([k, v], i) => (
                  <tr key={k} style={{ borderTop: '1px solid rgba(12,23,20,0.08)' }}>
                    <td className="py-2.5 pr-3" style={{ color: '#3E4B47' }}>{k}</td>
                    <td className="py-2.5 text-right tabular-nums font-medium">
                      <span>{v}</span>
                      <span className="ml-2 inline-block h-1.5 rounded-full align-middle" style={{ width: [28, 40, 72][i], background: ['#065F46', '#10B981', '#6EE7B7'][i] }} aria-hidden />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 type-caption" style={{ color: '#66716D' }}>{r.foot}</p>
            <div className="mt-5 pt-4 flex flex-wrap gap-1.5" style={{ borderTop: '1px solid rgba(12,23,20,0.08)' }}>
              {r.index.map((c) => (
                <span key={c} className="inline-flex items-center h-6 px-2 rounded-md type-caption font-medium whitespace-nowrap" style={{ background: '#ECFDF5', color: '#065F46' }}>{c}</span>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="mt-3 type-caption" style={{ color: 'var(--sidebar-fg-subtle)' }}>{t('landing.china.preview.note')}</p>
    </div>
  )
}

export default function ChinaSection() {
  const { t } = useTranslation()
  return (
    <section
      id="china"
      aria-labelledby="china-title"
      className="relative overflow-hidden isolate"
      style={{ background: 'var(--bg-inverse)', color: 'var(--sidebar-fg)', borderBlock: '1px solid var(--sidebar-edge)' }}
    >
      <ContourField className="absolute inset-0 w-full h-full -z-10 !text-[color:var(--accent-400)] !opacity-[0.22]" anchor="bottom-left" rings={20} seed={21} />
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-20 sm:py-28 grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-20 items-center">
        <div>
          <Reveal>
            <p className="text-[14px] font-medium mb-4" style={{ color: 'var(--sidebar-accent)' }}>{t('landing.china.kicker')}</p>
            <h2 id="china-title" className="type-display max-w-[620px]" style={{ color: 'var(--sidebar-fg)', textWrap: 'balance' }}>
              {t('landing.china.heading')}
            </h2>
            <p className="mt-5 text-[16px] leading-[1.7] max-w-[560px]" style={{ color: 'var(--sidebar-fg-muted)' }}>
              {t('landing.china.lead')}
            </p>
          </Reveal>
          <RevealGroup as="ul" className="mt-10 grid sm:grid-cols-2 gap-x-8 gap-y-6">
            {POINTS.map(({ id, icon: Icon }) => (
              <RevealItem as="li" key={id} className="flex gap-3.5">
                <span
                  className="w-9 h-9 flex-shrink-0 rounded-[10px] inline-flex items-center justify-center"
                  style={{ background: 'var(--sidebar-active-bg)', color: 'var(--sidebar-accent)', boxShadow: 'inset 0 0 0 1px var(--sidebar-edge)' }}
                  aria-hidden
                >
                  <Icon className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="type-h3" style={{ color: 'var(--sidebar-fg)' }}>{t(`landing.china.points.${id}.title`)}</h3>
                  <p className="mt-1 type-small" style={{ color: 'var(--sidebar-fg-muted)' }}>{t(`landing.china.points.${id}.body`)}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
        <Reveal delay={0.1}>
          <BilingualPreview />
        </Reveal>
      </div>
    </section>
  )
}
