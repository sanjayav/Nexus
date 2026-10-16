import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Info, Smartphone, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AuthField from './AuthField'
import { dur, ease } from '../../motion/tokens'

/**
 * China sign-in options: 企业微信 (WeCom), 钉钉 (DingTalk), 飞书 (Feishu) and
 * 手机号 + 短信验证码 (SMS one-time code).
 *
 * None of these are wired to an identity provider yet: real OAuth / SMS needs
 * app credentials that an organisation admin configures in Settings. Until
 * then every control here says so, inline and honestly. Nothing navigates,
 * nothing pretends to send a code, nothing signs anyone in.
 */

export type CnProvider = 'wecom' | 'dingtalk' | 'feishu'
const PROVIDERS: { id: CnProvider; glyph: string }[] = [
  { id: 'wecom', glyph: '企' },
  { id: 'dingtalk', glyph: '钉' },
  { id: 'feishu', glyph: '飞' },
]

function NotConfigured({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <motion.div
      id={id}
      role="status"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: dur.base, ease: ease.out }}
      className="overflow-hidden"
    >
      <div
        className="mt-2.5 flex items-start gap-2.5 rounded-[10px] px-3.5 py-3 type-small"
        style={{
          background: 'var(--status-info-soft)',
          border: '1px solid var(--status-info-line)',
          color: 'var(--text-secondary)',
        }}
      >
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--status-info)' }} aria-hidden />
        <p>{children}</p>
      </div>
    </motion.div>
  )
}

export function CnProviderButtons() {
  const { t } = useTranslation()
  const [picked, setPicked] = useState<CnProvider | null>(null)
  const noteId = 'cn-idp-note'

  return (
    <div>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={t('auth.cn.providersAria')}>
        {PROVIDERS.map((p) => {
          const active = picked === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPicked(active ? null : p.id)}
              aria-expanded={active}
              aria-controls={active ? noteId : undefined}
              className="h-11 inline-flex items-center justify-center gap-2 rounded-[10px] px-2 text-[13px] font-medium transition-[border-color,background-color] duration-150 hover:border-[var(--border-strong)] whitespace-nowrap"
              style={{
                background: active ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                border: `1px solid ${active ? 'var(--border-strong)' : 'var(--border-default)'}`,
                color: 'var(--text-primary)',
              }}
            >
              <span
                aria-hidden
                className="w-6 h-6 rounded-[7px] inline-flex items-center justify-center text-[12px] font-semibold flex-shrink-0"
                style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand-strong)' }}
              >
                {p.glyph}
              </span>
              <span className="truncate">{t(`auth.cn.providers.${p.id}`)}</span>
            </button>
          )
        })}
      </div>
      <AnimatePresence initial={false}>
        {picked && (
          <NotConfigured key={picked} id={noteId}>
            {t('auth.cn.notConfigured', { provider: t(`auth.cn.providers.${picked}`) })}
          </NotConfigured>
        )}
      </AnimatePresence>
    </div>
  )
}

const CN_MOBILE = /^1[3-9]\d{9}$/

export function PhoneSignIn() {
  const { t } = useTranslation()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [touched, setTouched] = useState(false)
  const [attempted, setAttempted] = useState(false)

  const digits = phone.replace(/\D/g, '')
  const phoneError = touched && digits.length > 0 && !CN_MOBILE.test(digits) ? t('auth.cn.phone.invalid') : null

  const requestCode = () => {
    setTouched(true)
    if (!CN_MOBILE.test(digits)) return
    setAttempted(true)
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    setAttempted(true)
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-describedby="sms-status">
      <AuthField
        id="cn-phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={13}
        label={t('auth.cn.phone.label')}
        prefix="+86"
        placeholder={t('auth.cn.phone.placeholder')}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        onBlur={() => setTouched(true)}
        error={phoneError}
      />
      <AuthField
        id="cn-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        label={t('auth.cn.phone.codeLabel')}
        icon={ShieldCheck}
        placeholder={t('auth.cn.phone.codePlaceholder')}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        trailing={
          <button
            type="button"
            onClick={requestCode}
            className="btn-secondary h-11 px-3.5 text-[13px] whitespace-nowrap flex-shrink-0"
          >
            {t('auth.cn.phone.sendCode')}
          </button>
        }
      />
      <div id="sms-status" role="status">
        <div
          className="flex items-start gap-2.5 rounded-[10px] px-3.5 py-3 type-small"
          style={{
            background: attempted ? 'var(--status-info-soft)' : 'var(--bg-secondary)',
            border: `1px solid ${attempted ? 'var(--status-info-line)' : 'var(--border-subtle)'}`,
            color: 'var(--text-secondary)',
          }}
        >
          <Smartphone className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: attempted ? 'var(--status-info)' : 'var(--text-tertiary)' }} aria-hidden />
          <p>{t('auth.cn.phone.notConfigured')}</p>
        </div>
      </div>
      <button type="submit" disabled className="btn-primary w-full justify-center h-11 text-[14px]">
        {t('auth.cn.phone.submit')}
      </button>
    </form>
  )
}
