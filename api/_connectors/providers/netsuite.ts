/**
 * NetSuite connector.
 *
 * Auth: Token-Based Authentication (TBA — OAuth 1.0a HMAC-SHA256). Customer
 *       provides account_id, consumer key/secret, token id/secret. Modern
 *       NetSuite also supports OAuth 2.0 — we model TBA here because it's
 *       the universally available option across all account tiers.
 *
 * Data: SuiteQL `/services/rest/query/v1/suiteql` — we run a parameterized
 *       query against `transaction` joined with vendor + item to pull
 *       utility-bill + T&E line items.
 */
import crypto from 'crypto'
import {
  type ConnectorDefinition,
  type ConnectorConnection,
  type SyncOptions,
  type SyncRow,
  type SyncResult,
  type TestResult,
  connectorFetch,
} from '../index.js'

interface SuiteQLRow {
  internalid?: string
  tranid?: string
  trandate?: string  // YYYY-MM-DD
  account?: string
  category?: string
  memo?: string
  amount?: string | number
  quantity?: string | number
  units?: string
  location?: string  // we use this as facility_code
  expensecategory?: string
}

interface SuiteQLResponse { items?: SuiteQLRow[]; hasMore?: boolean }

function oauth1Header(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  tokenId: string,
  tokenSecret: string,
  realm: string,
): string {
  const params: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_token: tokenId,
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_version: '1.0',
  }
  const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
  const baseParams = Object.keys(params).sort().map(k => `${enc(k)}=${enc(params[k])}`).join('&')
  const baseStr = [method.toUpperCase(), enc(url), enc(baseParams)].join('&')
  const signingKey = `${enc(consumerSecret)}&${enc(tokenSecret)}`
  const sig = crypto.createHmac('sha256', signingKey).update(baseStr).digest('base64')
  const headerParams: Record<string, string> = { ...params, oauth_signature: sig }
  const header = `OAuth realm="${enc(realm)}",` + Object.keys(headerParams).sort().map(k => `${enc(k)}="${enc(headerParams[k])}"`).join(',')
  return header
}

export const netsuite: ConnectorDefinition = {
  id: 'netsuite',
  name: 'NetSuite',
  category: 'ERP',
  iconKey: 'netsuite',
  description: 'Run SuiteQL against your NetSuite account to pull utility bills and T&E line items.',
  authType: 'api_key',
  apiKeyFields: [
    { label: 'Account ID', key: 'accountId', secret: false, placeholder: '1234567' },
    { label: 'Consumer Key', key: 'consumerKey', secret: true },
    { label: 'Consumer Secret', key: 'consumerSecret', secret: true },
    { label: 'Token ID', key: 'tokenId', secret: true },
    { label: 'Token Secret', key: 'tokenSecret', secret: true },
  ],
  fieldMappings: [
    { source: 'trandate', target: 'period_year + period_month', notes: 'Split YYYY-MM-DD' },
    { source: 'location', target: 'facility_code' },
    { source: 'quantity', target: 'activity_value' },
    { source: 'units', target: 'activity_unit' },
    { source: 'expensecategory', target: 'category' },
  ],
  docsUrl: 'https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_158354027810.html',

  async testConnection(connection: ConnectorConnection): Promise<TestResult> {
    const c = connection.credentials
    const account = String(c.accountId ?? '').toLowerCase()
    if (!account) return { ok: false, message: 'Account ID missing' }
    const base = `https://${account}.suitetalk.api.netsuite.com`
    const url = `${base}/services/rest/query/v1/suiteql?limit=1`
    try {
      const header = oauth1Header('POST', url,
        String(c.consumerKey ?? ''), String(c.consumerSecret ?? ''),
        String(c.tokenId ?? ''), String(c.tokenSecret ?? ''),
        account.toUpperCase().replace(/-/g, '_'))
      const res = await connectorFetch(url, {
        method: 'POST',
        headers: { Authorization: header, 'Content-Type': 'application/json', Prefer: 'transient' },
        body: JSON.stringify({ q: 'SELECT 1 AS ok FROM dual' }),
      })
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}` }
      return { ok: true, message: 'Authenticated against NetSuite SuiteQL' }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Connection failed' }
    }
  },

  async fetchData(_sql, connection: ConnectorConnection, opts: SyncOptions) {
    const c = connection.credentials
    const account = String(c.accountId ?? '').toLowerCase()
    if (!account) throw new Error('NetSuite account ID missing')
    const base = `https://${account}.suitetalk.api.netsuite.com`
    const url = `${base}/services/rest/query/v1/suiteql?limit=1000`
    const dateClauses: string[] = []
    if (opts.fromDate) dateClauses.push(`trandate >= TO_DATE('${opts.fromDate}','YYYY-MM-DD')`)
    if (opts.toDate)   dateClauses.push(`trandate <= TO_DATE('${opts.toDate}','YYYY-MM-DD')`)
    const where = dateClauses.length ? `WHERE ${dateClauses.join(' AND ')}` : ''
    const q = `SELECT t.id AS internalid, t.tranid, TO_CHAR(t.trandate,'YYYY-MM-DD') AS trandate, t.memo, t.amount, t.location, ec.name AS expensecategory FROM transaction t LEFT JOIN expenseCategory ec ON ec.id = t.expensecategory ${where}`

    const header = oauth1Header('POST', url,
      String(c.consumerKey ?? ''), String(c.consumerSecret ?? ''),
      String(c.tokenId ?? ''), String(c.tokenSecret ?? ''),
      account.toUpperCase().replace(/-/g, '_'))

    const res = await connectorFetch(url, {
      method: 'POST',
      headers: { Authorization: header, 'Content-Type': 'application/json', Prefer: 'transient' },
      body: JSON.stringify({ q }),
    })
    if (!res.ok) throw new Error(`NetSuite SuiteQL HTTP ${res.status}`)
    const data = await res.json() as SuiteQLResponse
    const items = data.items ?? []

    const rows: SyncRow[] = []
    const errors: SyncResult['errors'] = []
    items.forEach((item, idx) => {
      try {
        const date = item.trandate ?? ''
        const [yyyy, mm] = date.split('-')
        const year = parseInt(yyyy, 10)
        const month = parseInt(mm, 10)
        const amt = typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount ?? ''))
        if (!Number.isFinite(year) || !Number.isFinite(amt)) throw new Error('Invalid trandate/amount')
        const isUtility = (item.expensecategory ?? '').toLowerCase().includes('util')
          || (item.memo ?? '').toLowerCase().includes('electric')
        rows.push({
          rowId: item.internalid ?? String(idx),
          periodYear: year,
          periodMonth: Number.isFinite(month) ? month : null,
          scope: isUtility ? 2 : 3,
          category: isUtility ? 'Purchased electricity' : 'Cat 6 — Business travel',
          subcategory: item.expensecategory ?? null,
          fuelType: null,
          facilityCode: item.location ?? null,
          activityValue: amt,
          activityUnit: 'USD',
          notes: item.memo ?? undefined,
        })
      } catch (e) {
        errors.push({ row: item.internalid ?? idx, error: e instanceof Error ? e.message : 'parse failure' })
      }
    })

    return {
      rows,
      result: { rowsFetched: items.length, rowsImported: 0, rowsFailed: errors.length, errors },
    }
  },
}
