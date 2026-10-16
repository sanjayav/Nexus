import { FormEvent, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Mail, MapPin, Send, Copy, Check, AlertCircle } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import MarketingShell from '../components/marketing/MarketingShell'
import PageHero from '../components/marketing/PageHero'
import { Reveal } from '../components/marketing/motion'
import { inputClass } from '../components/auth/AuthField'
import { dur, ease } from '../motion/tokens'

/**
 * /contact — enquiry form.
 *
 * There is no enquiry endpoint yet, so the form does not pretend to send:
 * it composes the message in the visitor's own email app (mailto:) and says
 * exactly that. A "copy message" fallback covers browsers with no mail app.
 * When a real endpoint lands, swap `onSubmit` and restore a "received" state.
 */
const SALES = 'sales@aeiforo.local'
const SUPPORT = 'support@aeiforo.local'

export default function Contact() {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')
  const [handedOff, setHandedOff] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subject = t('contact.mail.subject', { company: company.trim() || name.trim() || '—' })
  const body = `${message.trim()}\n\n— ${[name.trim(), email.trim(), company.trim()].filter(Boolean).join(' · ')}`

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !message.trim()) {
      setError(t('contact.form.required'))
      return
    }
    window.location.href = `mailto:${SALES}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setHandedOff(true)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${SALES}\n${subject}\n\n${body}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked — the text is still on screen */ }
  }

  return (
    <MarketingShell>
      <PageHero kicker={t('contact.eyebrow')} title={t('contact.title')} intro={t('contact.intro')} align="left" />

      <section className="pb-24 sm:pb-28">
        <div className="max-w-[1040px] mx-auto px-4 sm:px-8 grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[1.3fr_0.7fr] gap-12 lg:gap-16">
          <Reveal className="surface-paper !rounded-[20px] p-6 sm:p-9">
            <form onSubmit={onSubmit} noValidate className="space-y-5" aria-describedby={error ? 'contact-err' : undefined}>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field id="name" label={t('contact.form.name')} value={name} onChange={setName} placeholder={t('contact.form.namePlaceholder')} autoComplete="name" />
                <Field id="email" label={t('contact.form.email')} type="email" required value={email} onChange={setEmail} placeholder={t('contact.form.emailPlaceholder')} autoComplete="email" />
              </div>
              <Field id="company" label={t('contact.form.company')} value={company} onChange={setCompany} placeholder={t('contact.form.companyPlaceholder')} autoComplete="organization" />
              <div>
                <label htmlFor="message" className="type-small font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  {t('contact.form.message')}
                </label>
                <textarea
                  id="message"
                  required
                  aria-required="true"
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('contact.form.messagePlaceholder')}
                  className={`${inputClass} !h-auto px-3.5 py-3 resize-y leading-[1.6]`}
                />
              </div>

              {error && (
                <p id="contact-err" role="alert" className="flex items-center gap-2 type-small" style={{ color: 'var(--status-danger)' }}>
                  <AlertCircle className="w-4 h-4" aria-hidden />
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button type="submit" className="btn-primary h-12 px-6 text-[15px]">
                  <Send className="w-4 h-4" aria-hidden />
                  {t('contact.form.send')}
                </button>
                <span className="type-caption" style={{ color: 'var(--text-tertiary)' }}>{t('contact.form.mailNote')}</span>
              </div>

              <AnimatePresence>
                {handedOff && (
                  <motion.div
                    role="status"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: dur.base, ease: ease.out }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-[12px] p-4 sm:p-5" style={{ background: 'var(--status-info-soft)', border: '1px solid var(--status-info-line)' }}>
                      <p className="type-h3" style={{ color: 'var(--text-primary)' }}>{t('contact.handoff.title')}</p>
                      <p className="mt-1 type-small" style={{ color: 'var(--text-secondary)' }}>{t('contact.handoff.body', { email: SALES })}</p>
                      <button type="button" onClick={copy} className="btn-secondary mt-3 h-10 text-[13px]">
                        {copied ? <Check className="w-4 h-4" aria-hidden /> : <Copy className="w-4 h-4" aria-hidden />}
                        {copied ? t('contact.handoff.copied') : t('contact.handoff.copy')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </Reveal>

          {/* Sidebar — contact emails + address */}
          <Reveal delay={0.08} className="space-y-8 lg:pt-4">
            {[
              { label: t('contact.sidebar.sales'), email: SALES },
              { label: t('contact.sidebar.support'), email: SUPPORT },
            ].map((c) => (
              <div key={c.email}>
                <p className="type-small font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>{c.label}</p>
                <a href={`mailto:${c.email}`} className="inline-flex items-center gap-2 min-h-[40px] text-[16px] font-semibold hover:underline underline-offset-4" style={{ color: 'var(--text-link)' }}>
                  <Mail className="w-4 h-4" aria-hidden />
                  {c.email}
                </a>
              </div>
            ))}
            <div>
              <p className="type-small font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>{t('contact.sidebar.address')}</p>
              <div className="flex items-start gap-2 type-body" style={{ color: 'var(--text-secondary)' }}>
                <MapPin className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} aria-hidden />
                <address className="not-italic">
                  Aeiforo Ltd<br />
                  {t('contact.sidebar.addressLine3')}
                </address>
              </div>
            </div>
            <div className="rounded-[14px] p-5 type-small" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
              <Trans
                i18nKey="contact.sidebar.security"
                components={{
                  email: <a href="mailto:security@aeiforo.local" className="underline underline-offset-4" style={{ color: 'var(--text-link)' }} />,
                }}
              />
            </div>
          </Reveal>
        </div>
      </section>
    </MarketingShell>
  )
}

interface FieldProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  autoComplete?: string
}

function Field({ id, label, value, onChange, placeholder, type = 'text', required, autoComplete }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="type-small font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        aria-required={required || undefined}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClass} px-3.5`}
      />
    </div>
  )
}
