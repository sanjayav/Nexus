/**
 * Salesforce connector.
 *
 * Auth: OAuth 2.0 web server flow. The customer's Salesforce admin creates
 *       a Connected App and supplies the resulting client id/secret as Nexus
 *       env vars (SALESFORCE_OAUTH_CLIENT_ID / SALESFORCE_OAUTH_CLIENT_SECRET)
 *       so all Nexus customers share the same Connected App.
 *
 * Data: SOQL via /services/data/v59.0/query. We pull Expense__c records
 *       for T&E spend → Scope 3 Cat 6 (business travel).
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

interface SfRecord {
  Id?: string
  Name?: string
  Amount?: number
  TransactionDate?: string
  Category?: string
  Location__c?: string
}

interface SfQueryResponse { totalSize?: number; records?: SfRecord[] }

export const salesforce: ConnectorDefinition = {
  id: 'salesforce',
  name: 'Salesforce',
  category: 'CRM',
  iconKey: 'salesforce',
  description: 'Pull Expense records via SOQL for Scope 3 Cat 6 business travel.',
  authType: 'oauth2',
  oauth: {
    authorizationUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    scopes: ['api', 'refresh_token', 'offline_access'],
    refreshable: true,
    clientIdEnv: 'SALESFORCE_OAUTH_CLIENT_ID',
    clientSecretEnv: 'SALESFORCE_OAUTH_CLIENT_SECRET',
  },
  fieldMappings: [
    { source: 'TransactionDate', target: 'period_year + period_month' },
    { source: 'Location__c', target: 'facility_code' },
    { source: 'Amount', target: 'activity_value' },
    { source: 'Category', target: 'category' },
  ],
  defaultBaseUrl: 'https://your-instance.my.salesforce.com',
  docsUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_rest.htm',

  async testConnection(connection: ConnectorConnection): Promise<TestResult> {
    const base = connection.baseUrl ?? 'https://your-instance.my.salesforce.com'
    const token = String(connection.credentials.accessToken ?? '')
    if (!token) return { ok: false, message: 'No access token' }
    try {
      await connectorJson(`${base}/services/data/v59.0/`, { headers: { Authorization: `Bearer ${token}` } })
      return { ok: true, message: 'Salesforce API reachable' }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Connection failed' }
    }
  },

  async fetchData(_sql, connection: ConnectorConnection, opts: SyncOptions) {
    const base = connection.baseUrl ?? 'https://your-instance.my.salesforce.com'
    const token = String(connection.credentials.accessToken ?? '')
    if (!token) throw new Error('Salesforce access token missing')
    const where: string[] = []
    if (opts.fromDate) where.push(`TransactionDate >= ${opts.fromDate}`)
    if (opts.toDate)   where.push(`TransactionDate <= ${opts.toDate}`)
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const soql = `SELECT Id, Name, Amount, TransactionDate, Category, Location__c FROM Expense__c ${whereClause} LIMIT 1000`
    const url = `${base}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`
    const payload = await connectorJson<SfQueryResponse>(url, { headers: { Authorization: `Bearer ${token}` } })
    const recs = payload.records ?? []
    const rows: SyncRow[] = []
    const errors: SyncResult['errors'] = []
    recs.forEach((r, i) => {
      try {
        const date = (r.TransactionDate ?? '').slice(0, 10)
        const [yyyy, mm] = date.split('-')
        const year = parseInt(yyyy, 10)
        const month = parseInt(mm, 10)
        const amt = typeof r.Amount === 'number' ? r.Amount : NaN
        if (!Number.isFinite(year) || !Number.isFinite(amt)) throw new Error('Invalid date/amount')
        rows.push({
          rowId: r.Id ?? String(i),
          periodYear: year,
          periodMonth: Number.isFinite(month) ? month : null,
          scope: 3,
          category: 'Cat 6 — Business travel',
          subcategory: r.Category ?? null,
          fuelType: null,
          facilityCode: r.Location__c ?? null,
          activityValue: amt,
          activityUnit: 'USD',
          notes: r.Name ?? undefined,
        })
      } catch (e) {
        errors.push({ row: r.Id ?? i, error: e instanceof Error ? e.message : 'parse' })
      }
    })
    return { rows, result: { rowsFetched: recs.length, rowsImported: 0, rowsFailed: errors.length, errors } }
  },
}
