import { useCallback, useEffect, useRef, useState } from 'react'
import { orgSettings, type OrgSettingsPatch, type OrgSettingsResponse } from '../../lib/api'

export interface OrgSettingsState {
  data: OrgSettingsResponse | null
  loading: boolean
  error: unknown
  reload: () => void
  /** PUT a patch; resolves with the server response (incl. `changes`). Throws on failure. */
  save: (patch: OrgSettingsPatch) => Promise<OrgSettingsResponse>
}

/**
 * One fetch of /api/org-settings shared by the Organisation, Market and AI
 * tabs (the Settings page owns the instance and passes it down).
 */
export function useOrgSettings(): OrgSettingsState {
  const [data, setData] = useState<OrgSettingsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const seq = useRef(0)

  const reload = useCallback(() => {
    const id = ++seq.current
    setLoading(true)
    setError(null)
    orgSettings
      .get()
      .then((r) => {
        if (id === seq.current) setData(r)
      })
      .catch((e) => {
        if (id === seq.current) setError(e)
      })
      .finally(() => {
        if (id === seq.current) setLoading(false)
      })
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const save = useCallback(async (patch: OrgSettingsPatch) => {
    const r = await orgSettings.update(patch)
    setData(r)
    return r
  }, [])

  return { data, loading, error, reload, save }
}
