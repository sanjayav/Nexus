/**
 * Workday connector.
 *
 * Auth: OAuth 2.0 (Workday's Bearer scheme — refresh tokens are long-lived).
 *
 * Data: Workday Query Language (WQL) over REST. We pull headcount-by-location
 *       so we can feed Scope 3 Cat 7 (employee commute) calculations + ESRS
 *       S1 workforce metrics. The exact dataset varies by tenant — we use
 *       `allWorkers` as the canonical seed.
 */
import {
  type ConnectorDefinition,
  type ConnectorConnection,
  type SyncOptions,
  type SyncRow,
  type SyncResult,
  type TestResult,
  connectorJson,
} from '../index.js'

interface WorkdayWqlRow {
  Worker?: string
  Location?: string
  HireDate?: string
  Department?: string
}

interface WorkdayWqlResponse { data?: WorkdayWqlRow[]; total?: number }

export const workday: ConnectorDefinition = {
  id: 'workday',
  name: 'Workday',
  category: 'HCM',
  iconKey: 'workday',
  description: 'Pull headcount-by-location from Workday for Scope 3 Cat 7 commute and ESRS S1 workforce metrics.',
  authType: 'oauth2',
  oauth: {
    authorizationUrl: 'https://wd2-impl-services1.workday.com/ccx/oauth2/authorize',
    tokenUrl: 'https://wd2-impl-services1.workday.com/ccx/oauth2/token',
    scopes: ['Staffing'],
    refreshable: true,
    clientIdEnv: 'WORKDAY_OAUTH_CLIENT_ID',
    clientSecretEnv: 'WORKDAY_OAUTH_CLIENT_SECRET',
  },
  fieldMappings: [
    { source: 'Location', target: 'facility_code' },
    { source: '(count of workers)', target: 'activity_value', notes: 'Aggregated headcount per location' },
    { source: '"persons"', target: 'activity_unit' },
  ],
  defaultBaseUrl: 'https://wd2-impl-services1.workday.com',
  docsUrl: 'https://doc.workday.com/reader/Hur1Sz39iVbY3VFv8b_K6Q/',

  async testConnection(connection: ConnectorConnection): Promise<TestResult> {
    const base = connection.baseUrl ?? 'https://wd2-impl-services1.workday.com'
    const token = String(connection.credentials.accessToken ?? '')
    if (!token) return { ok: false, message: 'No access token' }
    try {
      await connectorJson(`${base}/ccx/api/wql/v1/data?query=SELECT 1 FROM allWorkers LIMIT 1`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return { ok: true, message: 'Workday WQL reachable' }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Connection failed' }
    }
  },

  async fetchData(_sql, connection: ConnectorConnection, opts: SyncOptions) {
    const base = connection.baseUrl ?? 'https://wd2-impl-services1.workday.com'
    const token = String(connection.credentials.accessToken ?? '')
    if (!token) throw new Error('Workday access token missing')
    const year = opts.toDate ? parseInt(opts.toDate.slice(0, 4), 10) : new Date().getFullYear()
    const query = `SELECT Location, COUNT(Worker) AS Count FROM allWorkers GROUP BY Location`
    const url = `${base}/ccx/api/wql/v1/data?query=${encodeURIComponent(query)}`
    const payload = await connectorJson<WorkdayWqlResponse>(url, { headers: { Authorization: `Bearer ${token}` } })
    const data = payload.data ?? []
    const rows: SyncRow[] = []
    const errors: SyncResult['errors'] = []
    data.forEach((r, i) => {
      try {
        const count = Number((r as Record<string, unknown>).Count)
        if (!Number.isFinite(count)) throw new Error('Bad count')
        rows.push({
          rowId: String(i),
          periodYear: year,
          periodMonth: null,
          scope: 3,
          category: 'Cat 7 — Employee commuting',
          subcategory: 'Headcount (workforce baseline)',
          fuelType: null,
          facilityCode: r.Location ?? null,
          activityValue: count,
          activityUnit: 'persons',
        })
      } catch (e) {
        errors.push({ row: i, error: e instanceof Error ? e.message : 'parse' })
      }
    })
    return { rows, result: { rowsFetched: data.length, rowsImported: 0, rowsFailed: errors.length, errors } }
  },
}
