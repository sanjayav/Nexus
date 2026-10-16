import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Leaf, Pencil, Plus, Trash2, Zap } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Tabs } from '../design-system'
import { useAuth } from '../auth/AuthContext'
import { hasPermission } from '../lib/rbac'
import {
  greenLedger,
  type CarbonCredit, type CarbonCreditInput, type CarbonCreditStandard,
  type GreenCertificate, type GreenCertificateInput, type GreenInstrumentType, type GreenLedgerTotals,
} from '../lib/api'
import { StateBoundary, StatLedger, StatusPill, notify, useConfirm, SkeletonLedger, SkeletonTable } from '../components/ui'
import { useFmt } from '../lib/fmt'
import { dur, ease } from '../motion/tokens'

/** Table rows can't animate height; they fade in and slide out to the right. */
const rowMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: dur.fast, ease: ease.out } },
  exit: { opacity: 0, x: 24, transition: { duration: dur.base, ease: ease.out } },
}
import SideSheet from '../components/settings/SideSheet'
import { FieldError, FieldInput, FieldSelect, Switch } from '../components/settings/primitives'

type Kind = 'eac' | 'credit'
const INSTRUMENTS: GreenInstrumentType[] = ['gec', 'green_power_trade', 'irec', 'ppa', 'other']
const STANDARDS: CarbonCreditStandard[] = ['CCER', 'CEA', 'VCS', 'GS', 'CDM', 'other']
const SOURCES = ['wind', 'solar', 'hydro', 'biomass', 'nuclear', 'other'] as const

/**
 * Green power & carbon credits ledger (/data/green-ledger).
 * Energy attribute certificates (绿证 / 绿电交易 / I-REC / PPA) feed
 * market-based Scope 2; retired carbon credits (CCER, CEA, VCS…) feed the
 * exchange climate disclosure. Totals are computed server-side
 * (api/_greenLedger.ts) — this page never re-derives them.
 */
export default function GreenLedger() {
  const { t } = useTranslation()
  const f = useFmt()
  const { permissions } = useAuth()
  const canEdit = hasPermission(permissions, 'data.upload')
  const confirm = useConfirm()
  const [params, setParams] = useSearchParams()
  const thisYear = new Date().getFullYear()
  const year = Number(params.get('year')) || thisYear
  const tab: Kind = params.get('tab') === 'credits' ? 'credit' : 'eac'

  const [certs, setCerts] = useState<GreenCertificate[]>([])
  const [credits, setCredits] = useState<CarbonCredit[]>([])
  const [totals, setTotals] = useState<GreenLedgerTotals | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadedYear, setLoadedYear] = useState<number | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [editing, setEditing] = useState<{ kind: Kind; row: GreenCertificate | CarbonCredit | null } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await greenLedger.list(year)
      setCerts(r.certificates)
      setCredits(r.credits)
      setTotals(r.totals)
      setLoadedYear(year)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [year])
  useEffect(() => { void load() }, [load])

  /** Totals depend on every row, so re-read them after each change. */
  const refreshTotals = useCallback(async () => {
    try { setTotals(await greenLedger.totals(year)) } catch { /* keep previous totals; next load corrects */ }
  }, [year])

  const setParam = (key: string, value: string | null) =>
    setParams((p) => {
      const n = new URLSearchParams(p)
      if (value == null) n.delete(key)
      else n.set(key, value)
      return n
    })

  const remove = async (kind: Kind, row: GreenCertificate | CarbonCredit) => {
    const label = kind === 'eac'
      ? (row as GreenCertificate).certificate_id ?? t(`greenLedger.instruments.${(row as GreenCertificate).instrument_type}`)
      : (row as CarbonCredit).registry_id ?? (row as CarbonCredit).project_name ?? (row as CarbonCredit).standard
    const ok = await confirm({
      title: t(kind === 'eac' ? 'greenLedger.delete.certTitle' : 'greenLedger.delete.creditTitle', { label }),
      description: t('greenLedger.delete.body'),
      confirmLabel: t('greenLedger.delete.confirm'),
      tone: 'destructive',
    })
    if (!ok) return
    try {
      if (kind === 'eac') {
        await greenLedger.removeCertificate(row.id)
        setCerts((rs) => rs.filter((r) => r.id !== row.id))
      } else {
        await greenLedger.removeCredit(row.id)
        setCredits((rs) => rs.filter((r) => r.id !== row.id))
      }
      notify.success(t('greenLedger.delete.done'))
      void refreshTotals()
    } catch (e) {
      notify.error(t('greenLedger.delete.failed'), { description: e instanceof Error ? e.message : undefined })
    }
  }

  const onSaved = (kind: Kind, row: GreenCertificate | CarbonCredit, created: boolean) => {
    if (kind === 'eac') setCerts((rs) => (created ? [row as GreenCertificate, ...rs] : rs.map((r) => (r.id === row.id ? (row as GreenCertificate) : r))))
    else setCredits((rs) => (created ? [row as CarbonCredit, ...rs] : rs.map((r) => (r.id === row.id ? (row as CarbonCredit) : r))))
    setEditing(null)
    void refreshTotals()
  }

  const s2 = totals?.market_based_scope2
  const cn = totals?.cn_sse_climate
  const years = [thisYear + 1, thisYear, thisYear - 1, thisYear - 2, thisYear - 3]

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        title={t('greenLedger.title')}
        description={t('greenLedger.description')}
        actions={
          <div className="flex items-center gap-2">
            <FieldSelect
              aria-label={t('greenLedger.year')}
              value={String(year)}
              onChange={(v) => setParam('year', v === String(thisYear) ? null : v)}
              className="w-28"
              options={years.map((y) => ({ value: String(y), label: t('greenLedger.fy', { year: y }) }))}
            />
            {canEdit && (
              <button type="button" className="btn-primary h-10" onClick={() => setEditing({ kind: tab, row: null })}>
                <Plus className="h-4 w-4" aria-hidden />
                {tab === 'eac' ? t('greenLedger.addCert') : t('greenLedger.addCredit')}
              </button>
            )}
          </div>
        }
      />

      <StateBoundary
        loading={loading}
        error={error}
        hasData={loadedYear === year}
        onRetry={load}
        errorState={{ title: t('greenLedger.loadError') }}
        skeleton={<div className="space-y-6"><SkeletonLedger items={4} /><SkeletonTable rows={4} /></div>}
      >
        {() => (
          <div className="space-y-6">
            <StatLedger
              aria-label={t('greenLedger.ledgerAria', { year })}
              items={[
                { id: 'certified', label: t('greenLedger.kpi.certified'), value: totals?.certificates.total_mwh ?? 0, unit: 'MWh', tone: 'brand', format: 'integer',
                  hint: totals && totals.certificates.total_mwh > 0 ? t('greenLedger.kpi.certifiedHint', { gec: f.number(totals.certificates.by_type.gec ?? 0, { maxFraction: 0 }), trade: f.number(totals.certificates.by_type.green_power_trade ?? 0, { maxFraction: 0 }) }) : t('greenLedger.kpi.none') },
                { id: 'scope2', label: t('greenLedger.kpi.scope2'), value: s2?.market_based_tco2e ?? t('greenLedger.kpi.needsElectricity'), unit: s2?.market_based_tco2e != null ? 'tCO₂e' : undefined, tone: 'neutral', format: 'integer',
                  hint: s2?.residual_factor_kg_per_kwh != null ? t('greenLedger.kpi.scope2Hint', { factor: f.number(s2.residual_factor_kg_per_kwh, { maxFraction: 4 }) }) : undefined },
                { id: 'credits', label: t('greenLedger.kpi.credits'), value: totals?.credits.retired_tco2e ?? 0, unit: 'tCO₂e', tone: 'success', format: 'integer',
                  hint: t('greenLedger.kpi.ccerHint', { value: f.number(totals?.credits.ccer_retired_tco2e ?? 0, { maxFraction: 0 }) }) },
                { id: 'share', label: t('greenLedger.kpi.share'), value: cn?.renewable_share_pct ?? t('greenLedger.kpi.notAvailable'), unit: cn?.renewable_share_pct != null ? '%' : undefined, tone: 'info', format: 'number', precision: 1 },
              ]}
            />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <Scope2Panel totals={totals} year={year} />
              <ExchangeBlock totals={totals} />
            </div>

            <section aria-labelledby="ledger-records" className="surface-paper overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <h2 id="ledger-records" className="sr-only">{t('greenLedger.records')}</h2>
                <Tabs
                  aria-label={t('greenLedger.records')}
                  activeTab={tab}
                  onChange={(id) => setParam('tab', id === 'credit' ? 'credits' : null)}
                  tabs={[
                    { id: 'eac', label: t('greenLedger.tabs.eac'), count: certs.length },
                    { id: 'credit', label: t('greenLedger.tabs.credit'), count: credits.length },
                  ]}
                />
                <p className="text-caption text-[var(--text-tertiary)]">{tab === 'eac' ? t('greenLedger.tabs.eacHint') : t('greenLedger.tabs.creditHint')}</p>
              </div>
              {tab === 'eac' ? (
                <CertTable rows={certs} canEdit={canEdit} onEdit={(r) => setEditing({ kind: 'eac', row: r })} onDelete={(r) => remove('eac', r)} onAdd={() => setEditing({ kind: 'eac', row: null })} />
              ) : (
                <CreditTable rows={credits} canEdit={canEdit} onEdit={(r) => setEditing({ kind: 'credit', row: r })} onDelete={(r) => remove('credit', r)} onAdd={() => setEditing({ kind: 'credit', row: null })} />
              )}
            </section>
          </div>
        )}
      </StateBoundary>

      {editing?.kind === 'eac' && (
        <CertSheet year={year} row={editing.row as GreenCertificate | null} onClose={() => setEditing(null)} onSaved={(r, created) => onSaved('eac', r, created)} />
      )}
      {editing?.kind === 'credit' && (
        <CreditSheet year={year} row={editing.row as CarbonCredit | null} onClose={() => setEditing(null)} onSaved={(r, created) => onSaved('credit', r, created)} />
      )}
    </div>
  )
}

/* ── Market-based Scope 2 ────────────────────────────────────────────── */

function Scope2Panel({ totals, year }: { totals: GreenLedgerTotals | null; year: number }) {
  const { t } = useTranslation()
  const f = useFmt()
  const s2 = totals?.market_based_scope2
  const purchased = s2?.purchased_mwh ?? null
  const certified = s2?.applied_certified_mwh ?? 0
  const pct = purchased && purchased > 0 ? Math.min(100, (certified / purchased) * 100) : 0
  const over = s2 && purchased != null && s2.certified_mwh > purchased

  return (
    <section aria-labelledby="scope2-title" className="surface-paper p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="scope2-title" className="type-h3 text-[var(--text-primary)]">{t('greenLedger.scope2.title')}</h2>
          <p className="mt-0.5 text-small text-[var(--text-secondary)]">{t('greenLedger.scope2.subtitle', { year })}</p>
        </div>
        <Zap className="h-5 w-5 flex-shrink-0 text-[var(--text-quaternary)]" aria-hidden />
      </div>

      {purchased == null ? (
        <div className="mt-5 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] p-4">
          <p className="text-small font-medium text-[var(--text-primary)]">{t('greenLedger.scope2.noElectricityTitle')}</p>
          <p className="mt-1 text-small text-[var(--text-secondary)]">{t('greenLedger.scope2.noElectricityBody')}</p>
          <Link to="/data" className="mt-3 inline-flex items-center gap-1.5 text-small font-semibold text-[var(--color-brand)] hover:underline underline-offset-2">
            {t('greenLedger.scope2.addElectricity')} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      ) : (
        <>
          {/* The one authored moment: certified power fills the purchased-electricity bar. */}
          <div className="mt-5">
            <div className="flex items-baseline justify-between gap-2 text-caption text-[var(--text-tertiary)]">
              <span>{t('greenLedger.scope2.covered', { pct: f.number(pct, { maxFraction: 1 }) })}</span>
              <span className="tabular-nums">{f.number(purchased, { maxFraction: 0 })} MWh</span>
            </div>
            <div
              className="mt-2 flex h-3 overflow-hidden rounded-full bg-[var(--bg-tertiary)]"
              role="img"
              aria-label={t('greenLedger.scope2.barAria', { certified: f.number(certified, { maxFraction: 0 }), purchased: f.number(purchased, { maxFraction: 0 }) })}
            >
              <motion.div
                className="h-full rounded-full bg-[var(--chart-s2)]"
                initial={{ width: '0%' }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: ease.out, delay: 0.1 }}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-caption text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--chart-s2)]" aria-hidden />{t('greenLedger.scope2.legendCertified')}</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--bg-tertiary)] ring-1 ring-[var(--border-strong)]" aria-hidden />{t('greenLedger.scope2.legendResidual')}</span>
            </div>
          </div>

          <dl className="mt-5 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)] text-small">
            <Row label={t('greenLedger.scope2.purchased')} value={`${f.number(purchased, { maxFraction: 1 })} MWh`} />
            <Row label={t('greenLedger.scope2.certifiedApplied')} value={`− ${f.number(certified, { maxFraction: 1 })} MWh`} />
            <Row label={t('greenLedger.scope2.residual')} value={`${f.number(s2?.residual_mwh, { maxFraction: 1 })} MWh`} />
            <Row label={t('greenLedger.scope2.factor')} value={s2?.residual_factor_kg_per_kwh != null ? `× ${f.number(s2.residual_factor_kg_per_kwh, { maxFraction: 4 })} kgCO₂/kWh` : '—'} />
            <Row strong label={t('greenLedger.scope2.result')} value={s2?.market_based_tco2e != null ? `${f.number(s2.market_based_tco2e, { maxFraction: 1 })} tCO₂e` : '—'} />
          </dl>
          {over && <p className="mt-3 text-caption text-[var(--status-warning)]">{t('greenLedger.scope2.overClaim', { certified: f.number(s2!.certified_mwh, { maxFraction: 0 }) })}</p>}
          {s2?.note && <p className="mt-3 text-caption text-[var(--text-tertiary)]">{s2.note}</p>}
        </>
      )}
    </section>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className={strong ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}>{label}</dt>
      <dd className={`tabular-nums whitespace-nowrap ${strong ? 'type-h3 text-[var(--text-primary)]' : 'text-[var(--text-primary)]'}`}>{value}</dd>
    </div>
  )
}

/* ── Exchange climate disclosure block ───────────────────────────────── */

function ExchangeBlock({ totals }: { totals: GreenLedgerTotals | null }) {
  const { t } = useTranslation()
  const f = useFmt()
  const cn = totals?.cn_sse_climate
  const rows: Array<{ key: string; value: string }> = [
    { key: 'creditsRetired', value: `${f.number(cn?.carbon_credits_retired_tco2e ?? 0, { maxFraction: 1 })} tCO₂e` },
    { key: 'ccerRetired', value: `${f.number(cn?.ccer_retired_tco2e ?? 0, { maxFraction: 1 })} tCO₂e` },
    { key: 'gec', value: `${f.number(cn?.green_certificate_mwh ?? 0, { maxFraction: 1 })} MWh` },
    { key: 'trade', value: `${f.number(cn?.green_power_trade_mwh ?? 0, { maxFraction: 1 })} MWh` },
    { key: 'share', value: cn?.renewable_share_pct != null ? `${f.number(cn.renewable_share_pct, { maxFraction: 1 })}%` : t('greenLedger.kpi.notAvailable') },
  ]
  return (
    <section aria-labelledby="exchange-title" className="surface-paper p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="exchange-title" className="type-h3 text-[var(--text-primary)]">{t('greenLedger.exchange.title')}</h2>
          <p className="mt-0.5 text-small text-[var(--text-secondary)]">{t('greenLedger.exchange.subtitle')}</p>
        </div>
        <Leaf className="h-5 w-5 flex-shrink-0 text-[var(--text-quaternary)]" aria-hidden />
      </div>
      <dl className="mt-4 divide-y divide-[var(--border-subtle)] text-small">
        {rows.map((r) => (
          <div key={r.key} className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="text-[var(--text-secondary)]">{t(`greenLedger.exchange.rows.${r.key}`)}</dt>
            <dd className="tabular-nums whitespace-nowrap text-[var(--text-primary)]">{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-caption text-[var(--text-tertiary)]">{t('greenLedger.exchange.note')}</p>
    </section>
  )
}

/* ── Tables ──────────────────────────────────────────────────────────── */

function RowActions({ onEdit, onDelete, label }: { onEdit: () => void; onDelete: () => void; label: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
      <button type="button" onClick={onEdit} aria-label={t('greenLedger.editRow', { label })} title={t('common.edit')}
        className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]">
        <Pencil className="h-4 w-4" />
      </button>
      <button type="button" onClick={onDelete} aria-label={t('greenLedger.deleteRow', { label })} title={t('common.delete')}
        className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:bg-[var(--status-danger-soft)] hover:text-[var(--status-danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function CertTable({ rows, canEdit, onEdit, onDelete, onAdd }: { rows: GreenCertificate[]; canEdit: boolean; onEdit: (r: GreenCertificate) => void; onDelete: (r: GreenCertificate) => void; onAdd: () => void }) {
  const { t } = useTranslation()
  const f = useFmt()
  if (rows.length === 0) {
    return (
      <div className="p-4">
        <StateBoundary empty emptyState={{ art: 'connect', title: t('greenLedger.empty.certTitle'), body: t('greenLedger.empty.certBody'), cta: canEdit ? { label: t('greenLedger.addCert'), onClick: onAdd, icon: <Plus className="h-4 w-4" /> } : undefined, density: 'compact' }}>{null}</StateBoundary>
      </div>
    )
  }
  return (
    <div className="max-h-[560px] overflow-auto">
      <table className="data-table min-w-[760px]">
        <thead>
          <tr>
            <th className="sticky top-0 z-[1]">{t('greenLedger.cols.instrument')}</th>
            <th className="sticky top-0 z-[1]">{t('greenLedger.cols.certificate')}</th>
            <th className="sticky top-0 z-[1]">{t('greenLedger.cols.period')}</th>
            <th className="sticky top-0 z-[1]">{t('greenLedger.cols.source')}</th>
            <th className="sticky top-0 z-[1] num">{t('greenLedger.cols.mwh')}</th>
            <th className="sticky top-0 z-[1]"><span className="sr-only">{t('common.actions')}</span></th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {rows.map((r) => (
              <motion.tr key={r.id} layout="position" {...rowMotion} className="group">
                <td>
                  <div className="font-medium text-[var(--text-primary)] whitespace-nowrap">{t(`greenLedger.instruments.${r.instrument_type}`)}</div>
                  {r.supplier && <div className="text-caption text-[var(--text-tertiary)] truncate max-w-[220px]">{r.supplier}</div>}
                </td>
                <td className="font-mono text-caption whitespace-nowrap">{r.certificate_id ?? '—'}</td>
                <td className="whitespace-nowrap">{f.date(r.period_start, { style: 'medium' })} – {f.date(r.period_end, { style: 'medium' })}</td>
                <td className="whitespace-nowrap">
                  {[r.energy_source ? t(`greenLedger.sources.${r.energy_source}`, { defaultValue: r.energy_source }) : null, r.province].filter(Boolean).join(' · ') || '—'}
                </td>
                <td className="num font-medium text-[var(--text-primary)]">{f.number(r.mwh, { maxFraction: 1 })}</td>
                <td className="w-[96px]">{canEdit && <RowActions label={r.certificate_id ?? t(`greenLedger.instruments.${r.instrument_type}`)} onEdit={() => onEdit(r)} onDelete={() => onDelete(r)} />}</td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  )
}

function CreditTable({ rows, canEdit, onEdit, onDelete, onAdd }: { rows: CarbonCredit[]; canEdit: boolean; onEdit: (r: CarbonCredit) => void; onDelete: (r: CarbonCredit) => void; onAdd: () => void }) {
  const { t } = useTranslation()
  const f = useFmt()
  if (rows.length === 0) {
    return (
      <div className="p-4">
        <StateBoundary empty emptyState={{ art: 'target', title: t('greenLedger.empty.creditTitle'), body: t('greenLedger.empty.creditBody'), cta: canEdit ? { label: t('greenLedger.addCredit'), onClick: onAdd, icon: <Plus className="h-4 w-4" /> } : undefined, density: 'compact' }}>{null}</StateBoundary>
      </div>
    )
  }
  return (
    <div className="max-h-[560px] overflow-auto">
      <table className="data-table min-w-[820px]">
        <thead>
          <tr>
            <th className="sticky top-0 z-[1]">{t('greenLedger.cols.standard')}</th>
            <th className="sticky top-0 z-[1]">{t('greenLedger.cols.project')}</th>
            <th className="sticky top-0 z-[1]">{t('greenLedger.cols.vintage')}</th>
            <th className="sticky top-0 z-[1]">{t('greenLedger.cols.status')}</th>
            <th className="sticky top-0 z-[1] num">{t('greenLedger.cols.tco2e')}</th>
            <th className="sticky top-0 z-[1]"><span className="sr-only">{t('common.actions')}</span></th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {rows.map((r) => (
              <motion.tr key={r.id} layout="position" {...rowMotion} className="group">
                <td>
                  <span className="chip h-6 px-2 font-semibold text-[var(--text-primary)]">{t(`greenLedger.standards.${r.standard}`)}</span>
                </td>
                <td>
                  <div className="font-medium text-[var(--text-primary)] truncate max-w-[280px]">{r.project_name ?? '—'}</div>
                  {r.registry_id && <div className="font-mono text-caption text-[var(--text-tertiary)] whitespace-nowrap">{r.registry_id}</div>}
                </td>
                <td className="tabular-nums whitespace-nowrap">{r.vintage ?? '—'}</td>
                <td className="whitespace-nowrap">
                  {r.retired ? (
                    <span className="inline-flex items-center gap-2">
                      <StatusPill tone="success">{t('greenLedger.retired')}</StatusPill>
                      {r.retired_on && <span className="text-caption text-[var(--text-tertiary)]">{f.date(r.retired_on, { style: 'medium' })}</span>}
                    </span>
                  ) : (
                    <StatusPill tone="neutral">{t('greenLedger.held')}</StatusPill>
                  )}
                </td>
                <td className="num font-medium text-[var(--text-primary)]">{f.number(r.tco2e, { maxFraction: 1 })}</td>
                <td className="w-[96px]">{canEdit && <RowActions label={r.registry_id ?? r.project_name ?? r.standard} onEdit={() => onEdit(r)} onDelete={() => onDelete(r)} />}</td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  )
}

/* ── Forms ───────────────────────────────────────────────────────────── */

function Field({ id, label, hint, error, children, span = 1 }: { id: string; label: string; hint?: string; error?: string | null; children: React.ReactNode; span?: 1 | 2 }) {
  return (
    <div className={span === 2 ? 'sm:col-span-2' : ''}>
      <label htmlFor={id} className="block text-small font-medium text-[var(--text-primary)]">{label}</label>
      {hint && <p className="text-caption text-[var(--text-tertiary)]">{hint}</p>}
      <div className="mt-1.5">{children}</div>
      <FieldError id={`${id}-err`}>{error}</FieldError>
    </div>
  )
}

function SheetFooter({ busy, onCancel, form, label }: { busy: boolean; onCancel: () => void; form: string; label: string }) {
  const { t } = useTranslation()
  return (
    <>
      <button type="button" className="btn-secondary h-10" onClick={onCancel} disabled={busy}>{t('common.cancel')}</button>
      <button type="submit" form={form} className="btn-primary h-10" disabled={busy}>
        {busy && <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent" aria-hidden />}
        {label}
      </button>
    </>
  )
}

function num(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v.replace(/,/g, ''))
  return Number.isFinite(n) ? n : NaN
}

function CertSheet({ year, row, onClose, onSaved }: { year: number; row: GreenCertificate | null; onClose: () => void; onSaved: (r: GreenCertificate, created: boolean) => void }) {
  const { t } = useTranslation()
  const [v, setV] = useState({
    instrument_type: row?.instrument_type ?? 'gec' as GreenInstrumentType,
    mwh: row ? String(row.mwh) : '',
    period_start: row?.period_start?.slice(0, 10) ?? `${year}-01-01`,
    period_end: row?.period_end?.slice(0, 10) ?? `${year}-12-31`,
    certificate_id: row?.certificate_id ?? '',
    supplier: row?.supplier ?? '',
    energy_source: row?.energy_source ?? '',
    province: row?.province ?? '',
    notes: row?.notes ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [tried, setTried] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const set = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }))

  const mwh = num(v.mwh)
  const errors = {
    mwh: mwh == null || Number.isNaN(mwh) || mwh <= 0 ? t('greenLedger.form.mwhInvalid') : null,
    period: !v.period_start || !v.period_end || v.period_end < v.period_start ? t('greenLedger.form.periodInvalid') : null,
  }
  const invalid = Object.values(errors).some(Boolean)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (invalid) return
    setBusy(true)
    setServerError(null)
    const input: GreenCertificateInput = {
      instrument_type: v.instrument_type,
      mwh: mwh as number,
      period_start: v.period_start,
      period_end: v.period_end,
      certificate_id: v.certificate_id.trim() || null,
      supplier: v.supplier.trim() || null,
      energy_source: v.energy_source || null,
      province: v.province.trim() || null,
      notes: v.notes.trim() || null,
    }
    try {
      const r = row ? await greenLedger.updateCertificate(row.id, input) : await greenLedger.addCertificate(input)
      notify.success(row ? t('greenLedger.toast.certUpdated') : t('greenLedger.toast.certAdded'))
      onSaved(r.certificate, !row)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SideSheet
      open
      onClose={onClose}
      busy={busy}
      title={row ? t('greenLedger.form.certEditTitle') : t('greenLedger.form.certTitle')}
      description={t('greenLedger.form.certDescription')}
      footer={<SheetFooter busy={busy} onCancel={onClose} form="cert-form" label={row ? t('greenLedger.form.save') : t('greenLedger.addCert')} />}
    >
      <form id="cert-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field id="cert-type" label={t('greenLedger.form.instrument')} span={2}>
          <FieldSelect id="cert-type" value={v.instrument_type} onChange={(x) => set('instrument_type', x)} options={INSTRUMENTS.map((i) => ({ value: i, label: t(`greenLedger.instruments.${i}`) }))} />
        </Field>
        <Field id="cert-mwh" label={t('greenLedger.form.mwh')} error={tried ? errors.mwh : null}>
          <FieldInput id="cert-mwh" inputMode="decimal" mono value={v.mwh} onChange={(x) => set('mwh', x)} placeholder="1000" invalid={tried && !!errors.mwh} aria-describedby="cert-mwh-err" />
        </Field>
        <Field id="cert-id" label={t('greenLedger.form.certificateId')}>
          <FieldInput id="cert-id" mono value={v.certificate_id} onChange={(x) => set('certificate_id', x)} placeholder="GEC-2026-…" />
        </Field>
        <Field id="cert-start" label={t('greenLedger.form.periodStart')} error={tried ? errors.period : null}>
          <FieldInput id="cert-start" type="date" value={v.period_start} onChange={(x) => set('period_start', x)} invalid={tried && !!errors.period} />
        </Field>
        <Field id="cert-end" label={t('greenLedger.form.periodEnd')}>
          <FieldInput id="cert-end" type="date" value={v.period_end} onChange={(x) => set('period_end', x)} invalid={tried && !!errors.period} />
        </Field>
        <Field id="cert-source" label={t('greenLedger.form.source')}>
          <FieldSelect id="cert-source" value={v.energy_source} onChange={(x) => set('energy_source', x)} options={[{ value: '', label: '—' }, ...SOURCES.map((s) => ({ value: s, label: t(`greenLedger.sources.${s}`) }))]} />
        </Field>
        <Field id="cert-province" label={t('greenLedger.form.province')}>
          <FieldInput id="cert-province" value={v.province} onChange={(x) => set('province', x)} placeholder={t('greenLedger.form.provincePlaceholder')} />
        </Field>
        <Field id="cert-supplier" label={t('greenLedger.form.supplier')} span={2}>
          <FieldInput id="cert-supplier" value={v.supplier} onChange={(x) => set('supplier', x)} placeholder={t('greenLedger.form.supplierPlaceholder')} />
        </Field>
        <Field id="cert-notes" label={t('greenLedger.form.notes')} span={2}>
          <textarea id="cert-notes" rows={3} value={v.notes} onChange={(e) => set('notes', e.target.value)} className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-small text-[var(--text-primary)] focus:outline-none focus-visible:border-[var(--color-brand)] focus-visible:ring-2 focus-visible:ring-[var(--status-success-line)]" />
        </Field>
        {serverError && <p role="alert" className="sm:col-span-2 text-small text-[var(--status-danger)] break-words">{serverError}</p>}
      </form>
    </SideSheet>
  )
}

function CreditSheet({ year, row, onClose, onSaved }: { year: number; row: CarbonCredit | null; onClose: () => void; onSaved: (r: CarbonCredit, created: boolean) => void }) {
  const { t } = useTranslation()
  const [v, setV] = useState({
    standard: row?.standard ?? 'CCER' as CarbonCreditStandard,
    tco2e: row ? String(row.tco2e) : '',
    vintage: row?.vintage != null ? String(row.vintage) : '',
    registry_id: row?.registry_id ?? '',
    project_name: row?.project_name ?? '',
    project_type: row?.project_type ?? '',
    retired: row?.retired ?? true,
    retired_on: row?.retired_on?.slice(0, 10) ?? '',
    reporting_year: row?.reporting_year != null ? String(row.reporting_year) : String(year),
    purpose: row?.purpose ?? '',
    notes: row?.notes ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [tried, setTried] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }))

  const amount = num(v.tco2e)
  const vintage = num(v.vintage)
  const ry = num(v.reporting_year)
  const errors = {
    tco2e: amount == null || Number.isNaN(amount) || amount <= 0 ? t('greenLedger.form.tco2eInvalid') : null,
    vintage: vintage != null && (Number.isNaN(vintage) || vintage < 2000 || vintage > 2100) ? t('greenLedger.form.yearInvalid') : null,
    reporting_year: ry != null && (Number.isNaN(ry) || ry < 2000 || ry > 2100) ? t('greenLedger.form.yearInvalid') : null,
  }
  const invalid = Object.values(errors).some(Boolean)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (invalid) return
    setBusy(true)
    setServerError(null)
    const input: CarbonCreditInput = {
      standard: v.standard,
      tco2e: amount as number,
      vintage: vintage ?? null,
      registry_id: v.registry_id.trim() || null,
      project_name: v.project_name.trim() || null,
      project_type: v.project_type.trim() || null,
      retired: v.retired,
      retired_on: v.retired && v.retired_on ? v.retired_on : null,
      reporting_year: ry ?? null,
      purpose: v.purpose.trim() || null,
      notes: v.notes.trim() || null,
    }
    try {
      const r = row ? await greenLedger.updateCredit(row.id, input) : await greenLedger.addCredit(input)
      notify.success(row ? t('greenLedger.toast.creditUpdated') : t('greenLedger.toast.creditAdded'))
      onSaved(r.credit, !row)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SideSheet
      open
      onClose={onClose}
      busy={busy}
      title={row ? t('greenLedger.form.creditEditTitle') : t('greenLedger.form.creditTitle')}
      description={t('greenLedger.form.creditDescription')}
      footer={<SheetFooter busy={busy} onCancel={onClose} form="credit-form" label={row ? t('greenLedger.form.save') : t('greenLedger.addCredit')} />}
    >
      <form id="credit-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field id="cr-standard" label={t('greenLedger.form.standard')}>
          <FieldSelect id="cr-standard" value={v.standard} onChange={(x) => set('standard', x as CarbonCreditStandard)} options={STANDARDS.map((s) => ({ value: s, label: t(`greenLedger.standards.${s}`) }))} />
        </Field>
        <Field id="cr-amount" label={t('greenLedger.form.tco2e')} error={tried ? errors.tco2e : null}>
          <FieldInput id="cr-amount" inputMode="decimal" mono value={v.tco2e} onChange={(x) => set('tco2e', x)} placeholder="1000" invalid={tried && !!errors.tco2e} aria-describedby="cr-amount-err" />
        </Field>
        <Field id="cr-project" label={t('greenLedger.form.project')} span={2}>
          <FieldInput id="cr-project" value={v.project_name} onChange={(x) => set('project_name', x)} placeholder={t('greenLedger.form.projectPlaceholder')} />
        </Field>
        <Field id="cr-registry" label={t('greenLedger.form.registryId')}>
          <FieldInput id="cr-registry" mono value={v.registry_id} onChange={(x) => set('registry_id', x)} placeholder="CCER-…" />
        </Field>
        <Field id="cr-type" label={t('greenLedger.form.projectType')}>
          <FieldInput id="cr-type" value={v.project_type} onChange={(x) => set('project_type', x)} placeholder={t('greenLedger.form.projectTypePlaceholder')} />
        </Field>
        <Field id="cr-vintage" label={t('greenLedger.form.vintage')} error={tried ? errors.vintage : null}>
          <FieldInput id="cr-vintage" inputMode="numeric" mono value={v.vintage} onChange={(x) => set('vintage', x)} placeholder="2024" invalid={tried && !!errors.vintage} />
        </Field>
        <Field id="cr-ry" label={t('greenLedger.form.reportingYear')} error={tried ? errors.reporting_year : null}>
          <FieldInput id="cr-ry" inputMode="numeric" mono value={v.reporting_year} onChange={(x) => set('reporting_year', x)} invalid={tried && !!errors.reporting_year} />
        </Field>
        <div className="sm:col-span-2 flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] px-4 py-3">
          <label htmlFor="cr-retired" className="min-w-0">
            <span className="block text-small font-medium text-[var(--text-primary)]">{t('greenLedger.form.retired')}</span>
            <span className="block text-caption text-[var(--text-tertiary)]">{t('greenLedger.form.retiredHint')}</span>
          </label>
          <Switch id="cr-retired" checked={v.retired} onChange={(x) => set('retired', x)} />
        </div>
        <AnimatePresence initial={false}>
          {v.retired && (
            <motion.div key="retired-on" className="sm:col-span-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: dur.fast, ease: ease.out }} style={{ overflow: 'hidden' }}>
              <Field id="cr-retired-on" label={t('greenLedger.form.retiredOn')}>
                <FieldInput id="cr-retired-on" type="date" value={v.retired_on} onChange={(x) => set('retired_on', x)} className="sm:w-56" />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>
        <Field id="cr-purpose" label={t('greenLedger.form.purpose')} span={2}>
          <FieldInput id="cr-purpose" value={v.purpose} onChange={(x) => set('purpose', x)} placeholder={t('greenLedger.form.purposePlaceholder')} />
        </Field>
        <Field id="cr-notes" label={t('greenLedger.form.notes')} span={2}>
          <textarea id="cr-notes" rows={3} value={v.notes} onChange={(e) => set('notes', e.target.value)} className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-small text-[var(--text-primary)] focus:outline-none focus-visible:border-[var(--color-brand)] focus-visible:ring-2 focus-visible:ring-[var(--status-success-line)]" />
        </Field>
        {serverError && <p role="alert" className="sm:col-span-2 text-small text-[var(--status-danger)] break-words">{serverError}</p>}
      </form>
    </SideSheet>
  )
}

