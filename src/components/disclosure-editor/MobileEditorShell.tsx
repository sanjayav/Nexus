import { useEffect, useId, useState } from 'react'
import { motion } from 'framer-motion'
import { spring } from '../../motion/tokens'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, FolderTree, FileText, Info } from 'lucide-react'
import DisclosureTree, { type DisclosureTreeProps } from './DisclosureTree'
import DisclosureDocument, { type DisclosureDocumentProps } from './DisclosureDocument'
import DisclosureCellRail, { type DisclosureCellRailProps } from './DisclosureCellRail'

/**
 * MobileEditorShell — tabbed single-pane variant of the desktop three-pane
 * disclosure editor.
 *
 * Layout (under lg):
 *   [Progress bar above]              ← owned by the parent
 *   [Tabs: Sections | Document | Details]
 *   [Active pane only — full width]
 *
 * Behavioural rules:
 *   - Default tab is Document so a tap on the editor lands users in the
 *     value-entry surface immediately.
 *   - Selecting a section in the tree auto-jumps to Document.
 *   - Selecting a cell in the document auto-jumps to Details (the right-rail
 *     content) so the user gets evidence/comments/workflow in one tap.
 *   - A back chevron on Details returns to Document.
 *
 * This component is layout-only: it forwards every callback through to the
 * existing pane components so behaviour stays identical to desktop. No
 * business logic is duplicated.
 */
type MobileTab = 'sections' | 'document' | 'details'

interface MobileEditorShellProps {
  treeProps: DisclosureTreeProps
  documentProps: DisclosureDocumentProps
  railProps: DisclosureCellRailProps
  /** Whether to even render the Details tab. Mirrors desktop's `readingMode`
   *  hide-rail behaviour: when reading, we suppress the Details tab too. */
  showDetails: boolean
}

export default function MobileEditorShell({ treeProps, documentProps, railProps, showDetails }: MobileEditorShellProps) {
  const { t } = useTranslation()
  const group = useId()
  const [tab, setTab] = useState<MobileTab>('document')

  // When the active cell changes (and details are available) auto-switch to
  // the Details tab so the user lands on workflow + evidence after a tap.
  const activeCellId = documentProps.activeCellId
  useEffect(() => {
    if (!showDetails) return
    if (!activeCellId) return
    setTab(prev => (prev === 'sections' ? 'document' : prev))
  // We deliberately don't include `tab` so the effect only fires on cell
  // change; the parent already routes selection through onActiveCellChange.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCellId, showDetails])

  // When a section is picked, the parent calls onSelect → we then switch to
  // Document so the user sees what they just navigated to.
  const handleTreeSelect = (id: string) => {
    treeProps.onSelect(id)
    setTab('document')
  }

  // When a cell is focussed in the document on mobile, swap to Details.
  const handleCellChange = (id: string) => {
    documentProps.onActiveCellChange(id)
    if (showDetails) setTab('details')
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 lg:hidden">
      {/* Tab strip */}
      <div
        role="tablist"
        aria-label={t('disclosureEditor.mobile.tabsAria')}
        className="flex items-stretch border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] sticky top-0 z-20"
      >
        <TabButton
          active={tab === 'sections'}
          onClick={() => setTab('sections')}
          icon={<FolderTree className="w-4 h-4" />}
          group={group}
          label={t('disclosureEditor.mobile.sections')}
        />
        <TabButton
          active={tab === 'document'}
          onClick={() => setTab('document')}
          icon={<FileText className="w-4 h-4" />}
          group={group}
          label={t('disclosureEditor.mobile.document')}
        />
        {showDetails && (
          <TabButton
            active={tab === 'details'}
            onClick={() => setTab('details')}
            icon={<Info className="w-4 h-4" />}
            group={group}
            label={t('disclosureEditor.mobile.details')}
            disabled={!activeCellId}
          />
        )}
      </div>

      {/* Active pane */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'sections' && (
          <div className="h-full flex flex-col">
            <DisclosureTree {...treeProps} onSelect={handleTreeSelect} readingMode={false} variant="inline" />
          </div>
        )}
        {tab === 'document' && (
          <div className="h-full flex flex-col">
            <DisclosureDocument {...documentProps} onActiveCellChange={handleCellChange} />
          </div>
        )}
        {tab === 'details' && showDetails && (
          <div className="h-full flex flex-col bg-[var(--bg-primary)]">
            <div className="flex items-center gap-1 px-2 py-2 border-b border-[var(--border-subtle)] sticky top-0 z-10 bg-[var(--bg-primary)]">
              <button
                type="button"
                onClick={() => setTab('document')}
                className="inline-flex items-center gap-1 h-11 px-3 -ml-1 rounded-[var(--radius-md)] text-small font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
                aria-label={t('disclosureEditor.mobile.backToDocument')}
              >
                <ChevronLeft className="w-4 h-4" /> {t('common.back')}
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <DisclosureCellRail {...railProps} variant="inline" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TabButton({
  active, onClick, icon, label, disabled = false, group,
}: {
  group: string
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className={`relative flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 text-small font-semibold whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed
        ${active
          ? 'text-[var(--text-primary)]'
          : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
        }`}
    >
      {icon}
      <span>{label}</span>
      {active && <motion.span layoutId={`${group}-tab`} transition={spring.snappy} className="absolute left-4 right-4 bottom-0 h-0.5 rounded-full bg-[var(--color-brand)]" aria-hidden />}
    </button>
  )
}
