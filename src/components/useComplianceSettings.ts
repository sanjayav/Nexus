import { useCallback, useState } from 'react'
import { useWorkspace } from '../workspace/WorkspaceContext'

/**
 * Data-residency / compliance settings for the active workspace. Edited in
 * Admin settings and summarised in Settings analytics. Kept per workspace in
 * browser storage for the demo; values are settings the admin records, not
 * filings or certifications made by the platform.
 */
export interface ComplianceSettings {
  /** Index into the region's cross-border option list (0 = not enabled). */
  crossBorder: number
  /** MLPS 2.0 level index: 0 = not graded, 1 = level 2, 2 = level 3. Mainland only. */
  mlps: number
  /** ICP filing number; empty until the admin enters one. Mainland only. */
  icp: string
}

const DEFAULTS: ComplianceSettings = { crossBorder: 0, mlps: 0, icp: '' }
const key = (workspaceId: string) => `nexus_compliance_${workspaceId}`

function read(workspaceId: string): ComplianceSettings {
  try {
    const raw = localStorage.getItem(key(workspaceId))
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    /* storage unavailable or corrupt */
  }
  return DEFAULTS
}

export function useComplianceSettings() {
  const { workspace } = useWorkspace()
  const [state, setState] = useState(() => ({ id: workspace.id, value: read(workspace.id) }))
  // Re-read when the workspace changes.
  const value = state.id === workspace.id ? state.value : read(workspace.id)

  const save = useCallback(
    (next: ComplianceSettings) => {
      setState({ id: workspace.id, value: next })
      try {
        localStorage.setItem(key(workspace.id), JSON.stringify(next))
      } catch {
        /* storage unavailable */
      }
    },
    [workspace.id],
  )

  return [value, save] as const
}
