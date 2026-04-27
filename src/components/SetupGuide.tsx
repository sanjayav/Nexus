import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check, ArrowRight, Sparkles, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { orgStore, type OrgTarget, type MaterialTopic, type ReportingPeriod } from '../lib/orgStore'
import { useOrgData } from '../lib/useOrgData'
import { useAuth } from '../auth/AuthContext'

/**
 * SetupGuide — the "Getting started" widget you see in Stripe, Linear, Vercel,
 * Google Cloud. Sits at the top of the sidebar when the tenant has setup steps
 * left to complete, dismisses itself when done (or when the user clicks the X).
 *
 * Each step checks real database state; nothing is hard-coded progress.
 */

const DISMISS_KEY = 'aeiforo_setup_dismissed'

interface StepDef {
  key: string
  title: string
  helper: string
  route: string
  check: (ctx: Ctx) => boolean
}

interface Ctx {
  entities: number
  users: number
  materialTopics: number
  targets: number
  periods: number
  assignments: number
  publishedReports: number
}

/**
 * Each step is gated on real DB state — `done` only when the underlying data
 * actually exists. We deliberately omit a "Choose frameworks" step in Phase 1:
 * GRI is auto-enabled and CSRD / TCFD / IFRS are still "Coming soon", so the
 * checkbox would always be pre-ticked and confuse first-time users into
 * thinking they'd already done something.
 */
const STEPS: StepDef[] = [
  { key: 'org_tree',       title: 'Build the org tree',        helper: 'Add your group, subsidiaries, and plants.',               route: '/onboarding',           check: c => c.entities >= 2 },
  { key: 'users',          title: 'Invite your team',           helper: 'Add plant managers, reviewers, officers.',                route: '/admin/users',          check: c => c.users >= 2 },
  { key: 'materiality',    title: 'Run materiality assessment', helper: 'Identify the topics that matter most.',                   route: '/admin/materiality',    check: c => c.materialTopics >= 1 },
  { key: 'targets',        title: 'Set a climate target',       helper: 'Commit to a near-term SBTi or net-zero target.',          route: '/admin/targets',        check: c => c.targets >= 1 },
  { key: 'period',         title: 'Open a reporting cycle',     helper: 'Create the fiscal year you are reporting on.',            route: '/admin/periods',        check: c => c.periods >= 1 },
  { key: 'assign',         title: 'Assign disclosures',         helper: 'Route each GRI line item to the right contributor.',      route: '/admin/assignments',    check: c => c.assignments >= 1 },
  { key: 'publish',        title: 'Publish your first report',  helper: 'Once data is approved, generate the auditor-grade PDF.', route: '/reports',              check: c => c.publishedReports >= 1 },
]

export default function SetupGuide({ collapsed }: { collapsed: boolean }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: orgData } = useOrgData()
  const [targets, setTargets] = useState<OrgTarget[]>([])
  const [topics, setTopics] = useState<MaterialTopic[]>([])
  const [periods, setPeriods] = useState<ReportingPeriod[]>([])
  const [publishedCount, setPublishedCount] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(true)

  // Only platform_admin and group_sustainability_officer see this
  const role = (user?.roles ?? [])[0] ?? ''
  const isSetupOwner = role === 'platform_admin' || role === 'group_sustainability_officer' || role === 'admin'

  useEffect(() => {
    if (!isSetupOwner) return
    const d = localStorage.getItem(DISMISS_KEY)
    if (d === '1') setDismissed(true)
  }, [isSetupOwner])

  useEffect(() => {
    if (!isSetupOwner) return
    let cancelled = false
    Promise.all([
      orgStore.listTargets().catch(() => []),
      orgStore.listMaterialTopics().catch(() => []),
      orgStore.listPeriods().catch(() => []),
      orgStore.listPublishedReports().catch(() => []),
    ]).then(([t, m, p, r]) => {
      if (cancelled) return
      setTargets(t); setTopics(m); setPeriods(p); setPublishedCount(r.length)
    })
    return () => { cancelled = true }
  }, [isSetupOwner])

  const ctx: Ctx = useMemo(() => ({
    entities: orgData?.entities.length ?? 0,
    users: orgData?.members.length ?? 0,
    materialTopics: topics.length,
    targets: targets.length,
    periods: periods.length,
    assignments: orgData?.assignments.length ?? 0,
    publishedReports: publishedCount,
  }), [orgData, topics, targets, periods, publishedCount])

  const stepsWithStatus = useMemo(() => STEPS.map(s => ({ ...s, done: s.check(ctx) })), [ctx])
  const completed = stepsWithStatus.filter(s => s.done).length
  const total = stepsWithStatus.length
  const pct = Math.round((completed / total) * 100)
  const isDone = completed === total
  const nextStep = stepsWithStatus.find(s => !s.done)

  if (!isSetupOwner) return null
  if (dismissed) return null
  if (isDone) return null
  // Hidden on a brand-new workspace. Only show the guide once the admin has
  // taken an action — either loaded the demo sample, or made progress
  // manually. Empty workspace = clean dashboard, no widget noise.
  if (completed === 0) return null

  // Collapsed sidebar view — a small circular progress badge
  if (collapsed) {
    return (
      <button
        onClick={() => navigate(nextStep?.route ?? '/onboarding')}
        title={`Setup ${completed}/${total}`}
        className="mx-auto my-3 w-11 h-11 rounded-[10px] flex items-center justify-center relative group"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <ProgressRing pct={pct} size={28} stroke={3} />
        <span className="absolute bottom-0.5 right-0.5 text-[8.5px] font-bold text-white/90 bg-[#1B6B7B] px-1 rounded-[3px] leading-none tabular-nums">
          {completed}/{total}
        </span>
      </button>
    )
  }

  return (
    <div className="mx-3 my-3 relative">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-[12px] relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, rgba(47,169,142,0.12) 0%, rgba(27,107,123,0.08) 60%, rgba(94,53,177,0.06) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Header — always visible */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left group"
        >
          <ProgressRing pct={pct} size={26} stroke={2.5} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#2fa98e]" />
              <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-white/90">Setup guide</span>
            </div>
            <div className="text-[11px] text-white/65 mt-0.5 truncate">
              {completed} of {total} steps complete
            </div>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} />
        </button>

        {/* Dismiss */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            localStorage.setItem(DISMISS_KEY, '1')
            setDismissed(true)
          }}
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-[4px] flex items-center justify-center text-white/30 hover:text-white/80 hover:bg-white/10 transition-colors"
          title="Dismiss — can be restored from Settings"
        >
          <X className="w-3 h-3" />
        </button>

        {/* Expanded checklist */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="steps"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="pb-2 pt-1">
                {stepsWithStatus.map((s, i) => (
                  <StepRow key={s.key} step={s} isNext={s === nextStep} index={i} onClick={() => navigate(s.route)} />
                ))}
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function StepRow({ step, isNext, index, onClick }: { step: StepDef & { done: boolean }; isNext: boolean; index: number; onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/5 group"
    >
      <span
        className={`w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0 transition-all`}
        style={{
          background: step.done
            ? 'linear-gradient(135deg, #2fa98e, #1B6B7B)'
            : isNext
              ? 'rgba(47,169,142,0.2)'
              : 'rgba(255,255,255,0.06)',
          boxShadow: step.done ? '0 1px 4px rgba(47,169,142,0.4)' : 'none',
          border: isNext && !step.done ? '1px dashed rgba(47,169,142,0.5)' : 'none',
        }}
      >
        {step.done ? (
          <Check className="w-2.5 h-2.5 text-white" />
        ) : isNext ? (
          <span className="w-1.5 h-1.5 rounded-full bg-[#2fa98e] animate-pulse" />
        ) : null}
      </span>
      <div className="flex-1 min-w-0">
        <div className={`text-[11.5px] font-semibold truncate ${step.done ? 'text-white/40 line-through' : isNext ? 'text-white/95' : 'text-white/75'}`}>
          {step.title}
        </div>
        {isNext && (
          <div className="text-[10px] text-white/50 mt-0.5 truncate">{step.helper}</div>
        )}
      </div>
      {isNext && !step.done && (
        <ArrowRight className="w-3 h-3 text-[#2fa98e] flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
      )}
    </motion.button>
  )
}

function ProgressRing({ pct, size, stroke }: { pct: number; size: number; stroke: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="url(#setup-grad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${c} ${c}`}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - (pct / 100) * c }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <defs>
        <linearGradient id="setup-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2fa98e" />
          <stop offset="100%" stopColor="#1B6B7B" />
        </linearGradient>
      </defs>
    </svg>
  )
}
