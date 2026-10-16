import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Check, Globe2, History, MapPin, AlertTriangle } from 'lucide-react'
import type { CrossBorderStatus, ListingVenue, OrgMarket, OrgSettings, OrgSettingsPatch } from '../../lib/api'
import { StateBoundary, StatusPill, notify, SkeletonCard } from '../ui'
import { useFmt } from '../../lib/fmt'
import { spring } from '../../motion/tokens'
import type { OrgSettingsState } from './useOrgSettings'
import {
  FieldError, FieldInput, FieldSelect, Notice, ReadOnlyNote, SaveBar, SettingRow, SettingsCard, SettingsSection,
} from './primitives'

/** Mirrors api/_orgSettings.ts (ICP_PATTERN). */
const ICP_PATTERN = /^[一-龥]ICP[备证]\d{4,12}号(-\d{1,3})?$/
const RESIDENCY = ['us', 'eu', 'apac', 'cn'] as const
const CROSS_BORDER: CrossBorderStatus[] = ['not_assessed', 'no_transfer', 'exempt', 'standard_contract', 'certification', 'security_assessment']
const VENUES: ListingVenue[] = ['SSE', 'SZSE', 'BSE', 'HKEX', 'OTHER']
const TIMEZONES = ['Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore', 'Asia/Tokyo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'UTC']
const CURRENCIES = ['CNY', 'HKD', 'USD', 'EUR', 'GBP', 'SGD', 'JPY']

interface Draft {
  market: OrgMarket
  data_residency_region: string
  icp_number: string
  mlps_level: string
  cross_border_status: string
  timezone: string
  currency: string
  fy_month: string
  fy_day: string
  listing_venues: ListingVenue[]
}

function toDraft(s: OrgSettings): Draft {
  const [m, d] = (s.fiscal_year_end ?? '').split('-')
  return {
    market: s.market,
    data_residency_region: s.data_residency_region ?? '',
    icp_number: s.icp_number ?? '',
    mlps_level: s.mlps_level != null ? String(s.mlps_level) : '',
    cross_border_status: s.cross_border_status ?? '',
    timezone: s.timezone ?? '',
    currency: s.currency ?? '',
    fy_month: m ?? '',
    fy_day: d ?? '',
    listing_venues: s.listing_venues ?? [],
  }
}

function toPatch(d: Draft): OrgSettingsPatch {
  return {
    market: d.market,
    data_residency_region: (d.data_residency_region || null) as OrgSettings['data_residency_region'],
    icp_number: d.icp_number.trim() || null,
    mlps_level: d.mlps_level ? Number(d.mlps_level) : null,
    cross_border_status: (d.cross_border_status || null) as CrossBorderStatus | null,
    timezone: d.timezone || null,
    currency: d.currency || null,
    fiscal_year_end: d.fy_month && d.fy_day ? `${d.fy_month}-${d.fy_day}` : null,
    listing_venues: d.listing_venues.length ? VENUES.filter((v) => d.listing_venues.includes(v)) : null,
  }
}

/** Only the keys that differ from what's stored. */
function diff(a: OrgSettingsPatch, b: OrgSettingsPatch): OrgSettingsPatch {
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(a) as (keyof OrgSettingsPatch)[]) {
    if (JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null)) out[k] = a[k]
  }
  return out as OrgSettingsPatch
}

function daysIn(month: string): number {
  const m = Number(month)
  if (!m) return 31
  return new Date(Date.UTC(2023, m, 0)).getUTCDate() // non-leap year; 02-29 is never a valid FY end
}

export default function MarketSettings({ state, canEdit }: { state: OrgSettingsState; canEdit: boolean }) {
  const { t } = useTranslation()
  const f = useFmt()
  const { data, loading, error, reload, save } = state
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const uid = useId()

  useEffect(() => {
    if (data) setDraft(toDraft(data.settings))
  }, [data])

  const stored = useMemo(() => (data ? toPatch(toDraft(data.settings)) : null), [data])
  const changes = useMemo(() => (draft && stored ? diff(toPatch(draft), stored) : {}), [draft, stored])
  const dirty = Object.keys(changes).length > 0

  const icpInvalid = !!draft?.icp_number.trim() && !ICP_PATTERN.test(draft.icp_number.trim())
  const fyInvalid = !!draft && (!!draft.fy_month !== !!draft.fy_day)
  const valid = !icpInvalid && !fyInvalid

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d))

  const onSave = async () => {
    if (!dirty || !valid) return
    setSaving(true)
    try {
      const r = await save(changes)
      const n = Object.keys(r.changes ?? changes).length
      notify.success(t('market.toast.saved', { count: n }), { description: t('market.toast.audited') })
    } catch (e) {
      notify.error(t('market.toast.failed'), { description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  // Defaults the server applies when a field is left empty (api/_orgSettings.ts → effectiveSettings).
  const defaults = draft
    ? { timezone: draft.market === 'cn' ? 'Asia/Shanghai' : 'UTC', currency: draft.market === 'cn' ? 'CNY' : null }
    : null

  const currencyName = (code: string) => {
    try {
      return new Intl.DisplayNames([f.localeFor()], { type: 'currency' }).of(code) ?? code
    } catch {
      return code
    }
  }
  const monthName = (m: number) =>
    new Intl.DateTimeFormat(f.localeFor(), { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2023, m - 1, 1)))

  const tzOptions = draft && draft.timezone && !TIMEZONES.includes(draft.timezone) ? [draft.timezone, ...TIMEZONES] : TIMEZONES
  const ccyOptions = draft && draft.currency && !CURRENCIES.includes(draft.currency) ? [draft.currency, ...CURRENCIES] : CURRENCIES
  const residencyMismatch = !!draft && draft.market === 'cn' && !!draft.data_residency_region && draft.data_residency_region !== 'cn'
  const disabled = !canEdit || saving

  return (
    <StateBoundary
      loading={loading}
      error={error}
      hasData={!!data}
      onRetry={reload}
      errorState={{ title: t('market.loadError') }}
      skeleton={<div className="grid gap-4 py-2"><SkeletonCard /><SkeletonCard /></div>}
    >
      {() =>
        draft && data && (
          <div>
            {!canEdit && (
              <div className="mb-2">
                <ReadOnlyNote>{t('market.readOnly')}</ReadOnlyNote>
              </div>
            )}

            {/* ── Market ─────────────────────────────────────────── */}
            <SettingsSection
              title={t('market.market.title')}
              description={t('market.market.description')}
              aside={!data.stored ? <StatusPill tone="neutral">{t('market.notSaved')}</StatusPill> : undefined}
            >
              <div role="radiogroup" aria-label={t('market.market.title')} className="grid gap-3 sm:grid-cols-2">
                {(['global', 'cn'] as const).map((m) => {
                  const on = draft.market === m
                  return (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={disabled}
                      onClick={() => set('market', m)}
                      className={`group relative text-left rounded-[var(--radius-xl)] border p-4 sm:p-5 transition-colors duration-150 disabled:cursor-not-allowed
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]
                        ${on ? 'border-transparent bg-[var(--bg-primary)]' : 'border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)]'}`}
                    >
                      {on && (
                        <motion.span
                          layoutId={`market-ring-${uid}`}
                          transition={spring.snappy}
                          aria-hidden
                          className="absolute inset-0 rounded-[var(--radius-xl)] ring-2 ring-[var(--color-brand)] bg-[var(--color-brand-soft)]/40"
                        />
                      )}
                      <span className="relative flex items-start gap-3">
                        <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] ${on ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
                          {m === 'cn' ? <MapPin className="h-4 w-4" /> : <Globe2 className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="text-body font-semibold text-[var(--text-primary)]">{t(`market.market.${m}.label`)}</span>
                            {on && <Check className="h-4 w-4 text-[var(--color-brand)]" aria-hidden />}
                          </span>
                          <span className="mt-1 block text-small text-[var(--text-secondary)]">{t(`market.market.${m}.body`)}</span>
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
              <ul className="mt-4 grid gap-x-6 gap-y-2 text-small text-[var(--text-secondary)] sm:grid-cols-2">
                {(['language', 'ai', 'timezone', 'calendar'] as const).map((k) => (
                  <li key={k} className="flex items-start gap-2">
                    <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--color-brand)]" aria-hidden />
                    <span>{t(`market.market.effects.${draft.market}.${k}`)}</span>
                  </li>
                ))}
              </ul>
            </SettingsSection>

            {/* ── Hosting & compliance ───────────────────────────── */}
            <SettingsSection title={t('market.compliance.title')} description={t('market.compliance.description')}>
              <div className="space-y-3">
                {residencyMismatch && (
                  <Notice tone="warning" icon={<AlertTriangle />} title={t('market.compliance.mismatchTitle')}>
                    {t('market.compliance.mismatchBody')}
                  </Notice>
                )}
                <SettingsCard>
                  <SettingRow
                    label={t('market.fields.residency.label')}
                    hint={t('market.fields.residency.hint')}
                    htmlFor={`${uid}-res`}
                    control={
                      <FieldSelect
                        id={`${uid}-res`}
                        value={draft.data_residency_region}
                        disabled={disabled}
                        onChange={(v) => set('data_residency_region', v)}
                        className="sm:w-60"
                        options={[{ value: '', label: t('market.fields.residency.unset') }, ...RESIDENCY.map((r) => ({ value: r, label: t(`market.fields.residency.options.${r}`) }))]}
                      />
                    }
                  />
                  <SettingRow
                    label={t('market.fields.icp.label')}
                    hint={t('market.fields.icp.hint')}
                    htmlFor={`${uid}-icp`}
                    control={
                      <FieldInput
                        id={`${uid}-icp`}
                        value={draft.icp_number}
                        disabled={disabled}
                        onChange={(v) => set('icp_number', v)}
                        placeholder="京ICP备12345678号-1"
                        invalid={icpInvalid}
                        aria-describedby={icpInvalid ? `${uid}-icp-err` : undefined}
                        className="sm:w-60"
                      />
                    }
                  >
                    <FieldError id={`${uid}-icp-err`}>{icpInvalid ? t('market.fields.icp.invalid') : null}</FieldError>
                  </SettingRow>
                  <SettingRow
                    label={t('market.fields.mlps.label')}
                    hint={t('market.fields.mlps.hint')}
                    htmlFor={`${uid}-mlps`}
                    control={
                      <FieldSelect
                        id={`${uid}-mlps`}
                        value={draft.mlps_level}
                        disabled={disabled}
                        onChange={(v) => set('mlps_level', v)}
                        className="sm:w-60"
                        options={[{ value: '', label: t('market.fields.mlps.unset') }, ...[1, 2, 3, 4, 5].map((l) => ({ value: String(l), label: t(`market.fields.mlps.levels.${l}`) }))]}
                      />
                    }
                  />
                  <SettingRow
                    label={t('market.fields.crossBorder.label')}
                    hint={t('market.fields.crossBorder.hint')}
                    htmlFor={`${uid}-xb`}
                    stack
                    control={
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <FieldSelect
                          id={`${uid}-xb`}
                          value={draft.cross_border_status}
                          disabled={disabled}
                          onChange={(v) => set('cross_border_status', v)}
                          className="sm:max-w-[420px]"
                          options={[{ value: '', label: t('market.fields.crossBorder.unset') }, ...CROSS_BORDER.map((c) => ({ value: c, label: t(`market.fields.crossBorder.options.${c}`) }))]}
                        />
                        <CrossBorderPill status={draft.cross_border_status} />
                      </div>
                    }
                  />
                </SettingsCard>
              </div>
            </SettingsSection>

            {/* ── Locale & reporting calendar ───────────────────── */}
            <SettingsSection title={t('market.locale.title')} description={t('market.locale.description')}>
              <SettingsCard>
                <SettingRow
                  label={t('market.fields.timezone.label')}
                  hint={t('market.fields.timezone.hint')}
                  htmlFor={`${uid}-tz`}
                  control={
                    <FieldSelect
                      id={`${uid}-tz`}
                      value={draft.timezone}
                      disabled={disabled}
                      onChange={(v) => set('timezone', v)}
                      className="sm:w-60"
                      options={[{ value: '', label: t('market.fields.default', { value: defaults?.timezone }) }, ...tzOptions.map((z) => ({ value: z, label: z.replace(/_/g, ' ') }))]}
                    />
                  }
                />
                <SettingRow
                  label={t('market.fields.currency.label')}
                  hint={t('market.fields.currency.hint')}
                  htmlFor={`${uid}-ccy`}
                  control={
                    <FieldSelect
                      id={`${uid}-ccy`}
                      value={draft.currency}
                      disabled={disabled}
                      onChange={(v) => set('currency', v)}
                      className="sm:w-60"
                      options={[
                        { value: '', label: defaults?.currency ? t('market.fields.default', { value: defaults.currency }) : t('market.fields.currency.unset') },
                        ...ccyOptions.map((c) => ({ value: c, label: `${c} · ${currencyName(c)}` })),
                      ]}
                    />
                  }
                />
                <SettingRow
                  label={t('market.fields.fiscalYearEnd.label')}
                  hint={t('market.fields.fiscalYearEnd.hint')}
                  control={
                    <div className="flex gap-2">
                      <FieldSelect
                        aria-label={t('market.fields.fiscalYearEnd.month')}
                        value={draft.fy_month}
                        disabled={disabled}
                        invalid={fyInvalid && !draft.fy_month}
                        onChange={(v) => {
                          const max = daysIn(v)
                          setDraft((d) => (d ? { ...d, fy_month: v, fy_day: v ? (d.fy_day && Number(d.fy_day) <= max ? d.fy_day : String(max).padStart(2, '0')) : '' } : d))
                        }}
                        className="w-40"
                        options={[{ value: '', label: t('market.fields.default', { value: monthName(12) + ' 31' }) }, ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1).padStart(2, '0'), label: monthName(i + 1) }))]}
                      />
                      <FieldSelect
                        aria-label={t('market.fields.fiscalYearEnd.day')}
                        value={draft.fy_day}
                        disabled={disabled || !draft.fy_month}
                        onChange={(v) => set('fy_day', v)}
                        className="w-24"
                        options={[{ value: '', label: '—' }, ...Array.from({ length: daysIn(draft.fy_month) }, (_, i) => ({ value: String(i + 1).padStart(2, '0'), label: String(i + 1) }))]}
                      />
                    </div>
                  }
                />
                <SettingRow label={t('market.fields.venues.label')} hint={t('market.fields.venues.hint')} stack
                  control={
                    <div className="flex flex-wrap gap-2" role="group" aria-label={t('market.fields.venues.label')}>
                      {VENUES.map((v) => {
                        const on = draft.listing_venues.includes(v)
                        return (
                          <button
                            key={v}
                            type="button"
                            aria-pressed={on}
                            disabled={disabled}
                            onClick={() => set('listing_venues', on ? draft.listing_venues.filter((x) => x !== v) : [...draft.listing_venues, v])}
                            className={`chip h-9 px-3 text-small disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] ${on ? 'chip-active' : ''}`}
                          >
                            {on && <Check className="h-3.5 w-3.5" aria-hidden />}
                            {t(`market.fields.venues.options.${v}`)}
                          </button>
                        )
                      })}
                    </div>
                  }
                />
              </SettingsCard>
            </SettingsSection>

            {/* ── Audit note ─────────────────────────────────────── */}
            <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-5 text-caption text-[var(--text-tertiary)] sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" aria-hidden />
                {data.settings.updated_at
                  ? t('market.audit.lastSaved', { when: f.dateTime(data.settings.updated_at) })
                  : t('market.audit.never')}
                {' · '}
                {t('market.audit.note')}
              </span>
              <Link to="/admin/audit" className="font-medium text-[var(--color-brand)] hover:underline underline-offset-2">
                {t('market.audit.view')}
              </Link>
            </div>

            <SaveBar
              dirty={dirty && canEdit}
              saving={saving}
              canSave={valid}
              onSave={onSave}
              onDiscard={() => setDraft(toDraft(data.settings))}
              message={!valid ? t('market.saveBlocked') : t('market.unsaved', { count: Object.keys(changes).length })}
            />
          </div>
        )
      }
    </StateBoundary>
  )
}

function CrossBorderPill({ status }: { status: string }) {
  const { t } = useTranslation()
  if (!status) return <StatusPill tone="warning" dot>{t('market.fields.crossBorder.pill.unset')}</StatusPill>
  const tone = status === 'not_assessed' ? 'warning' : 'success'
  return <StatusPill tone={tone} dot>{t(`market.fields.crossBorder.pill.${status}`)}</StatusPill>
}
