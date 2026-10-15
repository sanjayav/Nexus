import { useCallback, useEffect, useState } from 'react'
import { orgStore, type OrgEntity, type OrgMember, type QuestionAssignment } from './orgStore'

export interface OrgData {
  entities: OrgEntity[]
  members: OrgMember[]
  assignments: QuestionAssignment[]
}

export interface OrgDataState {
  data: OrgData | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

/**
 * Single-shot loader for the org tree + membership + assignments.
 * Every page that renders pipeline-aware UI calls this once; the result
 * is cached in component state. Call `reload()` after any mutation.
 */
export function useOrgData(autoLoad = true): OrgDataState {
  const [data, setData] = useState<OrgData | null>(null)
  const [loading, setLoading] = useState(autoLoad)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [entities, members, assignments] = await Promise.all([
        orgStore.listEntities(),
        orgStore.listMembers(),
        orgStore.listAssignments(),
      ])
      setData({ entities, members, assignments })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (autoLoad) reload()
  }, [autoLoad, reload])

  return { data, loading, error, reload }
}

/**
 * Variant that loads only "my assignments" — for contributors' My Tasks page.
 */
export function useMyAssignments() {
  const [assignments, setAssignments] = useState<QuestionAssignment[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await orgStore.myAssignments()
      setAssignments(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])
  return { assignments, loading, error, reload }
}
