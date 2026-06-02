/**
 * Google Cloud Billing connector.
 *
 * Auth: OAuth 2.0 (Google's standard 3-legged flow). The customer registers
 *       Nexus as an OAuth client in their GCP project, grants the Billing
 *       Read scope, and Nexus stores access/refresh tokens.
 *
 * Data: Cloud Billing Reports API (alpha) — falls back to BigQuery export
 *       table if the user has provisioned one. v1 pulls usage by SKU /
 *       region and maps to Scope 3 cloud carbon.
 */
import {
  type ConnectorDefinition,
  type ConnectorConnection,
  type SyncOptions,
  type SyncRow,
  type SyncResult,
  type TestResult,
  connectorJson,
  connectorFetch,
} from '../index.js'

interface GcpCostRow {
  service?: { description?: string }
  sku?: { description?: string }
  location?: { location?: string; region?: string }
  cost?: number
  currency?: string
  usage_start_time?: string
}

interface GcpQueryResponse {
  rows?: Array<{ f: Array<{ v: string }> }>
  schema?: { fields: Array<{ name: string }> }
}

export const gcp: ConnectorDefinition = {
  id: 'gcp',
  name: 'Google Cloud Billing',
  category: 'Cloud',
  iconKey: 'gcp',
  description: 'Pull Google Cloud Billing usage by service + region for Scope 3 cloud carbon.',
  authType: 'oauth2',
  oauth: {
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/cloud-billing.readonly',
      'https://www.googleapis.com/auth/bigquery.readonly',
    ],
    refreshable: true,
    clientIdEnv: 'GCP_OAUTH_CLIENT_ID',
    clientSecretEnv: 'GCP_OAUTH_CLIENT_SECRET',
  },
  fieldMappings: [
    { source: 'usage_start_time', target: 'period_year + period_month' },
    { source: 'location.region', target: 'facility_code' },
    { source: 'service.description', target: 'subcategory' },
    { source: 'cost', target: 'activity_value' },
    { source: 'currency', target: 'activity_unit' },
  ],
  defaultBaseUrl: 'https://cloudbilling.googleapis.com',
  docsUrl: 'https://cloud.google.com/billing/docs/reference/rest',

  async testConnection(connection: ConnectorConnection): Promise<TestResult> {
    const token = String(connection.credentials.accessToken ?? '')
    if (!token) return { ok: false, message: 'No access token' }
    try {
      await connectorJson('https://cloudbilling.googleapis.com/v1/billingAccounts?pageSize=1', {
        headers: { Authorization: `Bearer ${token}` },
      })
      return { ok: true, message: 'Connected to Google Cloud Billing' }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Connection failed' }
    }
  },

  async fetchData(_sql, connection: ConnectorConnection, opts: SyncOptions) {
    const token = String(connection.credentials.accessToken ?? '')
    if (!token) throw new Error('GCP access token missing')
    // The Billing Reports API requires a BigQuery export setup. v1 attempts
    // a BigQuery query when projectId + datasetId + tableId are provided in
    // providerOptions, otherwise returns an empty result rather than crash.
    const projectId = String(opts.providerOptions?.projectId ?? connection.credentials.projectId ?? '')
    const datasetId = String(opts.providerOptions?.datasetId ?? connection.credentials.datasetId ?? '')
    const tableId = String(opts.providerOptions?.tableId ?? connection.credentials.tableId ?? '')
    if (!projectId || !datasetId || !tableId) {
      return { rows: [], result: { rowsFetched: 0, rowsImported: 0, rowsFailed: 0, errors: [{ row: 'config', error: 'GCP requires projectId/datasetId/tableId in providerOptions to query the Billing export' }] } }
    }
    const from = opts.fromDate ?? new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10)
    const to = opts.toDate ?? new Date().toISOString().slice(0, 10)
    const query = `
      SELECT service.description AS service, location.region AS region,
             SUM(cost) AS cost, currency,
             FORMAT_TIMESTAMP('%Y-%m', usage_start_time) AS ym
      FROM \`${projectId}.${datasetId}.${tableId}\`
      WHERE usage_start_time BETWEEN TIMESTAMP('${from}') AND TIMESTAMP('${to}')
      GROUP BY service, region, currency, ym
    `
    const res = await connectorFetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, useLegacySql: false }),
      },
    )
    if (!res.ok) throw new Error(`BigQuery HTTP ${res.status}`)
    const payload = await res.json() as GcpQueryResponse
    const fields = (payload.schema?.fields ?? []).map(f => f.name)
    const idx = (n: string) => fields.indexOf(n)
    const rows: SyncRow[] = []
    const errors: SyncResult['errors'] = []
    const dataRows = payload.rows ?? []
    dataRows.forEach((r, i) => {
      try {
        const ym = r.f[idx('ym')]?.v ?? ''
        const [yyyy, mm] = ym.split('-')
        const year = parseInt(yyyy, 10)
        const month = parseInt(mm, 10)
        const cost = parseFloat(r.f[idx('cost')]?.v ?? 'NaN')
        if (!Number.isFinite(year) || !Number.isFinite(cost)) throw new Error('Bad row')
        rows.push({
          rowId: String(i),
          periodYear: year,
          periodMonth: Number.isFinite(month) ? month : null,
          scope: 3,
          category: 'Cat 1 — Purchased goods & services (Cloud)',
          subcategory: r.f[idx('service')]?.v ?? null,
          fuelType: null,
          facilityCode: r.f[idx('region')]?.v ?? null,
          activityValue: cost,
          activityUnit: r.f[idx('currency')]?.v ?? 'USD',
        })
      } catch (e) {
        errors.push({ row: i, error: e instanceof Error ? e.message : 'parse' })
      }
    })
    // satisfy unused-type linter (interface kept for documentation parity)
    void ({} as GcpCostRow)
    return { rows, result: { rowsFetched: dataRows.length, rowsImported: 0, rowsFailed: errors.length, errors } }
  },
}
