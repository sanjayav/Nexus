import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../auth/AuthContext'
import { hasPermission } from '../lib/rbac'
import { auth as authApi } from '../lib/api'
import { transition } from '../motion/tokens'
import { SettingsTabBar, isSettingsTab, type SettingsTab } from '../components/settings/tabs'
import { useOrgSettings } from '../components/settings/useOrgSettings'
import { SettingsSection } from '../components/settings/primitives'
import OrganisationSettings from '../components/settings/OrganisationSettings'
import MarketSettings from '../components/settings/MarketSettings'
import FrameworksSettings from '../components/settings/FrameworksSettings'
import NotificationPrefs from '../components/settings/NotificationPrefs'
import NotifyChannels from '../components/settings/NotifyChannels'
import AiSettings from '../components/settings/AiSettings'
import SecuritySettings from '../components/settings/SecuritySettings'
import LanguageSettings from '../components/settings/LanguageSettings'

/**
 * Settings — one page, seven tabs (URL-synced via ?tab=). Workspace tabs
 * (Organisation, Market & compliance, Frameworks, AI, team channels) are
 * editable by admins (admin.org) and read-only for everyone else; personal
 * tabs (Security, Language, email notifications) belong to the signed-in user.
 */
export default function Settings() {
  const { t } = useTranslation()
  const { permissions } = useAuth()
  const canEditOrg = hasPermission(permissions, 'admin.org')
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: SettingsTab = isSettingsTab(raw) ? raw : 'organisation'
  const org = useOrgSettings()
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null)

  // 2FA status for the Security tab's attention dot (MfaSection keeps it current afterwards).
  useEffect(() => {
    let cancelled = false
    authApi
      .mfaStatus()
      .then((s) => !cancelled && setMfaEnabled(s.enabled))
      .catch(() => !cancelled && setMfaEnabled(null))
    return () => {
      cancelled = true
    }
  }, [])

  const openTab = useCallback(
    (next: SettingsTab) => {
      setParams(
        (p) => {
          const n = new URLSearchParams(p)
          if (next === 'organisation') n.delete('tab')
          else n.set('tab', next)
          return n
        },
        { replace: false },
      )
    },
    [setParams],
  )

  return (
    <div className="mx-auto max-w-[1080px]">
      <PageHeader title={t('settings.title')} description={t('settings.description')} />

      <SettingsTabBar value={tab} onChange={openTab} badges={mfaEnabled === false ? { security: 'warning' } : {}} />

      <motion.div
        key={tab}
        id={`settings-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`settings-tab-${tab}`}
        tabIndex={-1}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition.fast}
        className="pb-16 pt-4 focus:outline-none"
      >
        {tab === 'organisation' && <OrganisationSettings state={org} canEdit={canEditOrg} onOpenTab={openTab} />}
        {tab === 'market' && <MarketSettings state={org} canEdit={canEditOrg} />}
        {tab === 'frameworks' && <FrameworksSettings />}
        {tab === 'notifications' && (
          <>
            <SettingsSection title={t('settings.notifications.heading')} description={t('settings.notifications.intro')}>
              <NotificationPrefs />
            </SettingsSection>
            <SettingsSection title={t('settings.channels.title')} description={t('settings.channels.description')}>
              <NotifyChannels canEdit={canEditOrg} />
            </SettingsSection>
          </>
        )}
        {tab === 'ai' && <AiSettings state={org} canEdit={canEditOrg} />}
        {tab === 'security' && <SecuritySettings mfaEnabled={mfaEnabled} onMfaStatus={setMfaEnabled} />}
        {tab === 'language' && <LanguageSettings />}
      </motion.div>
    </div>
  )
}
