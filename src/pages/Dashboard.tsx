import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, Sparkles, Clock, CheckCircle2, AlertCircle, AlertTriangle,
  Inbox, TrendingUp, Factory, Activity, Flame, Zap, Wind, Calendar,
  UserCog, Target as TargetIcon, Scale,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { resolveRole, ROLE_CATALOG, type PlatformRole } from '../lib/rbac'
import { useOrgData } from '../lib/useOrgData'
import { useFramework, FRAMEWORKS } from '../lib/frameworks'
import { focusStage, computePipeline } from '../lib/journey'
import PipelineJourney, { NextAction } from '../components/PipelineJourney'
import { orgStore, type QuestionAssignment, type OrgTarget, type MaterialTopic } from '../lib/orgStore'
import { FrameworkBadge } from '../components/FrameworkBadge'
import { AnimatedNumber, formatBig } from '../components/AnimatedNumber'
import { riseIn, popIn, slideInLeft, barFill, SPRING } from '../components/motion'
import MetricCard from '../design-system/components/MetricCard'
import SectionHeader from '../design-system/components/SectionHeader'
import Button from '../design-system/components/Button'
import { SkeletonCard } from '../design-system/components/Skeleton'
import AnomalyFeed from '../components/AnomalyFeed'
import QuickStartCard from '../components/QuickStartCard'
import DemoSeedCta from '../components/DemoSeedCta'
import { type AnomalyScope } from '../lib/orgStore'

/**
 * Overview — every number on this page is computed live. Animations use
 * explicit initial/animate props per element so nothing depends on parent
 * variant propagation (which silently fails in some framer-motion versions).
 */
export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { active: framework, enabled: enabledFrameworkIds, setActive: setActiveFramework } = useFramework()
  const { data: orgData, loading, reload: reloadOrgData } = useOrgData()
  const role = resolveRole(user)
  const focus = useMemo(() => focusStage(user, orgData), [user, orgData])
  const pipeline = useMemo(() => computePipeline(user, orgData ?? null), [user, orgData])
  const firstName = user?.name?.split(' ')[0] || 'there'

  const hasEntities = (orgData?.entities.length ?? 0) > 0
  const showOnboardingGate = role === 'platform_admin' && !hasEntities && orgData !== null

  const assignments = useMemo(() => {
    if (!orgData) return [] as QuestionAssignment[]
    return orgData.assignments.filter(a => a.framework_id === framework.id)
  }, [orgData, framework.id])

  const kpis = useMemo(() => {
    const total = assignments.length
    const approved = assignments.filter(a => a.status === 'approved').length
    const inReview = assignments.filter(a => a.status === 'submitted' || a.status === 'reviewed').length
    const inProgress = assignments.filter(a => a.status === 'in_progress').length
    const notStarted = assignments.filter(a => a.status === 'not_started').length
    const rejected = assignments.filter(a => a.status === 'rejected').length
    const now = Date.now()
    const overdue = assignments.filter(a => a.due_date && a.status !== 'approved' && new Date(a.due_date).getTime() < now).length
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    const recent = assignments.filter(a => a.last_updated && new Date(a.last_updated).getTime() > weekAgo)
    const approvedThisWeek = recent.filter(a => a.status === 'approved').length
    const rejectedThisWeek = recent.filter(a => a.status === 'rejected').length
    const coveragePct = total === 0 ? 0 : Math.round((approved / total) * 100)
    return { total, approved, inReview, inProgress, notStarted, rejected, overdue, approvedThisWeek, rejectedThisWeek, coveragePct }
  }, [assignments])

  const emissions = useMemo(() => {
    const roll = (prefix: string): { value: number; count: number } => {
      const hits = assignments.filter(a => a.status === 'approved' && a.gri_code.startsWith(prefix) && a.value != null)
      return { value: hits.reduce((s, a) => s + (a.value ?? 0), 0), count: hits.length }
    }
    return { s1: roll('305-1'), s2: roll('305-2'), s3: roll('305-3') }
  }, [assignments])
  const totalEmissions = emissions.s1.value + emissions.s2.value + emissions.s3.value

  const inboxItems = useMemo(() => {
    if (!user) return [] as { title: string; subtitle: string; route: string; icon: typeof Inbox; tone: 'urgent' | 'default' }[]
    const email = user.email.toLowerCase()
    const items: { title: string; subtitle: string; route: string; icon: typeof Inbox; tone: 'urgent' | 'default' }[] = []
    if (role === 'data_contributor' || role === 'plant_manager') {
      const myOpen = assignments.filter(a =>
        a.assigneeEmail.toLowerCase() === email &&
        (a.status === 'not_started' || a.status === 'in_progress' || a.status === 'rejected')
      )
      for (const a of myOpen.slice(0, 5)) {
        const reason = a.status === 'rejected' ? 'Needs rework — sent back' : a.status === 'in_progress' ? 'Draft saved' : 'Not started'
        items.push({
          title: `${a.gri_code} · ${a.line_item}`,
          subtitle: reason,
          route: '/my-tasks',
          icon: a.status === 'rejected' ? AlertCircle : Inbox,
          tone: a.status === 'rejected' ? 'urgent' : 'default',
        })
      }
    }
    if (role === 'subsidiary_lead' || role === 'plant_manager') {
      const submitted = assignments.filter(a => a.status === 'submitted').slice(0, 5)
      for (const a of submitted) {
        items.push({
          title: `Review · ${a.gri_code}`,
          subtitle: `From ${a.assigneeName} at ${entityName(orgData?.entities ?? [], a.entityId)}`,
          route: '/workflow/review',
          icon: CheckCircle2,
          tone: 'default',
        })
      }
    }
    if (role === 'group_sustainability_officer' || role === 'platform_admin') {
      const reviewed = assignments.filter(a => a.status === 'reviewed').slice(0, 5)
      for (const a of reviewed) {
        items.push({
          title: `Approve · ${a.gri_code}`,
          subtitle: `Value ${formatBig(a.value ?? 0)} ${a.unit ?? ''} — ${entityName(orgData?.entities ?? [], a.entityId)}`,
          route: '/workflow/approval',
          icon: CheckCircle2,
          tone: 'default',
        })
      }
    }
    if (role === 'platform_admin') {
      if (kpis.overdue > 0) items.unshift({ title: `${kpis.overdue} overdue`, subtitle: 'Past deadline, not approved', route: '/admin/assignments', icon: AlertTriangle, tone: 'urgent' })
      if (kpis.rejected > 0) items.unshift({ title: `${kpis.rejected} rejected`, subtitle: 'Sent back to plants for rework', route: '/my-tasks', icon: AlertCircle, tone: 'urgent' })
    }
    return items.slice(0, 6)
  }, [role, user, assignments, orgData, kpis.overdue, kpis.rejected])

  const plantStats = useMemo(() => {
    if (!orgData) return []
    const plants = orgData.entities.filter(e => e.type === 'plant' || e.type === 'office')
    return plants.map(p => {
      const plantAssignments = assignments.filter(a => a.entityId === p.id)
      const total = plantAssignments.length
      const approved = plantAssignments.filter(a => a.status === 'approved').length
      const inReview = plantAssignments.filter(a => a.status === 'submitted' || a.status === 'reviewed').length
      const pending = total - approved - inReview
      return { plant: p, total, approved, inReview, pending, pct: total === 0 ? 0 : Math.round((approved / total) * 100) }
    }).sort((a, b) => b.total - a.total)
  }, [orgData, assignments])

  const activity = useMemo(() => {
    const now = Date.now()
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    return assignments
      .filter(a => a.last_updated && new Date(a.last_updated).getTime() > weekAgo)
      .sort((a, b) => (b.last_updated ?? '').localeCompare(a.last_updated ?? ''))
      .slice(0, 10)
  }, [assignments])

  const [fwProgress, setFwProgress] = useState<Array<{ framework_id: string; total: number; approved: number; in_review: number; open: number }>>([])
  const [targets, setTargets] = useState<OrgTarget[]>([])
  const [materialTopics, setMaterialTopics] = useState<MaterialTopic[]>([])
  useEffect(() => {
    if (!user) return
    orgStore.frameworkProgress().then(setFwProgress).catch(() => setFwProgress([]))
    orgStore.listTargets().then(setTargets).catch(() => setTargets([]))
    orgStore.listMaterialTopics().then(setMaterialTopics).catch(() => setMaterialTopics([]))
  }, [user?.id, orgData?.assignments.length])

  // Role-scoped assignment bucket (contributor + narrator see only their own).
  // MUST be declared before any early return so hooks run in stable order.
  const mineAssignments = useMemo(() => {
    if (!user) return [] as QuestionAssignment[]
    return assignments.filter(a => a.assigneeEmail.toLowerCase() === user.email.toLowerCase())
  }, [assignments, user])

  if (loading && !orgData) {
    return (
      <div className="space-y-6">
        <div className="h-[180px] rounded-[18px] skeleton" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard /><SkeletonCard />
        </div>
      </div>
    )
  }

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'

  // ── Role-scoped capability matrix — what each role sees on the dashboard ──
  const is = {
    admin:      role === 'platform_admin',
    so:         role === 'group_sustainability_officer',
    sl:         role === 'subsidiary_lead',
    pm:         role === 'plant_manager',
    contrib:    role === 'data_contributor',
    narrator:   role === 'narrative_owner',
    auditor:    role === 'auditor',
  }

  // Action-capable roles (can push workflow forward)
  const isOperator = is.admin || is.so || is.sl || is.pm
  // Roles that see org-level strategy (targets, materiality panel)
  const seeStrategy = is.admin || is.so

  const myOpen = mineAssignments.filter(a => a.status === 'not_started' || a.status === 'in_progress' || a.status === 'rejected').length
  const myInFlight = mineAssignments.filter(a => a.status === 'submitted' || a.status === 'reviewed').length
  const myDone = mineAssignments.filter(a => a.status === 'approved').length
  const myRejected = mineAssignments.filter(a => a.status === 'rejected').length

  // Role-specific hero copy
  const heroCopy = (() => {
    if (is.contrib) {
      return myOpen === 0
        ? `You're all caught up. Nothing open in your queue.`
        : `You have ${myOpen} disclosure${myOpen === 1 ? '' : 's'} waiting on your input${myRejected > 0 ? `, including ${myRejected} sent back for rework` : ''}.`
    }
    if (is.pm) {
      return `${myOpen} of your plant's disclosures need attention. Group coverage sits at ${kpis.coveragePct}%.`
    }
    if (is.sl) {
      return `${kpis.inReview} submission${kpis.inReview === 1 ? '' : 's'} await your review. ${kpis.approved} of ${kpis.total} are already through the pipeline.`
    }
    if (is.so) {
      return kpis.coveragePct === 100
        ? `Every ${framework.name} disclosure is approved. You're ready to publish.`
        : `${kpis.approved} of ${kpis.total} approved. ${assignments.filter(a => a.status === 'reviewed').length} are on your desk awaiting final approval.`
    }
    if (is.narrator) {
      const nOpen = mineAssignments.filter(a => a.status === 'not_started' || a.status === 'in_progress' || a.status === 'rejected').length
      return nOpen === 0
        ? `No narrative tasks open right now. Good time to review published reports.`
        : `${nOpen} narrative disclosure${nOpen === 1 ? '' : 's'} need your pen — the quantitative data is already in.`
    }
    if (is.auditor) {
      return `Read-only view. Audit trail is tamper-evident, chain is continuous, every publication is externally anchored.`
    }
    // platform_admin
    return kpis.total === 0
      ? `${framework.name} is ready. Assign disclosures to your team to start collecting data.`
      : `${kpis.approved} of ${kpis.total} ${framework.name} disclosures are approved. ${kpis.inReview} in review. ${kpis.overdue} overdue.`
  })()

  return (
    <div className="space-y-8">
      {/* Empty-workspace CTA: an admin-only "Load PTTGC sample" card. The
          SetupGuide widget itself stays hidden on a brand-new workspace —
          this card is the only onboarding affordance until the user clicks. */}
      <DemoSeedCta show={showOnboardingGate} onCompleted={reloadOrgData} />

      {!showOnboardingGate && <QuickStartCard />}

      <AnimatePresence>
        {showOnboardingGate && <OnboardingHero key="gate" onStart={() => navigate('/onboarding')} />}
      </AnimatePresence>

      {/* ─── FLOW — this is what they see first. One diagram, one clear action. ─── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-4"
      >
        {focus && (
          <NextAction
            stage={focus}
            reason={computeReason(focus, role, kpis, myOpen, firstName)}
            cta={computeCta(focus, role, myOpen)}
            secondary={computeSecondary(role)}
            onPrimary={() => navigate(focus.stage.route)}
            onSecondary={() => {
              if (role === 'data_contributor' || role === 'plant_manager' || role === 'narrative_owner') navigate('/my-tasks')
              else if (role === 'platform_admin') navigate('/onboarding')
              else navigate('/admin/assignments')
            }}
          />
        )}
        <PipelineJourney
          stages={pipeline}
          activeKey={focus?.stage.key}
          myRole={role}
        />
      </motion.section>

      {/* ─── Hero (secondary) — role-tailored + 3D mesh + glass panels ─── */}
      <DashboardHero
        greeting={greeting}
        firstName={firstName}
        roleLabel={ROLE_CATALOG[role].name}
        heroCopy={heroCopy}
        kpis={kpis}
        mineAssignments={mineAssignments}
        myDone={myDone}
        myOpen={myOpen}
        myInFlight={myInFlight}
        assignments={assignments}
        entities={orgData?.entities ?? []}
        framework={framework.name}
        is={is}
        isOperator={isOperator}
        focus={focus}
        navigate={navigate}
        now={now}
      />

      {/* legacy hero body hidden (kept for backrefs) */}
      <motion.section
        {...riseIn(0)}
        className="relative surface-hero p-8 md:p-10 overflow-hidden hidden"
      >
        <AmbientGlow />
        <div className="relative grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <FrameworkBadge size="sm" />
              <span className="chip">
                <UserCog className="w-3 h-3" />
                {ROLE_CATALOG[role].name}
              </span>
            </div>
            <h1 className="text-display text-[38px] md:text-[44px] text-[var(--text-primary)]">
              {greeting}, {firstName}.
            </h1>
            <p className="text-[15px] md:text-[16px] text-[var(--text-secondary)] mt-3 max-w-2xl leading-relaxed">
              {heroCopy}
            </p>

            {/* Progress bar — coverage for operators, personal progress for contributors/narrators */}
            <div className="mt-6 max-w-md">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[var(--text-tertiary)]">
                  {is.contrib || is.narrator ? 'Your progress' : is.auditor ? 'Org-wide coverage' : 'Report coverage'}
                </span>
                <span className="text-[13px] font-bold tabular-nums text-[var(--text-primary)]">
                  {(() => {
                    if (is.contrib || is.narrator) {
                      const total = mineAssignments.length
                      const pct = total === 0 ? 0 : Math.round((myDone / total) * 100)
                      return <><AnimatedNumber value={pct} />%</>
                    }
                    return <><AnimatedNumber value={kpis.coveragePct} />%</>
                  })()}
                </span>
              </div>
              <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden relative">
                {(() => {
                  const pct = (is.contrib || is.narrator)
                    ? (mineAssignments.length === 0 ? 0 : Math.round((myDone / mineAssignments.length) * 100))
                    : kpis.coveragePct
                  return (
                    <motion.div
                      {...barFill(pct, 0.4)}
                      className="h-full rounded-full relative"
                      style={{
                        background: pct === 100
                          ? 'linear-gradient(90deg, #10B981, #2E7D32)'
                          : 'linear-gradient(90deg, #1B6B7B, #3B8A9B)',
                        boxShadow: '0 0 8px rgba(27,107,123,0.3)',
                      }}
                    />
                  )
                })()}
              </div>
            </div>

            {focus && (focus.state === 'active' || focus.isMine) && isOperator && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: 0.25 }}
                className="mt-6 inline-flex items-center gap-3"
              >
                <Button variant="brand" size="md" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right"
                  onClick={() => navigate(focus.stage.route)}
                >
                  {focus.stage.cta}
                </Button>
                <span className="text-[12.5px] text-[var(--text-tertiary)] max-w-[240px] leading-snug">
                  {focus.headline}
                </span>
              </motion.div>
            )}
            {(is.contrib || is.narrator) && myOpen > 0 && (
              <div className="mt-6">
                <Button variant="brand" size="md" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right" onClick={() => navigate('/my-tasks')}>
                  Open my tasks
                </Button>
              </div>
            )}
            {is.auditor && (
              <div className="mt-6">
                <Button variant="brand" size="md" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right" onClick={() => navigate('/admin/audit')}>
                  Open audit trail
                </Button>
              </div>
            )}
          </div>

          {/* Right column — stacked meta callouts, per role */}
          <div className="space-y-2.5">
            <HeroStat icon={Calendar} label="Today" value={now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} sub={is.contrib || is.narrator ? `${myDone} approved` : `${kpis.approvedThisWeek} approved this week`} />

            {(is.admin || is.so || is.sl || is.auditor) && (
              <HeroStat icon={Factory} label="Entities in scope" value={String(orgData?.entities.filter(e => e.type === 'plant' || e.type === 'office').length ?? 0)} sub={`${orgData?.entities.length ?? 0} total`} />
            )}
            {is.pm && (
              <HeroStat icon={Factory} label="Your plant" value={String(myDone)} sub={`of ${mineAssignments.length} disclosures`} />
            )}
            {(is.contrib || is.narrator) && (
              <HeroStat icon={Factory} label="In-flight" value={String(myInFlight)} sub={myInFlight === 0 ? 'none pending review' : 'awaiting review/approval'} />
            )}

            <HeroStat
              icon={Inbox}
              label="Awaiting you"
              value={String(
                is.contrib || is.pm || is.narrator ? myOpen
                : is.sl ? kpis.inReview
                : is.so ? assignments.filter(a => a.status === 'reviewed').length
                : is.auditor ? 0
                : kpis.overdue
              )}
              sub={
                is.contrib || is.pm || is.narrator ? 'open tasks'
                : is.sl ? 'to review'
                : is.so ? 'to approve'
                : is.auditor ? 'read-only · no actions'
                : 'overdue'
              }
            />
          </div>
        </div>
      </motion.section>

      {/* ─── KPI row — scaled to role ───────────────────────────── */}
      {isOperator && (
        <section>
          <SectionHeader
            kicker="Pulse"
            title="At a glance"
            subtitle={`${framework.name} scope — updated live as your team works.`}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard index={0} label="Coverage" value={`${kpis.coveragePct}%`} icon={<CheckCircle2 className="w-4 h-4" />} accent={kpis.coveragePct === 100 ? 'green' : kpis.coveragePct >= 50 ? 'teal' : 'amber'} sub={kpis.total === 0 ? 'of —' : `of ${kpis.total}`}>
              <button onClick={() => navigate('/aggregator')} className="text-[11.5px] font-semibold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] inline-flex items-center gap-1 link-underline">
                View rollup <ArrowRight className="w-3 h-3" />
              </button>
            </MetricCard>
            <MetricCard index={1} label="In review" value={String(kpis.inReview)} icon={<Inbox className="w-4 h-4" />} accent={kpis.inReview > 0 ? 'blue' : 'teal'} sub={kpis.inReview === 0 ? 'clear' : 'items'}>
              <button onClick={() => navigate(is.so || is.admin ? '/workflow/approval' : '/workflow/review')} className="text-[11.5px] font-semibold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] inline-flex items-center gap-1 link-underline">
                Open queue <ArrowRight className="w-3 h-3" />
              </button>
            </MetricCard>
            <MetricCard index={2} label="Overdue" value={String(kpis.overdue)} icon={<AlertTriangle className="w-4 h-4" />} accent={kpis.overdue > 0 ? 'red' : 'green'} sub={kpis.overdue === 0 ? 'all on time' : 'past deadline'}>
              {kpis.overdue > 0 && (
                <button onClick={() => navigate('/admin/assignments')} className="text-[11.5px] font-semibold text-[var(--accent-red)] hover:underline inline-flex items-center gap-1">
                  Resolve <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </MetricCard>
            <MetricCard index={3} label="This week" value={String(kpis.approvedThisWeek)} icon={<TrendingUp className="w-4 h-4" />} accent="purple" sub={`${kpis.rejectedThisWeek} sent back`} />
          </div>
        </section>
      )}

      {/* ─── Contributor / Narrator KPIs: personal view ───────── */}
      {(is.contrib || is.narrator) && (
        <section>
          <SectionHeader kicker="Your workload" title="Your progress" subtitle="Everything assigned to you and where each disclosure sits in the pipeline." />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard index={0} label="Open" value={String(myOpen)} icon={<Inbox className="w-4 h-4" />} accent={myOpen === 0 ? 'green' : 'amber'} sub={myOpen === 0 ? 'caught up' : 'on your plate'}>
              <button onClick={() => navigate('/my-tasks')} className="text-[11.5px] font-semibold text-[var(--color-brand)] inline-flex items-center gap-1 link-underline">Open tasks <ArrowRight className="w-3 h-3" /></button>
            </MetricCard>
            <MetricCard index={1} label="In review/approval" value={String(myInFlight)} icon={<CheckCircle2 className="w-4 h-4" />} accent="blue" sub="waiting on reviewer" />
            <MetricCard index={2} label="Sent back" value={String(myRejected)} icon={<AlertTriangle className="w-4 h-4" />} accent={myRejected > 0 ? 'red' : 'green'} sub={myRejected > 0 ? 'needs rework' : 'zero rework'} />
            <MetricCard index={3} label="Approved" value={String(myDone)} icon={<TrendingUp className="w-4 h-4" />} accent="green" sub="in the report" />
          </div>
        </section>
      )}

      {/* ─── Auditor KPIs: integrity-first ────────────────────── */}
      {is.auditor && (
        <section>
          <SectionHeader kicker="Integrity" title="Evidence of record" subtitle="What you can verify in this tenant right now." />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard index={0} label="Approved disclosures" value={String(kpis.approved)} icon={<CheckCircle2 className="w-4 h-4" />} accent="green" sub={`of ${kpis.total}`} />
            <MetricCard index={1} label="Awaiting approval" value={String(assignments.filter(a => a.status === 'reviewed').length)} icon={<Inbox className="w-4 h-4" />} accent="blue" sub="on the SO's desk" />
            <MetricCard index={2} label="Rejected" value={String(assignments.filter(a => a.status === 'rejected').length)} icon={<AlertTriangle className="w-4 h-4" />} accent="amber" sub="sent back for rework" />
            <MetricCard index={3} label="Entities" value={String(orgData?.entities.length ?? 0)} icon={<Factory className="w-4 h-4" />} accent="teal" sub="in consolidation scope" />
          </div>
        </section>
      )}

      {/* ─── Strategy (SBTi + Materiality) — admin/SO only ────── */}
      {seeStrategy && (
        <section>
          <SectionHeader
            kicker="Strategy"
            title="Targets & materiality"
            subtitle="Science-based pathway and the topics that matter most to your business."
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div {...popIn(0)}>
              <SbtiTracker targets={targets} currentEmissions={totalEmissions} onManage={() => navigate('/admin/targets')} />
            </motion.div>
            <motion.div {...popIn(1)}>
              <MaterialityPanel topics={materialTopics} assignments={assignments} />
            </motion.div>
          </div>
        </section>
      )}

      {/* ─── Narrative owner: Materiality + their narrative tasks ── */}
      {is.narrator && (
        <section>
          <SectionHeader
            kicker="Narrative scope"
            title="What topics need your pen"
            subtitle="Material topics drive the narrative disclosures in your report."
          />
          <motion.div {...popIn(0)}>
            <MaterialityPanel topics={materialTopics} assignments={assignments} />
          </motion.div>
        </section>
      )}

      {/* ─── Workspace — differs per role ───────────────────────── */}
      <section>
        <SectionHeader
          kicker={is.auditor ? 'Observation' : 'Workspace'}
          title={is.auditor ? "What happened recently" : "What needs your attention"}
          subtitle={
            is.auditor ? 'Live feed of pipeline transitions. Everything below is already hash-chained.' :
            is.contrib ? 'Your tasks, deadlines, and any submissions that came back.' :
            is.narrator ? 'Your narrative queue and where each disclosure will appear.' :
            'The inbox, plant coverage, and everything moving in your report.'
          }
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {!is.auditor && !is.contrib && !is.narrator && (
              <motion.div {...riseIn(0)}><InboxPanel items={inboxItems} role={role} navigate={navigate} /></motion.div>
            )}
            {(is.contrib || is.narrator) && (
              <motion.div {...riseIn(0)}>
                <MyTasksPanel tasks={mineAssignments} navigate={navigate} />
              </motion.div>
            )}
            {(is.admin || is.so || is.sl) && (
              <motion.div {...riseIn(1)}><PlantCoverage stats={plantStats} navigate={navigate} /></motion.div>
            )}
            <motion.div {...riseIn(2)}><ActivityPanel activity={activity} entities={orgData?.entities ?? []} /></motion.div>
          </div>
          <div className="space-y-4">
            {(is.admin || is.so || is.sl || is.pm || is.auditor) && (
              <motion.div {...popIn(0)}>
                <EmissionsSnapshot s1={emissions.s1} s2={emissions.s2} s3={emissions.s3} total={totalEmissions} />
              </motion.div>
            )}
            {isOperator && (
              <motion.div {...popIn(1)}>
                <AtRiskPanel assignments={assignments} navigate={navigate} />
              </motion.div>
            )}
            {is.auditor && (
              <motion.div {...popIn(1)}>
                <ChainIntegrityCard navigate={navigate} />
              </motion.div>
            )}
            <motion.div {...popIn(2)}>
              <RoleCheatsheet role={role} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Quality: Anomalies — everyone sees, scoped differently ─── */}
      {!is.narrator && (
        <section>
          <SectionHeader
            kicker="Quality"
            title="Anomaly detection"
            subtitle={
              is.contrib ? 'Flags on your own submissions — YoY spikes, outliers, missing evidence.'
              : is.pm ? 'Quality checks across every disclosure you own.'
              : is.auditor ? 'Read-only view of every outstanding flag across the tenant.'
              : 'Nine rule types across every disclosure in scope. Everything logged, nothing silent.'
            }
          />
          <motion.div {...riseIn(0)}>
            <AnomalyFeed
              scope={is.contrib ? 'mine' as AnomalyScope : (is.admin || is.auditor) ? 'all' : 'role'}
              limit={is.auditor ? 12 : 8}
              title="Flags in your scope"
            />
          </motion.div>
        </section>
      )}

      {/* ─── Frameworks grid — only leaders/admin pick frameworks ─── */}
      {(is.admin || is.so || is.auditor) && (
      <section>
        <SectionHeader
          kicker="Frameworks"
          title="All frameworks in scope"
          subtitle={`${enabledFrameworkIds.length} active — click any enabled tile to switch scope.`}
          actions={
            <Button variant="ghost" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />} iconPosition="right" onClick={() => navigate('/settings')}>
              Manage
            </Button>
          }
        />
        <motion.div {...riseIn(0)} className="surface-paper p-0 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-[var(--border-subtle)]">
            {FRAMEWORKS.map((f, i) => {
              const isEnabled = enabledFrameworkIds.includes(f.id)
              const isActive = framework.id === f.id
              const prog = fwProgress.find(p => p.framework_id === f.id)
              const total = prog?.total ?? 0
              const approved = prog?.approved ?? 0
              const inReview = prog?.in_review ?? 0
              const open = prog?.open ?? 0
              const pct = total === 0 ? 0 : Math.round((approved / total) * 100)
              const dimmed = !isEnabled && f.status !== 'active'
              return (
                <motion.button
                  key={f.id}
                  {...popIn(i)}
                  whileHover={isEnabled ? { y: -1 } : undefined}
                  type="button"
                  onClick={() => isEnabled && setActiveFramework(f.id)}
                  disabled={!isEnabled}
                  className={`text-left p-5 transition-colors relative ${
                    isActive ? 'bg-[var(--accent-teal-subtle)]'
                    : dimmed ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  {isActive && (
                    <span
                      className="absolute top-3 right-3 text-[9px] uppercase tracking-[0.12em] font-bold text-white px-2 py-0.5 rounded-full"
                      style={{ background: 'linear-gradient(135deg, #2fa98e, #1B6B7B)' }}
                    >
                      Active
                    </span>
                  )}
                  <div className="flex items-start gap-3">
                    <span
                      className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-white"
                      style={{ background: f.color, boxShadow: `0 2px 8px ${f.color}40, inset 0 1px 0 rgba(255,255,255,0.18)` }}
                    >
                      {f.code.split(' ')[0].slice(0, 3)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-[var(--text-primary)]">{f.code}</span>
                        {f.status === 'coming_soon' && (
                          <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-[var(--status-pending)] bg-[var(--accent-blue-light)] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
                            <Clock className="w-2 h-2" /> Soon
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-[var(--text-tertiary)] mt-0.5 line-clamp-1 leading-snug">{f.name}</div>
                      {isEnabled ? (
                        total === 0 ? (
                          <div className="mt-3 text-[11.5px] text-[var(--text-tertiary)]">No assignments yet</div>
                        ) : (
                          <>
                            <div className="mt-3 flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                                <motion.div {...barFill(pct, 0.3)} className="h-full rounded-full" style={{ background: pct === 100 ? 'var(--status-ok)' : 'var(--color-brand)' }} />
                              </div>
                              <span className="text-[11px] font-bold tabular-nums text-[var(--text-primary)]">{pct}%</span>
                            </div>
                            <div className="mt-2 flex items-center gap-3 text-[11px] tabular-nums text-[var(--text-tertiary)]">
                              <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[var(--status-ok)]" />{approved} done</span>
                              <span>· {inReview} in review</span>
                              <span>· {open} open</span>
                            </div>
                          </>
                        )
                      ) : (
                        <div className="mt-3 text-[11.5px] text-[var(--text-tertiary)]">
                          {f.status === 'coming_soon' ? 'Available in a future release' : 'Turn on in Settings'}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      </section>
      )}
    </div>
  )
}

/** Compact metric row for the hero right-column. */
// ─── Copy helpers for the NextAction card ──────────────────

function computeReason(
  focus: NonNullable<ReturnType<typeof focusStage>>,
  role: PlatformRole,
  kpis: { approved: number; total: number; inReview: number; overdue: number },
  myOpen: number,
  firstName: string
): string {
  if (role === 'data_contributor' || role === 'plant_manager' || role === 'narrative_owner') {
    if (myOpen === 0) return `Nothing assigned to you right now, ${firstName}. Sit tight.`
    return `You have ${myOpen} disclosure${myOpen === 1 ? '' : 's'} to submit. Start with the one closest to its deadline.`
  }
  if (role === 'subsidiary_lead') {
    if (kpis.inReview === 0) return 'Review queue is empty. Nothing for you to act on.'
    return `${kpis.inReview} plant submission${kpis.inReview === 1 ? '' : 's'} await your review.`
  }
  if (role === 'group_sustainability_officer') {
    if (kpis.approved === kpis.total && kpis.total > 0) return 'Every disclosure is approved. Time to publish FY 2026.'
    if (focus.stage.key === 'approve') return `${focus.total - focus.done} item${(focus.total - focus.done) === 1 ? '' : 's'} on your desk for final approval.`
    return focus.headline
  }
  if (role === 'auditor') return 'Open the audit trail to inspect the tamper-evident chain.'
  // platform_admin
  return focus.headline
}

function computeCta(
  focus: NonNullable<ReturnType<typeof focusStage>>,
  role: PlatformRole,
  myOpen: number
): string {
  if (role === 'data_contributor' || role === 'plant_manager' || role === 'narrative_owner') {
    return myOpen > 0 ? 'Open my tasks' : 'Go to dashboard'
  }
  if (role === 'auditor') return 'Open audit trail'
  return focus.stage.cta
}

function computeSecondary(role: PlatformRole): string | undefined {
  if (role === 'data_contributor' || role === 'plant_manager' || role === 'narrative_owner') return 'See all tasks'
  if (role === 'platform_admin') return 'Browse setup guide'
  if (role === 'auditor') return undefined
  return 'Open assignments'
}

// ─── Premium Dashboard Hero — 3D mesh, glass, parallax, iridescent ──

function DashboardHero(props: {
  greeting: string
  firstName: string
  roleLabel: string
  heroCopy: string
  kpis: { total: number; approved: number; coveragePct: number; inReview: number; overdue: number; approvedThisWeek: number; rejectedThisWeek: number }
  mineAssignments: QuestionAssignment[]
  myDone: number
  myOpen: number
  myInFlight: number
  assignments: QuestionAssignment[]
  entities: Array<{ id: string; type: string }>
  framework: string
  is: { admin: boolean; so: boolean; sl: boolean; pm: boolean; contrib: boolean; narrator: boolean; auditor: boolean }
  isOperator: boolean
  focus: ReturnType<typeof focusStage>
  navigate: (p: string) => void
  now: Date
}) {
  const { greeting, firstName, roleLabel, heroCopy, kpis, mineAssignments, myDone, myOpen, myInFlight, assignments, entities, framework, is, isOperator, focus, navigate, now } = props

  const personal = is.contrib || is.narrator
  const pct = personal
    ? (mineAssignments.length === 0 ? 0 : Math.round((myDone / mineAssignments.length) * 100))
    : kpis.coveragePct
  const plantCount = entities.filter(e => e.type === 'plant' || e.type === 'office').length

  const awaiting =
    is.contrib || is.pm || is.narrator ? myOpen
    : is.sl ? kpis.inReview
    : is.so ? assignments.filter(a => a.status === 'reviewed').length
    : is.auditor ? 0
    : kpis.overdue
  const awaitingSub =
    is.contrib || is.pm || is.narrator ? 'open tasks'
    : is.sl ? 'to review'
    : is.so ? 'to approve'
    : is.auditor ? 'read-only'
    : 'overdue'

  return (
    <motion.section {...riseIn(0)} className="surface-paper px-7 py-8 md:px-9 md:py-10">
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 items-start">
        {/* Left — headline + coverage + CTA */}
        <div>
          <div className="flex items-center gap-2 mb-5 text-[11px] text-[var(--text-tertiary)]">
            <span className="font-mono uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{framework}</span>
            <span className="text-[var(--text-quaternary)]">/</span>
            <span>{roleLabel}</span>
          </div>

          <h1 className="font-display text-[32px] md:text-[40px] leading-[1.05] tracking-[-0.025em] text-[var(--text-primary)]">
            {greeting}, {firstName}.
          </h1>
          <p className="text-[14px] md:text-[15px] text-[var(--text-secondary)] mt-3 max-w-xl leading-relaxed">
            {heroCopy}
          </p>

          {/* Coverage */}
          <div className="mt-8 max-w-md">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--text-tertiary)]">
                {personal ? 'Your progress' : is.auditor ? 'Org-wide coverage' : 'Report coverage'}
              </span>
              <span className="text-[15px] font-semibold tabular-nums text-[var(--text-primary)]">
                <AnimatedNumber value={pct} />%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden bg-[var(--bg-tertiary)]">
              <motion.div
                {...barFill(pct, 0.4)}
                className="h-full rounded-full"
                style={{ background: pct === 100 ? 'var(--status-ok)' : 'var(--color-brand)' }}
              />
            </div>
          </div>

          {/* CTA */}
          {focus && (focus.state === 'active' || focus.isMine) && isOperator && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.1 }}
              className="mt-7 inline-flex items-center gap-4"
            >
              <button
                onClick={() => navigate(focus.stage.route)}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] text-white text-[12.5px] font-semibold transition-all active:translate-y-[0.5px]"
                style={{ background: 'var(--color-brand-strong)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(11,18,32,0.08)' }}
              >
                {focus.stage.cta}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-[12px] text-[var(--text-tertiary)] max-w-[280px] leading-snug">
                {focus.headline}
              </span>
            </motion.div>
          )}
          {personal && myOpen > 0 && (
            <button
              onClick={() => navigate('/my-tasks')}
              className="inline-flex items-center gap-1.5 h-9 px-4 mt-7 rounded-[8px] text-white text-[12.5px] font-semibold transition-all active:translate-y-[0.5px]"
              style={{ background: 'var(--color-brand-strong)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(11,18,32,0.08)' }}
            >
              Open my tasks
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          {is.auditor && (
            <button
              onClick={() => navigate('/admin/audit')}
              className="inline-flex items-center gap-1.5 h-9 px-4 mt-7 rounded-[8px] text-white text-[12.5px] font-semibold transition-all active:translate-y-[0.5px]"
              style={{ background: 'var(--color-brand-strong)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(11,18,32,0.08)' }}
            >
              Open audit trail
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right — three stat rows, flat */}
        <div className="space-y-0 border-l border-[var(--border-subtle)] pl-8">
          <HeroRow
            label="Today"
            value={now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            sub={personal ? `${myDone} approved` : `${kpis.approvedThisWeek} approved this week`}
          />
          {(is.admin || is.so || is.sl || is.auditor) && (
            <HeroRow label="Entities in scope" value={String(plantCount)} sub={`${entities.length} total · consolidated`} />
          )}
          {is.pm && (
            <HeroRow label="Your plant" value={String(myDone)} sub={`of ${mineAssignments.length} disclosures`} />
          )}
          {personal && (
            <HeroRow label="In-flight" value={String(myInFlight)} sub={myInFlight === 0 ? 'none pending review' : 'pending review'} />
          )}
          <HeroRow label="Awaiting you" value={String(awaiting)} sub={awaitingSub} emphasise />
        </div>
      </div>
    </motion.section>
  )
}

function HeroRow({ label, value, sub, emphasise }: { label: string; value: string; sub?: string; emphasise?: boolean }) {
  return (
    <div className="py-3.5 first:pt-0 last:pb-0 border-b border-[var(--border-subtle)] last:border-b-0">
      <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--text-tertiary)] mb-1">
        {label}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-[15px] font-semibold tracking-[-0.005em] ${emphasise ? 'text-[var(--color-brand-strong)]' : 'text-[var(--text-primary)]'} tabular-nums truncate`}>
          {value}
        </span>
        {sub && <span className="text-[11px] text-[var(--text-tertiary)] truncate">{sub}</span>}
      </div>
    </div>
  )
}

function HeroStat({ icon: Icon, label, value, sub }: { icon: typeof Calendar; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-[12px] bg-white/60 border border-[var(--border-subtle)]" style={{ backdropFilter: 'blur(8px)' }}>
      <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: 'var(--gradient-brand-soft)', color: 'var(--color-brand)' }}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-tertiary)]">{label}</div>
        <div className="text-[14.5px] font-semibold text-[var(--text-primary)] tracking-[-0.01em] truncate">{value}</div>
      </div>
      {sub && <div className="text-[11px] text-[var(--text-tertiary)] text-right flex-shrink-0 max-w-[90px] leading-tight">{sub}</div>}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────

function AmbientGlow() {
  return (
    <>
      <motion.span
        aria-hidden
        className="absolute -top-20 -right-12 w-[280px] h-[280px] rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--color-brand) 0%, transparent 70%)' }}
        animate={{ x: [0, -20, 0], y: [0, 8, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        aria-hidden
        className="absolute -bottom-24 -left-10 w-[240px] h-[240px] rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--accent-teal) 0%, transparent 70%)' }}
        animate={{ x: [0, 16, 0], y: [0, -10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
    </>
  )
}

function OnboardingHero({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={SPRING}
      className="surface-brand p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative"
    >
      <AmbientGlow />
      <div className="relative">
        <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.14em] font-semibold text-white/80">
          <Sparkles className="w-3 h-3" /> First run · recommended
        </div>
        <h2 className="text-display text-[26px] md:text-[30px] text-white mt-2">Set up your reporting tree</h2>
        <p className="text-[14px] text-white/85 mt-2 max-w-xl leading-relaxed">
          Add your parent group, subsidiaries, and plants. Once that's in place you can assign GRI line items to the right people.
        </p>
      </div>
      <motion.button
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
        onClick={onStart}
        className="px-5 h-11 rounded-[10px] bg-white text-[var(--color-brand-strong)] text-[14px] font-semibold inline-flex items-center gap-2 flex-shrink-0 shadow-lg relative"
      >
        Start onboarding <ArrowRight className="w-4 h-4" />
      </motion.button>
    </motion.div>
  )
}

/** MyTasksPanel — focus-view for contributors + narrative owners. */
function MyTasksPanel({ tasks, navigate }: { tasks: QuestionAssignment[]; navigate: (p: string) => void }) {
  const open = tasks.filter(a => a.status === 'not_started' || a.status === 'in_progress' || a.status === 'rejected')
  const submitted = tasks.filter(a => a.status === 'submitted' || a.status === 'reviewed')

  if (tasks.length === 0) {
    return (
      <div className="surface-paper overflow-hidden">
        <header className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
            <Inbox className="w-3.5 h-3.5" />
          </span>
          <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">Your task queue</h3>
        </header>
        <div className="px-5 py-12 text-center">
          <div className="inline-flex w-12 h-12 rounded-full items-center justify-center mb-3" style={{ background: 'var(--accent-green-light)' }}>
            <CheckCircle2 className="w-6 h-6 text-[var(--status-ok)]" />
          </div>
          <div className="text-[15px] font-semibold text-[var(--text-primary)]">Nothing assigned yet</div>
          <div className="text-[12.5px] text-[var(--text-tertiary)] mt-1 max-w-xs mx-auto">When your lead routes a disclosure to you, it'll show up here.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="surface-paper overflow-hidden">
      <header className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
            <Inbox className="w-3.5 h-3.5" />
          </span>
          <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">Your task queue</h3>
        </div>
        <button onClick={() => navigate('/my-tasks')} className="text-[12px] font-semibold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] inline-flex items-center gap-1 link-underline">
          Open all <ArrowRight className="w-3 h-3" />
        </button>
      </header>
      <ul className="divide-y divide-[var(--border-subtle)]">
        {open.slice(0, 5).map((a, i) => {
          const now = Date.now()
          const overdue = a.due_date && new Date(a.due_date).getTime() < now
          return (
            <motion.li key={a.id} {...slideInLeft(i)}>
              <button
                onClick={() => navigate(`/data/entry/${a.questionId}`)}
                className="w-full text-left px-5 py-3.5 flex items-center gap-3 hover:bg-[var(--bg-secondary)] transition-colors group"
              >
                <span className={`w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 ${
                  a.status === 'rejected' ? 'bg-[var(--accent-red-light)] text-[var(--status-reject)]'
                  : overdue ? 'bg-[var(--accent-amber-light)] text-[var(--status-draft)]'
                  : 'bg-[var(--accent-teal-subtle)] text-[var(--color-brand)]'
                }`}>
                  {a.status === 'rejected' ? <AlertCircle className="w-4 h-4" /> : <Inbox className="w-4 h-4" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-[var(--text-tertiary)] font-mono font-semibold">{a.gri_code}</div>
                  <div className="text-[13.5px] font-semibold text-[var(--text-primary)] truncate tracking-[-0.005em]">{a.line_item}</div>
                  <div className="text-[11.5px] text-[var(--text-tertiary)] mt-0.5">
                    {a.status === 'rejected' ? 'Sent back — needs rework' :
                     a.status === 'in_progress' ? 'Draft saved' :
                     a.due_date ? (overdue ? 'Overdue' : `Due ${new Date(a.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`) : 'Not started'}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0 transition-transform group-hover:translate-x-1" />
              </button>
            </motion.li>
          )
        })}
      </ul>
      {submitted.length > 0 && (
        <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[11.5px] text-[var(--text-tertiary)]">
          <strong className="text-[var(--text-secondary)] font-semibold">{submitted.length}</strong> awaiting review/approval · no action needed
        </div>
      )}
    </div>
  )
}

/** ChainIntegrityCard — auditor dashboard panel. */
function ChainIntegrityCard({ navigate }: { navigate: (p: string) => void }) {
  const [state, setState] = useState<{ verified: boolean | null; count: number | null; loading: boolean }>({ verified: null, count: null, loading: true })
  useEffect(() => {
    const token = localStorage.getItem('aeiforo_token')
    fetch('/api/blockchain?view=verify', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return setState({ verified: null, count: null, loading: false })
        setState({
          verified: !!d.verified,
          count: d.totalRecords ?? d.total_records ?? null,
          loading: false,
        })
      })
      .catch(() => setState({ verified: null, count: null, loading: false }))
  }, [])

  const ok = state.verified === true
  return (
    <div className="surface-paper p-6 relative overflow-hidden" style={{ background: ok ? 'linear-gradient(135deg, rgba(46,125,50,0.05) 0%, transparent 60%)' : undefined }}>
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: ok ? 'var(--accent-green-light)' : 'var(--bg-secondary)', color: ok ? 'var(--status-ok)' : 'var(--text-tertiary)' }}>
          <CheckCircle2 className="w-5 h-5" />
        </span>
        <div>
          <span className="kicker !mb-0">Hash chain</span>
          <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em] mt-0.5">
            {state.loading ? 'Verifying…' : ok ? 'Chain intact' : state.verified === false ? 'Chain broken' : '—'}
          </h3>
        </div>
      </div>
      <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed">
        {state.loading ? 'Walking the chain to confirm every block links to the previous one.'
         : ok ? `${state.count ?? '—'} records, every block links cleanly. Run this check again at any time.`
         : 'Re-link is required. Open the audit trail for details.'}
      </p>
      <div className="hairline my-4" />
      <button onClick={() => navigate('/admin/audit')} className="text-[12px] font-semibold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] inline-flex items-center gap-1 link-underline">
        Open audit trail <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}

function InboxPanel({ items, role, navigate }: {
  items: { title: string; subtitle: string; route: string; icon: typeof Inbox; tone: 'urgent' | 'default' }[]
  role: PlatformRole
  navigate: (p: string) => void
}) {
  const empty = items.length === 0
  const homeRoute = role === 'data_contributor' || role === 'plant_manager' ? '/my-tasks'
    : role === 'subsidiary_lead' ? '/workflow/review'
    : '/workflow/approval'
  return (
    <div className="surface-paper overflow-hidden">
      <header className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
            <Inbox className="w-3.5 h-3.5" />
          </span>
          <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">
            Your inbox
          </h3>
        </div>
        {!empty && (
          <button onClick={() => navigate(homeRoute)} className="text-[12px] font-semibold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] inline-flex items-center gap-1 link-underline">
            Open queue <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </header>
      {empty ? (
        <div className="px-5 py-12 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ ...SPRING, delay: 0.2 }}
            className="inline-flex w-12 h-12 rounded-full items-center justify-center mb-3"
            style={{ background: 'var(--accent-green-light)' }}
          >
            <CheckCircle2 className="w-6 h-6 text-[var(--status-ok)]" />
          </motion.div>
          <div className="text-[15px] font-semibold text-[var(--text-primary)]">Inbox zero</div>
          <div className="text-[12.5px] text-[var(--text-tertiary)] mt-1 max-w-xs mx-auto">Nothing needs your attention right now. Enjoy the silence.</div>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {items.map((it, i) => {
            const Icon = it.icon
            return (
              <motion.li key={i} {...slideInLeft(i)}>
                <motion.button
                  whileHover={{ x: 3 }}
                  transition={{ duration: 0.15 }}
                  type="button"
                  onClick={() => navigate(it.route)}
                  className="w-full text-left px-5 py-3.5 flex items-center gap-3 hover:bg-[var(--bg-secondary)] transition-colors group"
                >
                  <span className={`w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 ${
                    it.tone === 'urgent' ? 'bg-[var(--accent-red-light)] text-[var(--status-reject)]' : 'bg-[var(--accent-teal-subtle)] text-[var(--color-brand)]'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold text-[var(--text-primary)] truncate tracking-[-0.005em]">{it.title}</div>
                    <div className="text-[12px] text-[var(--text-tertiary)] truncate mt-0.5">{it.subtitle}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0 transition-transform group-hover:translate-x-1" />
                </motion.button>
              </motion.li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function PlantCoverage({ stats, navigate }: {
  stats: Array<{ plant: { id: string; name: string; country?: string }; total: number; approved: number; inReview: number; pending: number; pct: number }>
  navigate: (p: string) => void
}) {
  if (stats.length === 0) return null
  return (
    <div className="surface-paper overflow-hidden">
      <header className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
            <Factory className="w-3.5 h-3.5" />
          </span>
          <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">Plant coverage</h3>
        </div>
        <button onClick={() => navigate('/aggregator')} className="text-[12px] font-semibold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] inline-flex items-center gap-1 link-underline">
          Group rollup <ArrowRight className="w-3 h-3" />
        </button>
      </header>
      <ul className="divide-y divide-[var(--border-subtle)]">
        {stats.map((s, i) => {
          const barColor = s.pct === 100 ? 'var(--status-ok)' : s.pct >= 50 ? 'var(--color-brand)' : s.total === 0 ? 'var(--border-strong)' : 'var(--status-draft)'
          return (
            <motion.li key={s.plant.id} {...riseIn(i)} className="px-5 py-3 flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[13.5px] font-semibold text-[var(--text-primary)] truncate tracking-[-0.005em]">{s.plant.name}</span>
                  {s.plant.country && <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-[0.1em] font-medium">{s.plant.country}</span>}
                </div>
                {s.total === 0 ? (
                  <div className="text-[11.5px] text-[var(--text-tertiary)] italic">No assignments yet</div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                      <motion.div {...barFill(s.pct, 0.2 + i * 0.04)} className="h-full rounded-full" style={{ background: barColor, boxShadow: s.pct > 0 ? `0 0 6px ${barColor}40` : 'none' }} />
                    </div>
                    <span className="text-[11px] tabular-nums text-[var(--text-tertiary)] flex-shrink-0">
                      {s.approved}<span className="text-[var(--text-quaternary)]">/{s.total}</span>
                    </span>
                  </div>
                )}
              </div>
              <div className="text-[14.5px] text-[var(--text-primary)] tabular-nums font-bold w-14 text-right tracking-[-0.01em]">
                <AnimatedNumber value={s.pct} />%
              </div>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}

function ActivityPanel({ activity, entities }: {
  activity: QuestionAssignment[]
  entities: Array<{ id: string; name: string }>
}) {
  return (
    <div className="surface-paper overflow-hidden">
      <header className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
            <Activity className="w-3.5 h-3.5" />
          </span>
          <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">Activity · last 7 days</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[10.5px] text-[var(--text-tertiary)] uppercase tracking-[0.12em] font-semibold">
          <span className="signal-dot" />
          Live
        </span>
      </header>
      {activity.length === 0 ? (
        <div className="px-5 py-10 text-center text-[12.5px] text-[var(--text-tertiary)]">No transitions in the last 7 days.</div>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {activity.map((a, i) => (
            <motion.li key={a.id} {...slideInLeft(i)} className="px-5 py-3 flex items-center gap-3">
              <StatusDot status={a.status} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-[var(--text-primary)] truncate leading-snug">
                  <strong className="font-semibold">{a.assigneeName}</strong>{' '}
                  <span className="text-[var(--text-tertiary)]">{statusVerb(a.status)}</span>{' '}
                  <span className="font-mono text-[var(--color-brand)] font-semibold">{a.gri_code}</span>
                </div>
                <div className="text-[11.5px] text-[var(--text-tertiary)] truncate mt-0.5">{entityName(entities, a.entityId)}</div>
              </div>
              <span className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1 flex-shrink-0 tabular-nums">
                <Calendar className="w-3 h-3" />
                {relativeTime(a.last_updated)}
              </span>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EmissionsSnapshot({
  s1, s2, s3, total,
}: {
  s1: { value: number; count: number }
  s2: { value: number; count: number }
  s3: { value: number; count: number }
  total: number
}) {
  if (s1.count + s2.count + s3.count === 0) {
    return (
      <div className="surface-outlined p-6">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
            <Flame className="w-3.5 h-3.5" />
          </span>
          <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">GHG emissions</h3>
        </div>
        <p className="text-[12.5px] text-[var(--text-tertiary)] leading-relaxed mt-3">
          No approved Scope 1/2/3 figures yet. As contributors submit and officers approve GRI 305 assignments, totals appear here.
        </p>
      </div>
    )
  }
  return (
    <div className="surface-paper p-6">
      <header className="mb-5">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
            <Flame className="w-3.5 h-3.5" />
          </span>
          <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">GHG emissions</h3>
        </div>
      </header>
      <div className="mb-5">
        <div className="text-[10px] uppercase tracking-[0.12em] font-semibold text-[var(--text-tertiary)]">Total · approved</div>
        <div className="text-[36px] leading-none font-bold mt-1.5 tracking-[-0.02em] text-[var(--text-primary)] tabular-nums flex items-baseline gap-2">
          <AnimatedNumber value={total} format={formatBig} />
          <span className="text-[13px] text-[var(--text-tertiary)] font-medium">tCO₂e</span>
        </div>
      </div>
      <div className="space-y-3.5">
        <ScopeRow icon={Flame} label="Scope 1 · direct" color="#1B6B7B" item={s1} total={total} delay={0.1} />
        <ScopeRow icon={Zap} label="Scope 2 · electricity" color="#2563EB" item={s2} total={total} delay={0.2} />
        <ScopeRow icon={Wind} label="Scope 3 · value chain" color="#7C3AED" item={s3} total={total} delay={0.3} />
      </div>
      <div className="hairline mt-5 mb-3" />
      <p className="text-[11px] text-[var(--text-tertiary)] italic">
        Summed from approved assignments in this framework scope.
      </p>
    </div>
  )
}

function ScopeRow({ icon: Icon, label, color, item, total, delay }: {
  icon: typeof Flame
  label: string
  color: string
  item: { value: number; count: number }
  total: number
  delay: number
}) {
  const pct = total === 0 ? 0 : Math.round((item.value / total) * 100)
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="inline-flex items-center gap-2 text-[12.5px] text-[var(--text-secondary)] font-medium">
          <span className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center" style={{ background: `${color}15` }}>
            <Icon className="w-3 h-3" style={{ color }} />
          </span>
          {label}
        </span>
        <span className="text-[13px] font-bold tabular-nums text-[var(--text-primary)]">{formatBig(item.value)}</span>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
          <motion.div {...barFill(pct, delay)} className="h-full rounded-full" style={{ background: color, boxShadow: pct > 0 ? `0 0 6px ${color}55` : 'none' }} />
        </div>
        <span className="text-[10.5px] text-[var(--text-tertiary)] tabular-nums w-14 text-right">
          {item.count === 0 ? '—' : `${item.count} items`}
        </span>
      </div>
    </div>
  )
}

function AtRiskPanel({ assignments, navigate }: {
  assignments: QuestionAssignment[]
  navigate: (p: string) => void
}) {
  const now = Date.now()
  const overdue = assignments.filter(a => a.due_date && new Date(a.due_date).getTime() < now && a.status !== 'approved')
  const rejected = assignments.filter(a => a.status === 'rejected')
  const staleDrafts = assignments.filter(a => {
    if (a.status !== 'in_progress' || !a.last_updated) return false
    return (now - new Date(a.last_updated).getTime()) > 7 * 24 * 60 * 60 * 1000
  })
  const missingEvidence = assignments.filter(a => a.status === 'submitted' && (!a.evidence_ids || a.evidence_ids.length === 0))
  const total = overdue.length + rejected.length + staleDrafts.length + missingEvidence.length
  if (total === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING}
        className="surface-paper p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(46,125,50,0.04) 0%, transparent 60%)' }}
      >
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-8 h-8 rounded-[9px] flex items-center justify-center" style={{ background: 'var(--accent-green-light)', color: 'var(--status-ok)' }}>
            <CheckCircle2 className="w-4 h-4" />
          </span>
          <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">All clear</h3>
        </div>
        <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed">No overdue items, no rejections, no stale drafts.</p>
      </motion.div>
    )
  }
  const rows: { label: string; hint: string; tone: 'reject' | 'draft'; onClick: () => void }[] = []
  if (overdue.length > 0) rows.push({ label: `${overdue.length} overdue`, hint: overdue.map(a => a.gri_code).slice(0, 3).join(', ') + (overdue.length > 3 ? '…' : ''), tone: 'reject', onClick: () => navigate('/admin/assignments') })
  if (rejected.length > 0) rows.push({ label: `${rejected.length} rejected`, hint: 'Sent back to plants for rework', tone: 'reject', onClick: () => navigate('/my-tasks') })
  if (missingEvidence.length > 0) rows.push({ label: `${missingEvidence.length} missing evidence`, hint: 'Submitted without supporting docs', tone: 'draft', onClick: () => navigate('/workflow/review') })
  if (staleDrafts.length > 0) rows.push({ label: `${staleDrafts.length} stale draft${staleDrafts.length > 1 ? 's' : ''}`, hint: 'Saved > 7 days ago, never submitted', tone: 'draft', onClick: () => navigate('/my-tasks') })

  return (
    <div className="surface-paper overflow-hidden" style={{ borderColor: 'rgba(198,40,40,0.18)' }}>
      <header className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent-red-light)', color: 'var(--status-reject)' }}>
          <AlertTriangle className="w-3.5 h-3.5" />
        </span>
        <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">Attention needed <span className="text-[var(--text-tertiary)] font-medium">· {total}</span></h3>
      </header>
      <ul className="divide-y divide-[var(--border-subtle)]">
        {rows.map((r, i) => (
          <motion.li key={r.label} {...slideInLeft(i)}>
            <motion.button whileHover={{ x: 3 }} transition={{ duration: 0.15 }} type="button" onClick={r.onClick} className="w-full text-left px-5 py-3 flex items-center justify-between gap-3 hover:bg-[var(--bg-secondary)] group">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold tracking-[-0.005em]" style={{ color: r.tone === 'reject' ? 'var(--status-reject)' : 'var(--status-draft)' }}>{r.label}</div>
                <div className="text-[11.5px] text-[var(--text-tertiary)] truncate mt-0.5">{r.hint}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0 transition-transform group-hover:translate-x-1" />
            </motion.button>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

function RoleCheatsheet({ role }: { role: PlatformRole }) {
  const meta = ROLE_CATALOG[role]
  return (
    <div className="surface-paper p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)' }}>
      <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--text-tertiary)] mb-2">
        <UserCog className="w-3 h-3" /> You're signed in as
      </div>
      <div className="text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">{meta.name}</div>
      <p className="text-[12px] text-[var(--text-tertiary)] mt-1.5 leading-relaxed">{meta.description}</p>
    </div>
  )
}

// ─── SBTi — animated ring ─────────────────────────────────

function SbtiTracker({
  targets, currentEmissions, onManage,
}: {
  targets: OrgTarget[]
  currentEmissions: number
  onManage: () => void
}) {
  const t = targets.find(x => x.kind === 'sbti_near_term') ?? targets[0]
  if (!t) {
    return (
      <div className="surface-outlined p-6 h-full">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-8 h-8 rounded-[9px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
            <TargetIcon className="w-4 h-4" />
          </span>
          <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">SBTi target</h3>
        </div>
        <p className="text-[12.5px] text-[var(--text-tertiary)] leading-relaxed mt-3">
          No climate target set yet. Commit to a science-based target so progress can be tracked on every reporting cycle.
        </p>
        <Button variant="brand" size="sm" className="mt-4" icon={<ArrowRight className="w-3.5 h-3.5" />} iconPosition="right" onClick={onManage}>
          Set target
        </Button>
      </div>
    )
  }

  const baseline = Number(t.baseline_value)
  const targetValue = baseline * (1 - t.target_reduction_pct / 100)
  const current = currentEmissions > 0 ? currentEmissions : baseline
  const reducedAbsolute = baseline - current
  const requiredReduction = baseline - targetValue
  const progressPct = requiredReduction <= 0 ? 0 : Math.max(0, Math.min(100, (reducedAbsolute / requiredReduction) * 100))
  const thisYear = new Date().getFullYear()
  const yearsElapsed = thisYear - t.baseline_year
  const totalYears = t.target_year - t.baseline_year
  const expectedPct = totalYears <= 0 ? 0 : Math.max(0, Math.min(100, (yearsElapsed / totalYears) * 100))
  const onTrack = progressPct >= expectedPct - 5
  const statusBadge = t.status === 'validated' ? 'SBTi validated' : t.status === 'committed' ? 'Committed' : t.status === 'achieved' ? 'Achieved' : 'Missed'

  const radius = 54
  const circumference = 2 * Math.PI * radius
  const strokeColor = onTrack ? '#10B981' : '#EF4444'

  return (
    <div className="surface-paper overflow-hidden h-full">
      <header className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-[9px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
            <TargetIcon className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <span className="kicker !mb-0">Climate · SBTi</span>
            <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] truncate tracking-[-0.01em] mt-0.5">{t.label}</h3>
          </div>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full flex-shrink-0 ${
          t.status === 'validated' ? 'bg-[var(--accent-green-light)] text-[var(--status-ok)]'
          : t.status === 'committed' ? 'bg-[var(--accent-blue-light)] text-[var(--status-pending)]'
          : t.status === 'achieved' ? 'bg-[var(--accent-green-light)] text-[var(--status-ok)]'
          : 'bg-[var(--accent-red-light)] text-[var(--status-reject)]'
        }`}>
          {statusBadge}
        </span>
      </header>

      <div className="p-5 grid grid-cols-[140px_1fr] gap-5 items-center">
        <div className="relative w-[140px] h-[140px]">
          <svg width={140} height={140} viewBox="0 0 140 140">
            <defs>
              <linearGradient id="sbti-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={1} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <circle cx={70} cy={70} r={radius} fill="none" stroke="var(--bg-tertiary)" strokeWidth={10} />
            <circle
              cx={70} cy={70} r={radius} fill="none"
              stroke="var(--border-strong)" strokeWidth={2}
              strokeDasharray={`${(expectedPct / 100) * circumference} ${circumference}`}
              transform="rotate(-90 70 70)"
              opacity={0.35}
            />
            <motion.circle
              cx={70} cy={70} r={radius} fill="none"
              stroke="url(#sbti-gradient)" strokeWidth={10} strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - (progressPct / 100) * circumference }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              transform="rotate(-90 70 70)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[30px] font-bold leading-none" style={{ color: strokeColor, fontVariantNumeric: 'tabular-nums' }}>
              <AnimatedNumber value={Math.round(progressPct)} />%
            </div>
            <div className="text-[9px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold mt-1">progress</div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-[12px] font-bold text-[var(--text-primary)]">
            {t.target_reduction_pct}% reduction by {t.target_year}
          </div>
          <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
            {t.scope_coverage} · baseline {t.baseline_year}
          </div>
          <div className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-2 ${onTrack ? 'bg-[var(--accent-green-light)] text-[var(--status-ok)]' : 'bg-[var(--accent-red-light)] text-[var(--status-reject)]'}`}>
            {onTrack ? 'On track' : 'Behind pathway'} (expected {Math.round(expectedPct)}%)
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <StatCell label="Reduced" value={reducedAbsolute > 0 ? formatBig(reducedAbsolute) : '—'} tone="ok" />
            <StatCell label="Remaining" value={formatBig(Math.max(0, requiredReduction - reducedAbsolute))} />
            <StatCell label="Years left" value={String(Math.max(0, t.target_year - thisYear))} />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCell({ label, value, tone }: { label: string; value: string; tone?: 'ok' }) {
  const color = tone === 'ok' ? 'var(--status-ok)' : 'var(--text-primary)'
  return (
    <div className="p-2.5 rounded-[8px] bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
      <div className="text-[9.5px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] font-semibold">{label}</div>
      <div className="text-[14.5px] font-bold tabular-nums mt-1 tracking-[-0.01em]" style={{ color }}>{value}</div>
    </div>
  )
}

function MaterialityPanel({ topics, assignments }: { topics: MaterialTopic[]; assignments: QuestionAssignment[] }) {
  const material = topics.filter(t => t.dma_status === 'material')
  const assessed = topics.filter(t => t.dma_status === 'assessed')
  const totalAssessed = material.length + assessed.length
  const assignedCodes = new Set(assignments.map(a => a.gri_code.split(' ')[0]))
  const coverageMap = material.map(t => {
    const codes = t.linked_gri_codes || []
    const covered = codes.filter(c => assignedCodes.has(c)).length
    return { topic: t, covered, total: codes.length }
  })

  if (topics.length === 0) {
    return (
      <div className="surface-outlined p-6 h-full">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-8 h-8 rounded-[9px] flex items-center justify-center" style={{ background: 'var(--accent-purple-light)', color: 'var(--accent-purple)' }}>
            <Scale className="w-4 h-4" />
          </span>
          <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">Materiality</h3>
        </div>
        <p className="text-[12.5px] text-[var(--text-tertiary)] leading-relaxed mt-3">
          No material topics set. Run a GRI 3 materiality assessment (or a CSRD double-materiality assessment for Phase 2).
        </p>
      </div>
    )
  }

  return (
    <div className="surface-paper overflow-hidden h-full">
      <header className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-purple-light)', color: 'var(--accent-purple)' }}>
            <Scale className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <span className="kicker !mb-0">Materiality · GRI 3 / DMA</span>
            <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] truncate tracking-[-0.01em] mt-0.5">
              {material.length} material · {assessed.length} assessed · {topics.length - totalAssessed - topics.filter(t=>t.dma_status==='not_material').length} pending
            </h3>
          </div>
        </div>
      </header>

      <div className="p-5 space-y-3">
        <div className="relative h-[160px] rounded bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] border border-[var(--border-subtle)] overflow-hidden">
          <div className="absolute top-2 left-2.5 text-[8px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold">Impact ↑</div>
          <div className="absolute bottom-2 right-2.5 text-[8px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold">Financial →</div>
          <span className="absolute top-0 bottom-0 left-1/2 w-px bg-[var(--border-subtle)]" />
          <span className="absolute left-0 right-0 top-1/2 h-px bg-[var(--border-subtle)]" />
          <span aria-hidden className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-br from-[var(--color-brand-soft)]/0 via-transparent to-[var(--color-brand-soft)]/30" />
          {topics.filter(t => t.impact_score != null && t.financial_score != null).map((t, i) => {
            const x = ((t.financial_score! - 1) / 4) * 88 + 6
            const y = 94 - ((t.impact_score! - 1) / 4) * 88
            const color = t.dma_status === 'material' ? 'var(--color-brand)'
              : t.dma_status === 'not_material' ? 'var(--text-tertiary)'
              : 'var(--status-pending)'
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: t.dma_status === 'not_material' ? 0.4 : 1, scale: 1 }}
                transition={{ ...SPRING, delay: 0.3 + i * 0.04 }}
                className="absolute rounded-full border-2 border-white shadow-sm cursor-pointer"
                style={{
                  left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)',
                  width: t.dma_status === 'material' ? 12 : 9,
                  height: t.dma_status === 'material' ? 12 : 9,
                  background: color,
                }}
                whileHover={{ scale: 1.4, zIndex: 10 }}
                title={`${t.topic_name} · I:${t.impact_score} F:${t.financial_score} · ${t.dma_status}`}
              />
            )
          })}
        </div>

        <div className="flex items-center gap-3 text-[9px] text-[var(--text-tertiary)]">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--color-brand)]" /> Material</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--status-pending)]" /> Assessed</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--text-tertiary)]/40" /> Not material</span>
        </div>

        {coverageMap.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">
              Coverage of material topics
            </div>
            <ul className="space-y-1">
              {coverageMap.slice(0, 6).map((c, i) => {
                const pct = c.total === 0 ? 0 : Math.round((c.covered / c.total) * 100)
                const tone = pct === 100 ? 'var(--status-ok)' : pct >= 50 ? 'var(--status-pending)' : 'var(--status-draft)'
                return (
                  <motion.li key={c.topic.id} {...slideInLeft(i)} className="flex items-center gap-2 text-[10px]">
                    <span className="text-[var(--text-primary)] font-medium truncate flex-1">{c.topic.topic_name}</span>
                    <div className="w-20 h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden flex-shrink-0">
                      <motion.div {...barFill(pct, 0.3 + i * 0.05)} className="h-full rounded-full" style={{ background: tone }} />
                    </div>
                    <span className="tabular-nums text-[var(--text-tertiary)] w-10 text-right">{c.covered}/{c.total}</span>
                  </motion.li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: QuestionAssignment['status'] }) {
  const color = status === 'approved' ? 'var(--status-ok)'
    : status === 'rejected' ? 'var(--status-reject)'
    : status === 'submitted' || status === 'reviewed' ? 'var(--status-pending)'
    : status === 'in_progress' ? 'var(--status-draft)'
    : 'var(--text-tertiary)'
  return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
}

function statusVerb(s: QuestionAssignment['status']): string {
  switch (s) {
    case 'approved': return 'approved'
    case 'rejected': return 'rejected'
    case 'submitted': return 'submitted'
    case 'reviewed': return 'reviewed'
    case 'in_progress': return 'saved a draft for'
    case 'not_started': return 'was assigned'
  }
}

function entityName(entities: Array<{ id: string; name: string }>, entityId: string): string {
  return entities.find(e => e.id === entityId)?.name ?? '—'
}

function relativeTime(iso: string | undefined): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}
