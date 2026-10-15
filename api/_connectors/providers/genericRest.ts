/**
 * Generic REST connector.
 *
 * Auth: API key (Bearer / header / Basic) — fully customer-driven. The
 *       connection stores the endpoint URL, an auth header name + value, and
 *       a JSON pointer that locates the rows inside the response.
 *
 * Data: Whatever the customer brings. They map their response fields to the
 *       SyncRow shape via providerOptions.fieldMap (a JSON object). This is
 *       the long-tail "we'll plug anything into Nexus" connector — Workiva
 *       has 70+ adapters; we have 9 first-class + this one.
 */
import {
  type ConnectorDefinition,
  type ConnectorConnection,
  type SyncOptions,
  type SyncRow,
  type SyncResult,
  type TestResult,
  connectorFetch,
} from '../index.js'

/** Walk a JSON pointer like "data.items" or "result[0].rows". */
function pluckPath(obj: unknown, path: string): unknown {
  if (!path) return obj
  let cur: unknown = obj
  for (const part of path.split(/[.[\]]/).filter(Boolean)) {
    if (cur == null) return undefined
    if (typeof cur === 'object') {
      cur = (cur as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return cur
}

function getField(row: Record<string, unknown>, field: string | undefined): unknown {
  if (!field) return undefined
  return pluckPath(row, field)
}

export const genericRest: ConnectorDefinition = {
  id: 'generic_rest',
  name: 'Generic REST API',
  category: 'Utilities',
  iconKey: 'rest',
  description: 'Connect any HTTP endpoint that returns JSON. Bring your own URL, auth header, and field map.',
  authType: 'api_key',
  apiKeyFields: [
    { label: 'Endpoint URL', key: 'endpointUrl', secret: false, placeholder: 'https://api.example.com/v1/usage' },
    { label: 'Auth header name', key: 'authHeader', secret: false, placeholder: 'Authorization' },
    { label: 'Auth header value', key: 'authValue', secret: true, placeholder: 'Bearer abc123 or "Basic …"' },
    { label: 'Rows JSON pointer', key: 'rowsPath', secret: false, placeholder: 'data.items', description: 'Where in the response the array of rows lives. Use dot-notation.' },
    { label: 'Field map (JSON)', key: 'fieldMap', secret: false, description: 'JSON: { periodYear: "year", periodMonth: "month", scope: "scope", category: "cat", activityValue: "value", activityUnit: "unit" }' },
  ],
  fieldMappings: [
    { source: '(customer-defined)', target: 'period_year' },
    { source: '(customer-defined)', target: 'period_month' },
    { source: '(customer-defined)', target: 'scope' },
    { source: '(customer-defined)', target: 'category' },
    { source: '(customer-defined)', target: 'facility_code' },
    { source: '(customer-defined)', target: 'activity_value' },
    { source: '(customer-defined)', target: 'activity_unit' },
  ],
  docsUrl: 'https://docs.aeiforo.com/connectors/generic-rest',

  async testConnection(connection: ConnectorConnection): Promise<TestResult> {
    const c = connection.credentials
    const url = String(c.endpointUrl ?? '')
    if (!url) return { ok: false, message: 'Endpoint URL not configured' }
    try {
      const headers: Record<string, string> = { Accept: 'application/json' }
      const headerName = String(c.authHeader ?? '')
      const headerValue = String(c.authValue ?? '')
      if (headerName && headerValue) headers[headerName] = headerValue
      const res = await connectorFetch(url, { headers })
      if (!res.ok) return { ok: false, message: `Endpoint returned HTTP ${res.status}` }
      return { ok: true, message: 'Endpoint reachable' }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Connection failed' }
    }
  },

  async fetchData(_sql, connection: ConnectorConnection, opts: SyncOptions) {
    const c = connection.credentials
    const url = String(opts.providerOptions?.endpointUrl ?? c.endpointUrl ?? '')
    if (!url) throw new Error('Generic REST endpoint URL not configured')
    const headers: Record<string, string> = { Accept: 'application/json' }
    const headerName = String(c.authHeader ?? '')
    const headerValue = String(c.authValue ?? '')
    if (headerName && headerValue) headers[headerName] = headerValue

    const res = await connectorFetch(url, { headers })
    if (!res.ok) throw new Error(`Generic REST HTTP ${res.status}`)
    const payload = await res.json() as unknown
    const rowsPath = String(opts.providerOptions?.rowsPath ?? c.rowsPath ?? '')
    const rawRows = (pluckPath(payload, rowsPath) ?? payload) as unknown
    const list: Record<string, unknown>[] = Array.isArray(rawRows)
      ? rawRows as Record<string, unknown>[]
      : []
    let fieldMap: Record<string, string> = {}
    const fmRaw = opts.providerOptions?.fieldMap ?? c.fieldMap
    if (typeof fmRaw === 'string') {
      try { fieldMap = JSON.parse(fmRaw) } catch { /* invalid — fall through */ }
    } else if (fmRaw && typeof fmRaw === 'object') {
      fieldMap = fmRaw as Record<string, string>
    }
    const rows: SyncRow[] = []
    const errors: SyncResult['errors'] = []
    list.forEach((r, i) => {
      try {
        const year = Number(getField(r, fieldMap.periodYear))
        const month = Number(getField(r, fieldMap.periodMonth))
        const scope = Number(getField(r, fieldMap.scope))
        const av = Number(getField(r, fieldMap.activityValue))
        if (!Number.isFinite(year) || ![1, 2, 3].includes(scope) || !Number.isFinite(av)) {
          throw new Error('Missing required field map (periodYear / scope / activityValue)')
        }
        rows.push({
          rowId: String(i),
          periodYear: year,
          periodMonth: Number.isFinite(month) ? month : null,
          scope: scope as 1 | 2 | 3,
          category: String(getField(r, fieldMap.category) ?? '') || null,
          subcategory: String(getField(r, fieldMap.subcategory) ?? '') || null,
          fuelType: String(getField(r, fieldMap.fuelType) ?? '') || null,
          facilityCode: String(getField(r, fieldMap.facilityCode) ?? '') || null,
          activityValue: av,
          activityUnit: String(getField(r, fieldMap.activityUnit) ?? '') || null,
        })
      } catch (e) {
        errors.push({ row: i, error: e instanceof Error ? e.message : 'parse' })
      }
    })
    return { rows, result: { rowsFetched: list.length, rowsImported: 0, rowsFailed: errors.length, errors } }
  },
}
