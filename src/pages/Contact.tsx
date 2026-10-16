import { FormEvent, useState } from 'react'
import { Mail, MapPin, CheckCircle2, Loader2 } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import MarketingShell from '../components/marketing/MarketingShell'
import { FadeIn } from '../components/MotionPrimitives'

/**
 * /contact — basic enquiry form. POST is a no-op for v1 (does not hit any
 * backend); we just show a "we'll be in touch" success state. When a
 * Formspree-style endpoint is wired in, swap the simulated handler.
 */

export default function Contact() {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !message.trim()) {
      setError(t('contact.form.required'))
      return
    }
    setSubmitting(true)
    // Simulated network delay for the demo handler; real endpoint TBD.
    await new Promise((resolve) => setTimeout(resolve, 600))
    setSubmitting(false)
    setSubmitted(true)
  }

  return (
    <MarketingShell>
      <section className="pt-16 pb-24 sm:pt-24 sm:pb-28">
        <div className="max-w-[1180px] mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20">
            {/* Form */}
            <FadeIn>
              <div>
                <p
                  className="text-[12px] font-semibold uppercase tracking-[0.15em] mb-4"
                  style={{ color: 'var(--accent-600)' }}
                >
                  {t('contact.eyebrow')}
                </p>
                <h1
                  className="h-display"
                  style={{
                    fontSize: 'clamp(2rem, 4.5vw, 2.75rem)',
                    color: 'var(--text-primary)',
                    lineHeight: 1.1,
                  }}
                >
                  {t('contact.title')}
                </h1>
                <p
                  className="mt-5 text-[16px] leading-relaxed max-w-[480px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t('contact.intro')}
                </p>

                {submitted ? (
                  <div
                    className="mt-10 rounded-[14px] border p-7"
                    style={{
                      background: 'color-mix(in srgb, var(--accent-500) 8%, var(--bg-primary))',
                      borderColor: 'var(--accent-500)',
                    }}
                  >
                    <CheckCircle2 className="w-7 h-7 mb-3" style={{ color: 'var(--accent-600)' }} />
                    <h2 className="h-section mb-2" style={{ color: 'var(--text-primary)' }}>
                      {t('contact.success.title')}
                    </h2>
                    <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                      {t('contact.success.body')}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={onSubmit} className="mt-10 space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field
                        id="name"
                        label={t('contact.form.name')}
                        value={name}
                        onChange={setName}
                        placeholder={t('contact.form.namePlaceholder')}
                      />
                      <Field
                        id="email"
                        label={t('contact.form.email')}
                        type="email"
                        required
                        value={email}
                        onChange={setEmail}
                        placeholder={t('contact.form.emailPlaceholder')}
                      />
                    </div>
                    <Field
                      id="company"
                      label={t('contact.form.company')}
                      value={company}
                      onChange={setCompany}
                      placeholder={t('contact.form.companyPlaceholder')}
                    />
                    <div>
                      <label
                        htmlFor="message"
                        className="text-[11px] font-semibold uppercase tracking-[0.1em] block mb-1.5"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {t('contact.form.message')}
                      </label>
                      <textarea
                        id="message"
                        required
                        rows={5}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={t('contact.form.messagePlaceholder')}
                        className="w-full px-3.5 py-2.5 text-[14px] rounded-[10px] outline-none resize-y"
                        style={{
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-default)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>

                    {error && (
                      <p className="text-[13px]" style={{ color: 'var(--accent-red)' }}>
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary"
                      style={{ height: 44, paddingInline: 22, fontSize: 14 }}
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {submitting ? t('contact.form.sending') : t('contact.form.send')}
                    </button>
                  </form>
                )}
              </div>
            </FadeIn>

            {/* Sidebar — address + contact emails */}
            <FadeIn delay={0.1}>
              <div className="space-y-7 lg:pl-6">
                <div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {t('contact.sidebar.sales')}
                  </p>
                  <a
                    href="mailto:sales@aeiforo.local"
                    className="inline-flex items-center gap-2 text-[15px] font-semibold"
                    style={{ color: 'var(--accent-600)' }}
                  >
                    <Mail className="w-4 h-4" />
                    sales@aeiforo.local
                  </a>
                </div>
                <div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {t('contact.sidebar.support')}
                  </p>
                  <a
                    href="mailto:support@aeiforo.local"
                    className="inline-flex items-center gap-2 text-[15px] font-semibold"
                    style={{ color: 'var(--accent-600)' }}
                  >
                    <Mail className="w-4 h-4" />
                    support@aeiforo.local
                  </a>
                </div>
                <div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {t('contact.sidebar.address')}
                  </p>
                  <div className="flex items-start gap-2 text-[14.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                    <address className="not-italic">
                      Aeiforo Ltd<br />
                      {t('contact.sidebar.addressLine2')}<br />
                      {t('contact.sidebar.addressLine3')}
                    </address>
                  </div>
                </div>
                <div
                  className="rounded-[12px] border p-5 text-[13px] leading-relaxed"
                  style={{
                    background: 'var(--bg-subtle)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <Trans
                    i18nKey="contact.sidebar.security"
                    components={{
                      email: <a href="mailto:security@aeiforo.local" style={{ color: 'var(--accent-600)' }} />,
                    }}
                  />
                </div>
              </div>
            </FadeIn>
          </div>
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
}

function Field({ id, label, value, onChange, placeholder, type = 'text', required }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-[11px] font-semibold uppercase tracking-[0.1em] block mb-1.5"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-3.5 text-[14px] rounded-[10px] outline-none"
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-primary)',
        }}
      />
    </div>
  )
}
