import { useCallback, useEffect, useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Check, KeyRound, Loader2, Pencil, Plus, Send, ServerCog, ShieldOff, Trash2, X } from 'lucide-react'
import { orgWebhooks, type ImChannelId, type OrgWebhook } from '../../lib/api'
import { StateBoundary, StatusPill, notify, useConfirm, SkeletonCard } from '../ui'
import { useFmt } from '../../lib/fmt'
import { dur, ease, iconSwapVariants } from '../../motion/tokens'
import { FieldError, FieldInput, Notice, ReadOnlyNote, Switch } from './primitives'

const CHANNELS: ImChannelId[] = ['dingtalk', 'feishu', 'wecom']

const HOSTS: Record<ImChannelId, string[]> = {
  dingtalk: ['oapi.dingtalk.com'],
  feishu: ['open.feishu.cn', 'open.larksuite.com'],
  wecom: ['qyapi.weixin.qq.com'],
}

/** Notification kinds grouped the way admins think about them (server kind strings in api/org.ts, api/workflow). */
const KIND_GROUPS: Array<{ id: string; kinds: string[] }> = [
  { id: 'assignments', kinds: ['assignment_created', 'assignment_bulk_created'] },
  { id: 'reviews', kinds: ['review_requested', 'review_request'] },
  { id: 'approvals', kinds: ['approval_requested'] },
  { id: 'decisions', kinds: ['approved', 'rejected'] },
  { id: 'discussion', kinds: ['comment', 'mention'] },
]

/** Brand initial tiles: monochrome ink, not vendor colours (no logos shipped). */
const MARK: Record<ImChannelId, string> = { dingtalk: '钉', feishu: '飞', wecom: '企' }

function hostOk(channel: ImChannelId, url: string): boolean {
  try {
    const u = new URL(url.trim())
    return u.protocol === 'https:' && HOSTS[channel].includes(u.hostname)
  } catch {
    return false
  }
}

export default function NotifyChannels({ canEdit }: { canEdit: boolean }) {
  const { t } = useTranslation()
  const [channels, setChannels] = useState<OrgWebhook[]>([])
  const [envFallback, setEnvFallback] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await orgWebhooks.list()
      setChannels(r.channels)
      setEnvFallback(r.env_fallback_active)
      setLoaded(true)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (canEdit) void load()
  }, [canEdit, load])

  if (!canEdit) return <ReadOnlyNote>{t('notifyChannels.readOnly')}</ReadOnlyNote>

  const upsertLocal = (row: OrgWebhook) =>
    setChannels((list) => {
      const rest = list.filter((c) => c.channel !== row.channel)
      return [...rest, row]
    })

  return (
    <StateBoundary
      loading={loading}
      error={error}
      hasData={loaded}
      onRetry={load}
      errorState={{ title: t('notifyChannels.loadError') }}
      skeleton={<div className="grid gap-3"><SkeletonCard /><SkeletonCard /></div>}
    >
      <div className="space-y-3">
        {envFallback && (
          <Notice tone="info" icon={<ServerCog />} title={t('notifyChannels.envFallback.title')}>
            {t('notifyChannels.envFallback.body')}
          </Notice>
        )}
        <ul className="grid gap-3">
          {CHANNELS.map((ch) => (
            <ChannelCard
              key={ch}
              channel={ch}
              row={channels.find((c) => c.channel === ch) ?? null}
              onSaved={upsertLocal}
              onRemoved={() => setChannels((list) => list.filter((c) => c.channel !== ch))}
            />
          ))}
        </ul>
      </div>
    </StateBoundary>
  )
}

function ChannelCard({
  channel,
  row,
  onSaved,
  onRemoved,
}: {
  channel: ImChannelId
  row: OrgWebhook | null
  onSaved: (row: OrgWebhook) => void
  onRemoved: () => void
}) {
  const { t } = useTranslation()
  const f = useFmt()
  const confirm = useConfirm()
  const [editing, setEditing] = useState(false)
  const [testing, setTesting] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [lastTest, setLastTest] = useState<{ ok: boolean; error?: string } | null>(null)

  const sendTest = async () => {
    if (!row) return
    setTesting(true)
    setLastTest(null)
    try {
      const r = await orgWebhooks.test(row.id)
      setLastTest(r)
      onSaved({ ...row, last_test_at: new Date().toISOString(), last_test_ok: r.ok, last_test_error: r.ok ? null : r.error ?? null })
      if (r.ok) notify.success(t('notifyChannels.test.sent', { channel: t(`notifyChannels.channels.${channel}.name`) }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setLastTest({ ok: false, error: msg })
    } finally {
      setTesting(false)
    }
  }

  const toggle = async (enabled: boolean) => {
    if (!row) return
    setToggling(true)
    onSaved({ ...row, enabled })
    try {
      const r = await orgWebhooks.update(row.id, { enabled })
      onSaved(r.channel)
    } catch (e) {
      onSaved(row)
      notify.error(t('notifyChannels.toggleFailed'), { description: e instanceof Error ? e.message : undefined })
    } finally {
      setToggling(false)
    }
  }

  const remove = async () => {
    if (!row) return
    const name = t(`notifyChannels.channels.${channel}.name`)
    const ok = await confirm({
      title: t('notifyChannels.remove.title', { channel: name }),
      description: t('notifyChannels.remove.body'),
      confirmLabel: t('notifyChannels.remove.confirm'),
      tone: 'destructive',
    })
    if (!ok) return
    try {
      await orgWebhooks.remove(row.id)
      onRemoved()
      notify.success(t('notifyChannels.remove.done', { channel: name }))
    } catch (e) {
      notify.error(t('notifyChannels.remove.failed'), { description: e instanceof Error ? e.message : undefined })
    }
  }

  const kindsLabel = (kinds: string[] | null) => {
    if (!kinds || kinds.length === 0) return t('notifyChannels.kinds.all')
    const groups = KIND_GROUPS.filter((g) => g.kinds.some((k) => kinds.includes(k))).map((g) => t(`notifyChannels.kinds.groups.${g.id}`))
    return groups.length ? groups.join(t('notifyChannels.kinds.separator')) : t('notifyChannels.kinds.custom', { count: kinds.length })
  }

  const testResult = lastTest ?? (row?.last_test_at ? { ok: !!row.last_test_ok, error: row.last_test_error ?? undefined } : null)

  return (
    <li className="surface-paper overflow-hidden">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
        <span
          aria-hidden
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg-inverse)] text-body font-semibold text-[var(--sidebar-accent)]"
        >
          {MARK[channel]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-body font-semibold text-[var(--text-primary)]">{t(`notifyChannels.channels.${channel}.name`)}</h3>
            {row ? (
              row.enabled ? <StatusPill tone="success" dot>{t('notifyChannels.status.on')}</StatusPill> : <StatusPill tone="neutral">{t('notifyChannels.status.paused')}</StatusPill>
            ) : (
              <StatusPill tone="neutral">{t('notifyChannels.status.notConnected')}</StatusPill>
            )}
            {row?.label && <span className="text-small text-[var(--text-tertiary)] truncate">· {row.label}</span>}
          </div>
          {row ? (
            <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-small sm:grid-cols-[auto_minmax(0,1fr)]">
              <dt className="text-[var(--text-tertiary)]">{t('notifyChannels.fields.endpoint')}</dt>
              <dd className="min-w-0 truncate font-mono text-caption text-[var(--text-secondary)] leading-5">{row.webhook_hint ?? '—'}</dd>
              <dt className="text-[var(--text-tertiary)]">{t('notifyChannels.fields.signing')}</dt>
              <dd className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                {row.has_secret ? <KeyRound className="h-3.5 w-3.5 text-[var(--status-success)]" aria-hidden /> : <ShieldOff className="h-3.5 w-3.5 text-[var(--text-tertiary)]" aria-hidden />}
                {row.has_secret ? t('notifyChannels.signing.on') : channel === 'wecom' ? t('notifyChannels.signing.notSupported') : t('notifyChannels.signing.off')}
              </dd>
              <dt className="text-[var(--text-tertiary)]">{t('notifyChannels.fields.kinds')}</dt>
              <dd className="text-[var(--text-secondary)]">{kindsLabel(row.kinds)}</dd>
              <dt className="text-[var(--text-tertiary)]">{t('notifyChannels.fields.lastTest')}</dt>
              <dd className="min-w-0 text-[var(--text-secondary)]" aria-live="polite">
                {testing ? (
                  <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />{t('notifyChannels.test.sending')}</span>
                ) : testResult ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={testResult.ok ? 'success' : 'danger'} size="sm">
                      {testResult.ok ? t('notifyChannels.test.ok') : t('notifyChannels.test.failed')}
                    </StatusPill>
                    {row.last_test_at && <span className="text-caption text-[var(--text-tertiary)] whitespace-nowrap">{f.relative(row.last_test_at)}</span>}
                    {!testResult.ok && testResult.error && (
                      <span className="block w-full break-words text-caption text-[var(--status-danger)]">{testResult.error}</span>
                    )}
                  </span>
                ) : (
                  <span className="text-[var(--text-tertiary)]">{t('notifyChannels.test.never')}</span>
                )}
              </dd>
            </dl>
          ) : (
            <p className="mt-1 text-small text-[var(--text-secondary)]">{t(`notifyChannels.channels.${channel}.body`)}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          {row ? (
            <>
              <Switch
                checked={row.enabled}
                disabled={toggling}
                onChange={toggle}
                label={t('notifyChannels.toggleAria', { channel: t(`notifyChannels.channels.${channel}.name`) })}
              />
              <div className="flex items-center gap-1">
                <button type="button" onClick={sendTest} disabled={testing} className="btn-secondary h-9 px-3 text-small">
                  <Send className="h-3.5 w-3.5" aria-hidden />
                  {t('notifyChannels.test.button')}
                </button>
                <IconButton label={t('notifyChannels.edit')} onClick={() => setEditing((v) => !v)} pressed={editing}>
                  <Pencil className="h-4 w-4" />
                </IconButton>
                <IconButton label={t('notifyChannels.remove.button')} onClick={remove} danger>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            </>
          ) : (
            !editing && (
              <button type="button" onClick={() => setEditing(true)} className="btn-secondary h-10">
                <Plus className="h-4 w-4" aria-hidden />
                {t('notifyChannels.connect')}
              </button>
            )
          )}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            key="editor"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: dur.base, ease: ease.out }, opacity: { duration: dur.fast } }}
            style={{ overflow: 'hidden' }}
          >
            <ChannelEditor
              channel={channel}
              row={row}
              onCancel={() => setEditing(false)}
              onSaved={(r) => {
                onSaved(r)
                setEditing(false)
                setLastTest(null)
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

function IconButton({ label, onClick, children, danger, pressed }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean; pressed?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]
        ${danger ? 'text-[var(--text-tertiary)] hover:bg-[var(--status-danger-soft)] hover:text-[var(--status-danger)]' : `text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] ${pressed ? 'bg-[var(--bg-secondary)]' : ''}`}`}
    >
      {children}
    </button>
  )
}

function ChannelEditor({
  channel,
  row,
  onCancel,
  onSaved,
}: {
  channel: ImChannelId
  row: OrgWebhook | null
  onCancel: () => void
  onSaved: (row: OrgWebhook) => void
}) {
  const { t } = useTranslation()
  const uid = useId()
  const [url, setUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [clearSecret, setClearSecret] = useState(false)
  const [label, setLabel] = useState(row?.label ?? '')
  const [allKinds, setAllKinds] = useState(!row?.kinds || row.kinds.length === 0)
  const [groups, setGroups] = useState<string[]>(() =>
    row?.kinds ? KIND_GROUPS.filter((g) => g.kinds.some((k) => row.kinds!.includes(k))).map((g) => g.id) : KIND_GROUPS.map((g) => g.id),
  )
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  const urlRequired = !row
  const urlInvalid = (url.trim() !== '' || (urlRequired && touched)) && !hostOk(channel, url)
  const supportsSecret = channel !== 'wecom'
  const kindsInvalid = !allKinds && groups.length === 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (urlInvalid || (urlRequired && !url.trim()) || kindsInvalid) return
    setSaving(true)
    setServerError(null)
    const kinds = allKinds ? null : KIND_GROUPS.filter((g) => groups.includes(g.id)).flatMap((g) => g.kinds)
    try {
      let saved: OrgWebhook
      if (row) {
        const patch: Parameters<typeof orgWebhooks.update>[1] = { label: label.trim() || null, kinds }
        if (url.trim()) patch.webhook_url = url.trim()
        if (supportsSecret && secret.trim()) patch.secret = secret.trim()
        else if (supportsSecret && clearSecret) patch.secret = null
        saved = (await orgWebhooks.update(row.id, patch)).channel
      } else {
        saved = (
          await orgWebhooks.save({
            channel,
            webhook_url: url.trim(),
            secret: supportsSecret && secret.trim() ? secret.trim() : null,
            label: label.trim() || null,
            enabled: true,
            kinds,
          })
        ).channel
      }
      notify.success(t('notifyChannels.saved', { channel: t(`notifyChannels.channels.${channel}.name`) }), { description: t('notifyChannels.savedHint') })
      onSaved(saved)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-4 sm:px-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`${uid}-url`} className="block text-small font-medium text-[var(--text-primary)]">
            {t('notifyChannels.form.url')}
          </label>
          <p className="mb-1.5 text-caption text-[var(--text-tertiary)]">
            {row ? t('notifyChannels.form.urlKeep', { hint: row.webhook_hint ?? '' }) : t(`notifyChannels.channels.${channel}.urlHint`)}
          </p>
          <FieldInput
            id={`${uid}-url`}
            type="url"
            inputMode="url"
            mono
            value={url}
            onChange={setUrl}
            placeholder={`https://${HOSTS[channel][0]}/…`}
            invalid={urlInvalid}
            aria-describedby={urlInvalid ? `${uid}-url-err` : undefined}
          />
          <FieldError id={`${uid}-url-err`}>{urlInvalid ? t('notifyChannels.form.urlInvalid', { host: HOSTS[channel].join(' / ') }) : null}</FieldError>
        </div>
        {supportsSecret ? (
          <div>
            <label htmlFor={`${uid}-secret`} className="block text-small font-medium text-[var(--text-primary)]">
              {t(`notifyChannels.channels.${channel}.secretLabel`)}
            </label>
            <p className="mb-1.5 text-caption text-[var(--text-tertiary)]">
              {row?.has_secret ? t('notifyChannels.form.secretKeep') : t('notifyChannels.form.secretHint')}
            </p>
            <FieldInput id={`${uid}-secret`} type="password" autoComplete="new-password" mono value={secret} onChange={(v) => { setSecret(v); if (v) setClearSecret(false) }} placeholder="SEC…" />
            {row?.has_secret && !secret && (
              <label className="mt-2 inline-flex items-center gap-2 text-caption text-[var(--text-secondary)]">
                <input type="checkbox" checked={clearSecret} onChange={(e) => setClearSecret(e.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" />
                {t('notifyChannels.form.clearSecret')}
              </label>
            )}
          </div>
        ) : (
          <div className="text-caption text-[var(--text-tertiary)] sm:pt-6">{t('notifyChannels.signing.notSupported')}</div>
        )}
        <div>
          <label htmlFor={`${uid}-label`} className="block text-small font-medium text-[var(--text-primary)]">
            {t('notifyChannels.form.label')}
          </label>
          <p className="mb-1.5 text-caption text-[var(--text-tertiary)]">{t('notifyChannels.form.labelHint')}</p>
          <FieldInput id={`${uid}-label`} value={label} onChange={setLabel} placeholder={t('notifyChannels.form.labelPlaceholder')} />
        </div>
        <fieldset className="sm:col-span-2">
          <legend className="text-small font-medium text-[var(--text-primary)]">{t('notifyChannels.form.kinds')}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" aria-pressed={allKinds} onClick={() => setAllKinds(true)} className={`chip h-9 px-3 text-small ${allKinds ? 'chip-active' : ''}`}>
              {allKinds && <Check className="h-3.5 w-3.5" aria-hidden />}
              {t('notifyChannels.kinds.all')}
            </button>
            {KIND_GROUPS.map((g) => {
              const on = !allKinds && groups.includes(g.id)
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    if (allKinds) { setAllKinds(false); setGroups([g.id]); return }
                    setGroups((gs) => (gs.includes(g.id) ? gs.filter((x) => x !== g.id) : [...gs, g.id]))
                  }}
                  className={`chip h-9 px-3 text-small ${on ? 'chip-active' : ''}`}
                >
                  {on && <Check className="h-3.5 w-3.5" aria-hidden />}
                  {t(`notifyChannels.kinds.groups.${g.id}`)}
                </button>
              )
            })}
          </div>
          <FieldError>{kindsInvalid ? t('notifyChannels.form.kindsInvalid') : null}</FieldError>
        </fieldset>
      </div>
      {serverError && (
        <p role="alert" className="mt-3 text-small text-[var(--status-danger)] break-words">{serverError}</p>
      )}
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary h-10">
          <X className="h-4 w-4" aria-hidden />
          {t('common.cancel')}
        </button>
        <button type="submit" disabled={saving} className="btn-primary h-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={saving ? 'busy' : 'idle'} variants={iconSwapVariants} initial="initial" animate="enter" exit="exit" className="inline-flex">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
            </motion.span>
          </AnimatePresence>
          {row ? t('notifyChannels.form.update') : t('notifyChannels.form.save')}
        </button>
      </div>
    </form>
  )
}
