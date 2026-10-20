import { useStrings } from '@/lib/i18n'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { FadeIn, PageHeader } from '@/components/ui'
import { dataImportStrings } from './dataImport.strings'
import { ImportWizard } from './components/ImportWizard'
import { ImportHistory } from './components/ImportHistory'

export default function DataImportPage() {
  const s = useStrings(dataImportStrings)
  const { workspace } = useWorkspace()

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1440px] mx-auto">
      <PageHeader title={s.title} description={s.description} />
      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        {/* Remount per workspace so a half-finished import never crosses tenants. */}
        <FadeIn className="min-w-0">
          <ImportWizard key={workspace.id} />
        </FadeIn>
        <FadeIn delay={0.06} className="min-w-0">
          <ImportHistory />
        </FadeIn>
      </div>
    </div>
  )
}
