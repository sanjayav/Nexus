import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ShieldCheck, Upload, CheckCircle2, AlertCircle, Leaf, FileText, X } from 'lucide-react'
import { submitAssuranceStatement } from '../lib/orgStore'
import Button from '../design-system/components/Button'
import { SPRING } from '../components/motion'

/**
 * Auditor upload page — public, token-authenticated (no platform login).
 * The upload_token is one-shot: on successful submission the token is nulled
 * in the DB and this page can no longer be used.
 */
export default function AuditorUpload() {
  const { token = '' } = useParams<{ token: string }>()
  const { t } = useTranslation()
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

  const onFile = (f: File | null) => {
    setError(null)
    if (!f) { setFile(null); return }
    if (f.type && f.type !== 'application/pdf') {
      setError(t('auditor.upload.mustBePdf'))
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError(t('auditor.upload.tooLarge'))
      return
    }
    setFile(f)
  }

  const submit = async () => {
    setError(null)
    if (!signedBy.trim()) return setError(t('auditor.upload.needSigner'))
    setSubmitting(true)
    try {
      let pdfB64: string | undefined
      if (file) {
        const buf = await file.arrayBuffer()
        pdfB64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
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

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(900px 500px at 10% -10%, rgba(4, 120, 87,0.08), transparent 60%), radial-gradient(800px 500px at 90% 110%, rgba(46,125,50,0.06), transparent 60%), var(--bg-secondary)',
      }}
    >
      <header className="px-8 py-5 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #047857, #059669)', boxShadow: '0 4px 12px rgba(4, 120, 87,0.3)' }}>
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold tracking-[-0.02em] text-[15px]">Nexus</span>
        </a>
        <span className="chip">
          <ShieldCheck className="w-3 h-3" /> {t('auditor.upload.chip')}
        </span>
      </header>

      <main className="max-w-[720px] mx-auto px-6 py-10">
        {done ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="surface-paper p-12 text-center">
            <div className="inline-flex w-16 h-16 rounded-full items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, #10B981, #2E7D32)', boxShadow: '0 6px 16px rgba(46,125,50,0.3)' }}>
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-display text-[28px] text-[var(--text-primary)]">{t('auditor.upload.receivedTitle')}</h1>
            <p className="text-[13.5px] text-[var(--text-secondary)] mt-3 max-w-md mx-auto leading-relaxed">
              {t('auditor.upload.receivedBody')}
            </p>
            <div className="text-caption text-[var(--text-tertiary)] mt-5">{t('auditor.upload.inactive')}</div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="surface-paper p-8">
            <span className="kicker">{t('auditor.upload.kicker')}</span>
            <h1 className="text-display text-[28px] text-[var(--text-primary)] mt-1">{t('auditor.upload.title')}</h1>
            <p className="text-[13px] text-[var(--text-secondary)] mt-2 leading-relaxed">
              {t('auditor.upload.intro')}
            </p>

            <div className="hairline my-6" />

            <div className="space-y-4">
              <Field label={t('auditor.upload.firm')} value={firm} onChange={setFirm} placeholder={t('auditor.upload.firmPlaceholder')} />
              <Field label={t('auditor.upload.signer')} value={signedBy} onChange={setSignedBy} placeholder={t('auditor.upload.signerPlaceholder')} />
              <div>
                <label className="text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)] mb-1.5 block">{t('auditor.upload.level')}</label>
                <div className="flex gap-1.5">
                  {(['limited', 'reasonable'] as const).map(o => (
                    <button key={o} onClick={() => setOpinion(o)} className={`chip flex-1 justify-center ${opinion === o ? 'chip-active' : ''}`}>
                      {o === 'limited' ? t('auditor.upload.limited') : t('auditor.upload.reasonable')}
                    </button>
                  ))}
                </div>
              </div>
              <Field label={t('auditor.upload.standard')} value={isae} onChange={setIsae} placeholder="ISAE 3000 (Revised)" />
              <Field label={t('auditor.upload.notes')} value={notes} onChange={setNotes} as="textarea" placeholder={t('auditor.upload.notesPlaceholder')} />

              <div>
                <label className="text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)] mb-1.5 block">{t('auditor.upload.statement')}</label>
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); onFile(e.dataTransfer.files[0] ?? null) }}
                  className="relative rounded-[12px] p-6 border-2 border-dashed transition-all cursor-pointer"
                  style={{
                    borderColor: dragging ? 'var(--color-brand)' : 'var(--border-default)',
                    background: dragging ? 'var(--accent-teal-subtle)' : 'var(--bg-secondary)',
                  }}
                >
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={e => onFile(e.target.files?.[0] ?? null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {file ? (
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-[10px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
                        <FileText className="w-5 h-5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{file.name}</div>
                        <div className="text-caption text-[var(--text-tertiary)]">{(file.size / 1024).toFixed(1)} KB</div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onFile(null) }}
                        aria-label={t('auditor.upload.removeFile')}
                        className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-white hover:text-[var(--text-primary)]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-6 h-6 text-[var(--text-tertiary)] mx-auto mb-2" />
                      <div className="text-[13px] font-semibold text-[var(--text-primary)]">{t('auditor.upload.drop')}</div>
                      <div className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('auditor.upload.dropHint')}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-[8px] bg-[var(--accent-red-light)] text-[var(--status-reject)] text-[12.5px] font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-7 flex items-center justify-between gap-3">
              <p className="text-caption text-[var(--text-tertiary)] leading-snug max-w-xs">
                {t('auditor.upload.attest')}
              </p>
              <Button variant="brand" size="md" icon={<ShieldCheck className="w-4 h-4" />} onClick={submit} loading={submitting}>
                {t('auditor.upload.submit')}
              </Button>
            </div>
          </motion.div>
        )}
      </main>

      <footer className="text-center py-8 text-caption text-[var(--text-tertiary)]">
        <Trans i18nKey="auditor.upload.footer" components={{ a: <a href="/" className="link-underline text-[var(--color-brand)] hover:text-[var(--color-brand-strong)]" /> }} />
      </footer>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, as = 'input' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; as?: 'input' | 'textarea' }) {
  return (
    <label className="block">
      <span className="text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)] mb-1.5 block">{label}</span>
      {as === 'textarea' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-primary)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/15 outline-none resize-none transition-all"
        />
      ) : (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 h-10 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-primary)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/15 outline-none transition-all"
        />
      )}
    </label>
  )
}
