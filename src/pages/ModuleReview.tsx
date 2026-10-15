import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle, XCircle, AlertTriangle, Info, FileText, Shield, ExternalLink, Clock, User, MessageSquare, ArrowLeft, GitCompare, KeyRound, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { mockData } from '../data/mockData'
import { fmt, useFormat, useStrings } from '../i18n'
import { moduleReviewStrings } from '../i18n/pages/moduleReview'
import { moduleCatalogStrings } from '../i18n/pages/moduleCatalog'
import { PageHeader, Card, CardHeader, Button, Badge, Tabs, EmptyState, inputClass, Tone } from '../components/ui'

type TabId = 'diffs' | 'findings' | 'proofs' | 'approvals'

// Mock validation findings (message/suggestion text lives in the dictionary, by index)
const FINDINGS = [
  { severity: 'error', rule: 'GRI-2-27-REQ', field: 'GRI 2-27' },
  { severity: 'warning', rule: 'GRI-3-3-MATERIAL', field: 'GRI 3-3' },
  { severity: 'info', rule: 'BEST-PRACTICE', field: 'GRI 2-22' },
]

// Mock approval history (comment text lives in the dictionary, by index)
const APPROVAL_HISTORY = [
  { did: 'did:ethr:0x1234...5678', role: 'Reviewer', decision: 'approved', timestamp: '2024-11-10T14:30:00Z', vcHash: '0xabcd...ef01' },
  { did: 'did:ethr:0xabcd...ef01', role: 'Analyst', decision: 'submitted', timestamp: '2024-11-10T10:15:00Z', vcHash: '0x1234...5678' },
]

const SEVERITY: Record<string, { tone: Tone; icon: LucideIcon; iconClass: string }> = {
  error: { tone: 'danger', icon: XCircle, iconClass: 'bg-rose-50 text-rose-600' },
  warning: { tone: 'warning', icon: AlertTriangle, iconClass: 'bg-amber-50 text-amber-600' },
  info: { tone: 'info', icon: Info, iconClass: 'bg-sky-50 text-sky-600' },
}

const DECISION_TONE: Record<string, Tone> = { approved: 'success', rejected: 'danger', submitted: 'info' }

export default function ModuleReview() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const navigate = useNavigate()
  const s = useStrings(moduleReviewStrings)
  const c = useStrings(moduleCatalogStrings)
  const f = useFormat()
  const [activeTab, setActiveTab] = useState<TabId>('findings')
  const [approvalDecision, setApprovalDecision] = useState<'approve' | 'reject' | null>(null)
  const [comment, setComment] = useState('')

  const module = mockData.modules.find(m => m.id === moduleId)
  const versions = mockData.submissionVersions.filter(v => v.moduleId === moduleId)
  const currentVersion = versions[0]
  const previousVersion = versions[1]

  if (!module) {
    return (
      <Card>
        <EmptyState
          icon={FileText}
          title={c.notFound}
          description={c.notFoundBody}
          action={<Button icon={ArrowLeft} onClick={() => navigate('/modules')}>{c.backToModules}</Button>}
        />
      </Card>
    )
  }

  const reviewStart = new Date('2024-11-10T14:30:00Z')
  const slaDays = Math.floor((Date.now() - reviewStart.getTime()) / (1000 * 60 * 60 * 24))
  const slaOverdue = slaDays > 5

  const moduleName = c.titles[module.id] ?? module.title

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={s.eyebrow}
        title={fmt(s.title, { name: moduleName })}
        description={
          currentVersion
            ? fmt(s.subtitle, { version: currentVersion.version, id: currentVersion.submissionId })
            : c.descriptions[module.id] ?? module.description
        }
        actions={
          <Badge tone={slaOverdue ? 'danger' : 'info'} icon={Clock} className="h-8 px-2.5 text-[13px]">
            {fmt(s.inReviewFor, { days: f.number(slaDays) })}
            {slaOverdue && <span className="font-semibold">· {s.overdue}</span>}
          </Badge>
        }
      />

      <Tabs<TabId>
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { value: 'findings', label: s.tabs.findings, count: FINDINGS.length },
          { value: 'diffs', label: s.tabs.diffs, count: previousVersion ? 12 : 0 },
          { value: 'proofs', label: s.tabs.proofs, count: currentVersion ? 1 : 0 },
          { value: 'approvals', label: s.tabs.approvals, count: APPROVAL_HISTORY.length },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          {activeTab === 'findings' &&
            FINDINGS.map((finding, index) => {
              const sev = SEVERITY[finding.severity]
              const text = s.findings[index]
              return (
                <Card key={finding.rule}>
                  <div className="flex items-start gap-4">
                    <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', sev.iconClass)}>
                      <sev.icon className="w-[18px] h-[18px]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col-reverse sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-zinc-900">{text.message}</h3>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                            <span>{fmt(s.rule, { v: finding.rule })}</span>
                            <span>{fmt(s.field, { v: finding.field })}</span>
                          </div>
                        </div>
                        <Badge tone={sev.tone} className="self-start">{s.severity[finding.severity]}</Badge>
                      </div>
                      <div className="mt-3 rounded-lg bg-zinc-50 border border-line px-3 py-2.5 text-[13px] text-zinc-700">
                        <span className="font-medium text-zinc-900">{s.suggestion}</span>
                        {text.suggestion}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}

          {activeTab === 'diffs' && (
            <Card>
              {previousVersion ? (
                <>
                  <CardHeader title={fmt(s.changesFrom, { version: previousVersion.version })} icon={GitCompare} />
                  <div className="space-y-3">
                    <div className="rounded-lg border border-line p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-zinc-900">{s.diffOrgName}</span>
                        <Badge tone="warning">{s.modified}</Badge>
                      </div>
                      <div className="space-y-1 text-[13px] font-mono">
                        <div className="text-rose-600 bg-rose-50/60 rounded px-2 py-0.5">- Asyad Holdings</div>
                        <div className="text-emerald-700 bg-emerald-50/60 rounded px-2 py-0.5">+ Asyad Group</div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-line p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-zinc-900">{s.diffValueChain}</span>
                        <Badge tone="success">{s.added}</Badge>
                      </div>
                      <div className="text-[13px] font-mono text-emerald-700 bg-emerald-50/60 rounded px-2 py-0.5">+ {s.diffValueChainAdded}</div>
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState icon={GitCompare} title={s.noPrevious} description={s.noPreviousBody} />
              )}
            </Card>
          )}

          {activeTab === 'proofs' && (
            <Card>
              {currentVersion ? (
                <>
                  <CardHeader title={s.proofsTitle} description={s.proofsDesc} icon={KeyRound} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ProofTile label={s.payloadCid}>
                      <code className="text-[13px] text-zinc-900 break-all">{currentVersion.payloadCID}</code>
                      <Button variant="ghost" size="sm" icon={ExternalLink} className="mt-2 -ml-2">{s.viewIpfs}</Button>
                    </ProofTile>
                    <ProofTile label={s.sha256}>
                      <code className="text-[13px] text-zinc-900 break-all">{currentVersion.sha256.slice(0, 32)}…</code>
                    </ProofTile>
                    <ProofTile label={s.merkleRoot}>
                      <code className="text-[13px] text-emerald-700">{currentVersion.merkleRoot}</code>
                    </ProofTile>
                    <ProofTile label={s.transaction}>
                      <code className="text-[13px] text-zinc-900">0x1234...abcd</code>
                      <Button variant="ghost" size="sm" icon={ExternalLink} className="mt-2 -ml-2">{s.viewExplorer}</Button>
                    </ProofTile>
                  </div>
                </>
              ) : (
                <EmptyState icon={KeyRound} title={s.noProofs} description={s.noProofsBody} />
              )}
            </Card>
          )}

          {activeTab === 'approvals' &&
            APPROVAL_HISTORY.map((approval, index) => (
              <Card key={approval.vcHash + index}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-zinc-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-zinc-900">{s.roles[approval.role] ?? approval.role}</div>
                      <code className="block text-xs text-zinc-500 truncate">{approval.did}</code>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone={DECISION_TONE[approval.decision] ?? 'neutral'}>{s.decision[approval.decision] ?? approval.decision}</Badge>
                    <span title={s.signed} aria-label={s.signed}><Shield className="w-4 h-4 text-zinc-400" /></span>
                  </div>
                </div>
                {s.approvalComments[index] && (
                  <p className="rounded-lg bg-zinc-50 border border-line px-3 py-2.5 text-[13px] text-zinc-700 mb-3">{s.approvalComments[index]}</p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                  <span className="tabular">{f.date(approval.timestamp, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  <code>{s.vc}: {approval.vcHash}</code>
                </div>
              </Card>
            ))}
        </div>

        {/* Approval panel */}
        <Card className="lg:sticky lg:top-6">
          <CardHeader title={s.yourApproval} description={s.yourApprovalDesc} icon={ShieldCheck} />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={s.yourApproval}>
              <button
                type="button"
                role="radio"
                aria-checked={approvalDecision === 'approve'}
                onClick={() => setApprovalDecision('approve')}
                className={clsx(
                  'h-10 flex items-center justify-center gap-2 rounded-[10px] text-sm font-medium border transition-colors',
                  approvalDecision === 'approve'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-300'
                    : 'bg-white text-zinc-700 border-line hover:border-zinc-300 hover:bg-zinc-50',
                )}
              >
                <CheckCircle className="w-4 h-4" />
                {s.approve}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={approvalDecision === 'reject'}
                onClick={() => setApprovalDecision('reject')}
                className={clsx(
                  'h-10 flex items-center justify-center gap-2 rounded-[10px] text-sm font-medium border transition-colors',
                  approvalDecision === 'reject'
                    ? 'bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-300'
                    : 'bg-white text-zinc-700 border-line hover:border-zinc-300 hover:bg-zinc-50',
                )}
              >
                <XCircle className="w-4 h-4" />
                {s.reject}
              </button>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="review-comment" className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-700">
                <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                {s.comment}
              </label>
              <textarea
                id="review-comment"
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={4}
                className={clsx(inputClass, 'h-auto py-2.5 resize-none')}
                placeholder={s.commentPlaceholder}
              />
            </div>

            <Button variant="primary" className="w-full" disabled={!approvalDecision}>
              {s.submitDecision}
            </Button>

            <dl className="pt-4 border-t border-line text-xs space-y-2">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-zinc-500">{s.yourDid}</dt>
                <dd><code className="text-zinc-900">did:ethr:0x1234...5678</code></dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-zinc-500">{s.role}</dt>
                <dd className="text-zinc-900">{s.roles.Approver}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-zinc-500">{s.vcHash}</dt>
                <dd><code className="text-emerald-700">0xabcd...ef01</code></dd>
              </div>
            </dl>
          </div>
        </Card>
      </div>
    </div>
  )
}

function ProofTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-zinc-50/60 p-4 min-w-0">
      <div className="text-xs font-medium text-zinc-500 mb-1">{label}</div>
      {children}
    </div>
  )
}
