import { useEffect, useState } from 'react'

export interface OrgBrand {
  name: string
  legal_name: string | null
  thai_name: string | null
  country: string | null
  primary_color: string | null
  secondary_color: string | null
  logo_mark: string | null
  industry: string | null
  headquarters: string | null
  website: string | null
}

// Sensible fallback — so Sidebar renders before fetch completes.
const FALLBACK: OrgBrand = {
  name: 'Aeiforo',
  legal_name: null,
  thai_name: null,
  country: null,
  primary_color: '#1B6B7B',
  secondary_color: '#134E5A',
  logo_mark: null,
  industry: null,
  headquarters: null,
  website: null,
}

const CACHE_KEY = 'aeiforo_org_brand'

/** Read the tenant's brand + name once per session, cache in localStorage. */
export function useOrgBrand(): OrgBrand {
  const [brand, setBrand] = useState<OrgBrand>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) return { ...FALLBACK, ...JSON.parse(cached) }
    } catch { /* ignore */ }
    return FALLBACK
  })

  useEffect(() => {
    const token = localStorage.getItem('aeiforo_token')
    if (!token) return
    fetch('/api/org?view=tenant-brand', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((b: OrgBrand | null) => {
        if (!b) return
        setBrand({ ...FALLBACK, ...b })
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(b)) } catch { /* ignore */ }
      })
      .catch(() => { /* silent */ })
  }, [])

  return brand
}

export function clearOrgBrandCache() {
  try { localStorage.removeItem(CACHE_KEY) } catch { /* ignore */ }
}
