import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { AlertCircle, FileText, ShieldCheck, Upload, X } from 'lucide-react'
import { submitAssuranceStatement } from '../lib/orgStore'
import { useFmt } from '../lib/fmt'
import Button from '../design-system/components/Button'
import { SealCheck } from '../components/ui'
import PublicFrame from '../components/review/PublicFrame'
import { usePublicLanguage } from '../components/review/reportLang'
import { riseIn } from '../motion/tokens'

/**
 * Auditor upload page — public, token-authenticated (no platform login).
 * The upload_token is one-shot: on successful submission the token is nulled
 * in the DB and this page can no longer be used.
 */
export default function AuditorUpload() {
  const { token = '' } = useParams<{ token: string }>()
  const { t } = useTranslation()
  const f = useFmt()
  const { lang, setLang } = usePublicLanguage(null)
  const [firm, setFirm] = useState('')
  const [signedBy, setSignedBy] = useState('')
  const [opinion, setOpinion] = useState<'limited' | 'reasonable'>('limited')
  const [isae, setIsae] = useState('ISAE 3000 (Revised)')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [signerError, setSignerError] = useState<string | null>(null)
  const signerRef = useRef<HTMLInputElement>(null)

  const onFile = (fl: File | null) => {
    setFileError(null)
    if (!fl) { setFile(null); return }
    if (fl.type && fl.type !== 'application/pdf') { setFileError(t('auditor.upload.mustBePdf')); return }
    if (fl.size > 10 * 1024 * 1024) { setFileError(t('auditor.upload.tooLarge')); return }
    setFile(fl)
  }

  const submit = async () => {
    setError(null)
    if (!signedBy.trim()) {
      setSignerError(t('auditor.upload.needSigner'))
      signerRef.current?.focus()
      return
    }
    setSubmitting(true)
    try {
      let pdfB64: string | undefined
      if (file) {
        const bytes = new Uint8Array(await file.arrayBuffer())
        let bin = ''
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
        pdfB64 = btoa(bin)
      }
      await submitAssuranceStatement({
        upload_token: token,
        signed_by: signedBy,
        opinion_type: opinion,
        auditor_firm: firm || undefined,
        isae_reference: isae,
        notes: notes || undefined,
        statement_pdf_b64: pdfB64,
      })
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auditor.upload.failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const chip = <><ShieldCheck className="w-3.5 h-3.5" /> {t('auditor.upload.chip')}</>

  return (
    <PublicFrame chip={chip} lang={lang} onLangChange={setLang} width="sm">
      {done ? (
        <motion.section {...riseIn(0)} role="status" className="surface-paper px-6 py-12 sm:p-14 flex flex-col items-center text-center">
          <SealCheck size={72} ripple delay={0.15} label={t('auditor.upload.receivedTitle')} />
          <h1 className="type-h1 text-[var(--text-primary)] mt-6">{t('auditor.upload.receivedTitle')}</h1>
          <p className="type-body text-[var(--text-secondary)] mt-3 max-w-md text-pretty">{t('auditor.upload.receivedBody')}</p>
          <p className="text-caption text-[var(--text-tertiary)] mt-6">{t('auditor.upload.inactive')}</p>
        </motion.section>
      ) : (
        <motion.form
          {...riseIn(0)}
          noValidate
          onSubmit={(e) => { e.preventDefault(); void submit() }}
          className="surface-paper p-6 sm:p-10"
        >
          <div className="text-small font-semibold text-[var(--color-brand-strong)]">{t('auditor.upload.kicker')}</div>
          <h1 className="type-h1 text-[var(--text-primary)] mt-1">{t('auditor.upload.title')}</h1>
          <p className="type-small text-[var(--text-secondary)] mt-2 max-w-[62ch]">{t('auditor.upload.intro')}</p>

          <div className="h-px bg-[var(--border-subtle)] my-7" />

          <div className="space-y-5">
            <Field label={t('auditor.upload.firm')} value={firm} onChange={setFirm} placeholder={t('auditor.upload.firmPlaceholder')} autoComplete="organization" />
            <Field
              inputRef={signerRef}
              label={t('auditor.upload.signer')}
              required
              value={signedBy}
              onChange={v => { setSignedBy(v); setSignerError(null) }}
              placeholder={t('auditor.upload.signerPlaceholder')}
              error={signerError}
              autoComplete="name"
            />
            <fieldset>
              <legend className="text-small font-semibold text-[var(--text-secondary)] mb-1.5">{t('auditor.upload.level')}</legend>
              <div className="grid grid-cols-2 gap-2" role="radiogroup">
                {(['limited', 'reasonable'] as const).map(o => (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={opinion === o}
                    onClick={() => setOpinion(o)}
                    className={`h-11 rounded-[var(--radius-md)] border text-small font-semibold transition-colors ${opinion === o ? 'border-[var(--border-focus)] bg-[var(--color-brand-soft)] text-[var(--text-primary)]' : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'}`}
                  >
                    {o === 'limited' ? t('auditor.upload.limited') : t('auditor.upload.reasonable')}
                  </button>
                ))}
              </div>
            </fieldset>
            <Field label={t('auditor.upload.standard')} value={isae} onChange={setIsae} placeholder="ISAE 3000 (Revised)" />
            <Field label={t('auditor.upload.notes')} value={notes} onChange={setNotes} as="textarea" placeholder={t('auditor.upload.notesPlaceholder')} />

            <div>
              <div className="text-small font-semibold text-[var(--text-secondary)] mb-1.5">{t('auditor.upload.statement')}</div>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); onFile(e.dataTransfer.files[0] ?? null) }}
                className={`relative rounded-[var(--radius-lg)] p-6 border border-dashed transition-colors ${
                  dragging ? 'border-[var(--border-focus)] bg-[var(--color-brand-soft)]' : fileError ? 'border-[var(--status-danger)] bg-[var(--status-danger-soft)]' : 'border-[var(--border-strong)] bg-[var(--bg-secondary)]'
                }`}
              >
                {file ? (
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]">
                      <FileText className="w-5 h-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="type-small font-semibold text-[var(--text-primary)] truncate">{file.name}</div>
                      <div className="text-caption text-[var(--text-tertiary)]">{f.number(file.size / 1024, { maxFraction: 1 })} KB</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onFile(null)}
                      aria-label={t('auditor.upload.removeFile')}
                      className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center text-center cursor-pointer">
                    <input type="file" accept="application/pdf" onChange={e => onFile(e.target.files?.[0] ?? null)} className="sr-only" />
                    <Upload className="w-6 h-6 text-[var(--text-tertiary)] mb-2" aria-hidden />
                    <span className="type-small font-semibold text-[var(--text-primary)]">{t('auditor.upload.drop')}</span>
                    <span className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('auditor.upload.dropHint')}</span>
                  </label>
                )}
              </div>
              {fileError && <p role="alert" className="text-caption text-[var(--status-danger)] mt-1.5">{fileError}</p>}
            </div>
          </div>

          {error && (
            <div role="alert" className="mt-5 p-3 rounded-[var(--radius-md)] bg-[var(--status-danger-soft)] text-[var(--status-danger)] type-small flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-8 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-caption text-[var(--text-tertiary)] max-w-sm">{t('auditor.upload.attest')}</p>
            <Button type="submit" variant="primary" size="lg" icon={<ShieldCheck className="w-4 h-4" />} loading={submitting}>
              {t('auditor.upload.submit')}
            </Button>
          </div>
        </motion.form>
      )}
    </PublicFrame>
  )
}

function Field({ label, value, onChange, placeholder, as = 'input', required, error, inputRef, autoComplete }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  as?: 'input' | 'textarea'
  required?: boolean
  error?: string | null
  inputRef?: React.Ref<HTMLInputElement>
  autoComplete?: string
}) {
  const cls = `w-full px-3 rounded-[var(--radius-md)] border bg-[var(--bg-primary)] type-small text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-colors ${error ? 'border-[var(--status-danger)]' : 'border-[var(--border-default)] focus:border-[var(--border-focus)]'}`
  return (
    <label className="block">
      <span className="text-small font-semibold text-[var(--text-secondary)] mb-1.5 block">{label}</span>
      {as === 'textarea'
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className={`${cls} py-2.5 resize-none`} />
        : <input ref={inputRef} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} aria-invalid={!!error} autoComplete={autoComplete} className={`${cls} h-11`} />}
      {error && <span role="alert" className="text-caption text-[var(--status-danger)] mt-1 block">{error}</span>}
    </label>
  )
}
