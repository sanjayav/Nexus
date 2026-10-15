import { createContext, useContext, useMemo, useState, ReactNode } from 'react'
import { mockData } from '../data/mockData'
import { mockDataCN } from '../data/mockData.cn'
import { useLanguage } from '../contexts/LanguageContext'
import { REGIONS, WORKSPACES, Workspace, RegionProfile, L10n, pick } from './regions'

const STORAGE_KEY = 'aeiforo_workspace'

interface WorkspaceContextType {
  workspace: Workspace
  region: RegionProfile
  setWorkspace: (id: string) => void
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

function readStoredWorkspace(): Workspace {
  try {
    const found = WORKSPACES.find(w => w.id === localStorage.getItem(STORAGE_KEY))
    if (found) return found
  } catch {
    /* storage unavailable */
  }
  // First visit: Chinese-language browsers land in the mainland tenant.
  const zh = navigator.language?.toLowerCase().startsWith('zh')
  return WORKSPACES.find(w => w.region === (zh ? 'cn' : 'global'))!
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setState] = useState<Workspace>(readStoredWorkspace)

  const value = useMemo<WorkspaceContextType>(
    () => ({
      workspace,
      region: REGIONS[workspace.region],
      setWorkspace: (id: string) => {
        const next = WORKSPACES.find(w => w.id === id)
        if (!next) return
        setState(next)
        try {
          localStorage.setItem(STORAGE_KEY, id)
        } catch {
          /* storage unavailable */
        }
      },
    }),
    [workspace],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}

/** Tenant data for the active workspace. Pages read this instead of importing mockData directly. */
export function useMockData(): typeof mockData {
  return useWorkspace().workspace.region === 'cn' ? mockDataCN : mockData
}

/** Render bilingual (`L10n`) text in the current UI language. */
export function useL10n() {
  const { locale } = useLanguage()
  return useMemo(() => (text: L10n) => pick(text, locale), [locale])
}

/** Currency formatting in the workspace currency, e.g. ¥1.2亿 / CN¥120,000,000 / $1.2M. */
export function useMoney() {
  const { locale } = useLanguage()
  const { region } = useWorkspace()
  return useMemo(() => {
    const intl = locale === 'zh' ? 'zh-CN' : 'en-GB'
    return {
      full: (n: number) => new Intl.NumberFormat(intl, { style: 'currency', currency: region.currency, maximumFractionDigits: 0 }).format(n),
      compact: (n: number) =>
        new Intl.NumberFormat(intl, { style: 'currency', currency: region.currency, notation: 'compact', maximumFractionDigits: 1 }).format(n),
    }
  }, [locale, region.currency])
}
