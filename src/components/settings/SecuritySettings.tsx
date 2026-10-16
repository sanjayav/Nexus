import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Loader2 } from 'lucide-react'
import MfaSection, { MfaPill } from '../MfaSection'
import { orgStore } from '../../lib/orgStore'
import { useFmt } from '../../lib/fmt'
import { notify } from '../ui'
import { SettingsSection } from './primitives'

const EXPORT_KEY = 'aeiforo_last_export_at'

function readLastExport(): string | null {
  try {
    return localStorage.getItem(EXPORT_KEY)
  } catch {
    return null
  }
}

export default function SecuritySettings({
  mfaEnabled,
  onMfaStatus,
}: {
  mfaEnabled: boolean | null
  onMfaStatus: (enabled: boolean | null) => void
}) {
  const { t } = useTranslation()
  const f = useFmt()
  const [exporting, setExporting] = useState(false)
  const [exportedAt, setExportedAt] = useState<string | null>(readLastExport)

  const downloadExport = async () => {
    setExporting(true)
    try {
      await orgStore.downloadDataExport()
      const now = new Date().toISOString()
      try { localStorage.setItem(EXPORT_KEY, now) } catch { /* private mode */ }
      setExportedAt(now)
      notify.success(t('settings.export.done'))
    } catch (e) {
      notify.error(t('settings.export.failed'), { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <SettingsSection
        id="two-factor"
        title={t('settings.security.mfaTitle')}
        description={t('components.mfa.intro')}
        aside={<MfaPill enabled={mfaEnabled} />}
      >
        <MfaSection headless onStatusChange={onMfaStatus} />
      </SettingsSection>

      <SettingsSection title={t('settings.export.heading')} description={t('settings.export.body')}>
        <div className="surface-paper flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="text-small text-[var(--text-secondary)]">
            {exportedAt ? t('settings.export.lastExport', { date: f.dateTime(exportedAt) }) : t('settings.export.none')}
          </div>
          <button type="button" onClick={downloadExport} disabled={exporting} className="btn-primary h-10">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
            {exporting ? t('settings.export.building') : t('settings.export.download')}
          </button>
        </div>
      </SettingsSection>
    </div>
  )
}
