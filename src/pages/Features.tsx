import {
  Calculator,
  FileSpreadsheet,
  ShieldCheck,
  Building2,
  ClipboardList,
  Sparkles,
  Database,
  Workflow,
} from 'lucide-react'
import MarketingShell from '../components/marketing/MarketingShell'
import FeatureGrid, { type Feature } from '../components/marketing/FeatureGrid'
import CTABand from '../components/marketing/CTABand'
import { FadeIn, Stagger, StaggerItem } from '../components/MotionPrimitives'

/**
 * /features — deeper feature listing organised by job role.
 * Each role gets a 2-column row: text + a visual illustration block.
 */

interface RoleSection {
  role: string
  blurb: string
  bullets: { icon: typeof Calculator; title: string; body: string }[]
}

const ROLES: RoleSection[] = [
  {
    role: 'Carbon accountants',
    blurb: 'Get every emission factor, every conversion, every Scope 3 category right — and audit-traced.',
    bullets: [
      { icon: Calculator, title: 'GHG Protocol calculators', body: '10+ modules covering Scope 1, 2, and all 15 Scope 3 categories.' },
      { icon: Database, title: 'EF library with versioning', body: 'DEFRA, EPA, IPCC, plus custom factors. Older reports stay locked to their original factors.' },
      { icon: FileSpreadsheet, title: 'Excel-style bulk entry', body: 'Paste from your existing spreadsheet; we map columns and validate units.' },
    ],
  },
  {
    role: 'ESG managers',
    blurb: 'Coordinate dozens of contributors across frameworks without ever leaving the platform.',
    bullets: [
      { icon: Workflow, title: 'Assignments + reminders', body: 'Assign disclosures to subsidiaries, set deadlines, escalate when they slip.' },
      { icon: Sparkles, title: 'AI narrative drafts', body: 'Claude drafts disclosure prose from your actual data, ready for human edit.' },
      { icon: ClipboardList, title: 'Cross-framework mapping', body: 'One GRI disclosure can answer ESRS, ISSB, and SEC questions — automatically.' },
    ],
  },
  {
    role: 'Auditors',
    blurb: 'Read-only access with full lineage on every number. No screenshare marathons.',
    bullets: [
      { icon: ShieldCheck, title: 'Blockchain proof per disclosure', body: 'Every published number is hashed and anchored. Tamper-evident on demand.' },
      { icon: ClipboardList, title: 'Evidence chain of custody', body: 'Click any figure → see the source PDF, the contributor, the approver, the timestamps.' },
      { icon: Workflow, title: 'Audit-only role', body: 'Granular RBAC — auditors see published data, never drafts or in-flight values.' },
    ],
  },
  {
    role: 'Plant managers',
    blurb: 'Answer assigned questions in 5 minutes a month, not 5 hours.',
    bullets: [
      { icon: Building2, title: 'Plant-scoped tasks', body: 'Only see what you own. No 200-question questionnaires.' },
      { icon: FileSpreadsheet, title: 'Connector ingestion', body: 'Pull from SAP, Sage, AWS, Azure billing, energy meters — set it once and forget.' },
      { icon: Sparkles, title: 'Anomaly detection', body: 'AI flags unusual values before they reach the group rollup.' },
    ],
  },
]

const PLATFORM_FEATURES: Feature[] = [
  { icon: ShieldCheck, title: 'SOC 2 + GDPR',           body: 'SOC 2 Type II in progress. ISO 27001 mapping. Full DPA + subprocessor list.' },
  { icon: Database,    title: 'Multi-region residency', body: 'EU (Frankfurt) and US (Virginia). Self-hosted Terraform module available.' },
  { icon: Workflow,    title: 'Approvals chain',         body: 'Configurable review/approval workflow with delegated permissions.' },
  { icon: Sparkles,    title: 'AI safety layer',         body: 'No customer data leaves your tenant to train models. Every AI output is human-reviewed.' },
]

export default function Features() {
  return (
    <MarketingShell>
      {/* Header */}
      <section className="pt-16 pb-12 sm:pt-24 sm:pb-16">
        <div className="max-w-[920px] mx-auto px-5 sm:px-8 text-center">
          <FadeIn>
            <p
              className="text-[12px] font-semibold uppercase tracking-[0.15em] mb-4"
              style={{ color: 'var(--accent-600)' }}
            >
              Features
            </p>
            <h1
              className="h-display"
              style={{
                fontSize: 'clamp(2rem, 4.5vw, 3rem)',
                color: 'var(--text-primary)',
                lineHeight: 1.1,
              }}
            >
              Built for every role on the sustainability team.
            </h1>
            <p
              className="mt-5 text-[17px] leading-relaxed mx-auto max-w-[680px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              From carbon accountants chasing emission factors to auditors verifying disclosures —
              Nexus gives each role exactly the surface they need, with the data linked underneath.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Role-by-role sections */}
      <div className="max-w-[1180px] mx-auto px-5 sm:px-8 space-y-20 sm:space-y-28">
        {ROLES.map((role, idx) => (
          <section key={role.role}>
            <div
              className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
                idx % 2 === 1 ? 'lg:[&>div:first-child]:order-2' : ''
              }`}
            >
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-3"
                  style={{ color: 'var(--accent-600)' }}
                >
                  For {role.role}
                </p>
                <h2
                  className="h-display mb-4"
                  style={{
                    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                    color: 'var(--text-primary)',
                    lineHeight: 1.2,
                  }}
                >
                  {role.blurb}
                </h2>
                <Stagger className="mt-6 space-y-5" staggerMs={60}>
                  {role.bullets.map((b) => (
                    <StaggerItem key={b.title}>
                      <div className="flex items-start gap-4">
                        <div
                          className="flex-shrink-0 w-10 h-10 rounded-[10px] flex items-center justify-center"
                          style={{
                            background: 'color-mix(in srgb, var(--accent-500) 12%, transparent)',
                            color: 'var(--accent-600)',
                          }}
                        >
                          <b.icon className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3
                            className="text-[15px] font-semibold tracking-tight mb-1"
                            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                          >
                            {b.title}
                          </h3>
                          <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            {b.body}
                          </p>
                        </div>
                      </div>
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>

              {/* Illustration block */}
              <div
                className="relative rounded-[16px] border overflow-hidden aspect-[4/3] flex items-center justify-center"
                style={{
                  background:
                    'linear-gradient(160deg, color-mix(in srgb, var(--accent-500) 10%, var(--bg-primary)) 0%, var(--bg-primary) 70%)',
                  borderColor: 'var(--border-default)',
                }}
              >
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-50"
                  style={{
                    backgroundImage:
                      'linear-gradient(var(--border-subtle) 1px, transparent 1px), ' +
                      'linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                    maskImage: 'radial-gradient(circle at 50% 50%, black 35%, transparent 80%)',
                  }}
                />
                <div
                  className="relative z-10 text-[11px] font-semibold uppercase tracking-[0.15em]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {role.role.toUpperCase()} VIEW
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Platform-wide capabilities */}
      <div className="mt-20">
        <FeatureGrid
          eyebrow="Platform-wide"
          heading="Enterprise foundations, included."
          features={PLATFORM_FEATURES}
          columns={2}
        />
      </div>

      <CTABand
        heading="See it on your own data."
        primary={{ label: 'Start free trial', to: '/login?mode=register' }}
        secondary={{ label: 'Talk to sales', to: '/contact' }}
      />
    </MarketingShell>
  )
}
