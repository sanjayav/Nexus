/**
 * Snowflake connector.
 *
 * Auth: Key-pair authentication (Snowflake's recommended pattern for service
 *       accounts). Customer provides account, user, private key (PEM). We
 *       sign a JWT and use it as the Bearer for /api/v2/statements.
 *
 * Data: Customer-provided SQL template. The SQL must produce columns named
 *       period_year, period_month, scope, category, facility_code,
 *       activity_value, activity_unit. We pass through verbatim — Snowflake
 *       is intentionally a flexible passthrough so customers can shape their
 *       own warehouse models into activity_data.
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

interface SnowflakeStatementResponse {
  data?: Array<Array<string | number | null>>
  resultSetMetaData?: { rowType?: Array<{ name?: string }> }
  message?: string
  code?: string
}

function signSnowflakeJWT(account: string, user: string, privateKeyPem: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  // Snowflake JWT requires the public key fingerprint as part of `iss` —
  // computed as `SHA256:<base64(sha256(DER))>` of the matching public key.
  // We derive it from the private key.
  let publicKeyDer: Buffer
  try {
    const keyObj = crypto.createPrivateKey(privateKeyPem)
    const pub = crypto.createPublicKey(keyObj)
    publicKeyDer = pub.export({ type: 'spki', format: 'der' }) as Buffer
  } catch (e) {
    throw new Error('Invalid PEM private key: ' + (e instanceof Error ? e.message : 'unknown'))
  }
  const fingerprint = 'SHA256:' + crypto.createHash('sha256').update(publicKeyDer).digest('base64')
  const sub = `${account.toUpperCase()}.${user.toUpperCase()}`
  const iss = `${sub}.${fingerprint}`
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({ iss, sub, iat: now, exp: now + 3500 })).toString('base64url')
  const signingInput = `${header}.${payload}`
  const sig = crypto.sign('RSA-SHA256', Buffer.from(signingInput), privateKeyPem).toString('base64url')
  return `${signingInput}.${sig}`
}

export const snowflake: ConnectorDefinition = {
  id: 'snowflake',
  name: 'Snowflake',
  category: 'Data Warehouse',
  iconKey: 'snowflake',
  description: 'Run a parameterized SQL against your Snowflake warehouse and ingest the rows directly into activity_data.',
  authType: 'api_key',
  apiKeyFields: [
    { label: 'Account locator', key: 'account', secret: false, placeholder: 'abc12345.us-east-1' },
    { label: 'Username', key: 'user', secret: false },
    { label: 'Private key (PEM)', key: 'privateKey', secret: true, description: 'Generated via `openssl genrsa -out rsa_key.pem 2048` and registered on the Snowflake user.' },
    { label: 'Default warehouse', key: 'warehouse', secret: false, placeholder: 'COMPUTE_WH' },
    { label: 'Default database', key: 'database', secret: false },
    { label: 'Default schema', key: 'schema', secret: false },
    { label: 'SQL template', key: 'sqlTemplate', secret: false, description: 'Must return columns: period_year, period_month, scope, category, facility_code, activity_value, activity_unit.' },
  ],
  fieldMappings: [
    { source: 'period_year', target: 'period_year' },
    { source: 'period_month', target: 'period_month' },
    { source: 'scope', target: 'scope' },
    { source: 'category', target: 'category' },
    { source: 'facility_code', target: 'facility_code' },
    { source: 'activity_value', target: 'activity_value' },
    { source: 'activity_unit', target: 'activity_unit' },
  ],
  docsUrl: 'https://docs.snowflake.com/en/developer-guide/sql-api/index',

  async testConnection(connection: ConnectorConnection): Promise<TestResult> {
    const c = connection.credentials
    const account = String(c.account ?? '')
    const user = String(c.user ?? '')
    const pk = String(c.privateKey ?? '')
    if (!account || !user || !pk) return { ok: false, message: 'Missing account/user/privateKey' }
    try {
      const jwt = signSnowflakeJWT(account, user, pk)
      const res = await connectorFetch(`https://${account}.snowflakecomputing.com/api/v2/statements`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'X-Snowflake-Authorization-Token-Type': 'KEYPAIR_JWT',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ statement: 'SELECT 1 AS ok', timeout: 10 }),
      })
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}` }
      return { ok: true, message: 'Authenticated to Snowflake via key-pair JWT' }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Connection failed' }
    }
  },

  async fetchData(_sql, connection: ConnectorConnection, opts: SyncOptions) {
    const c = connection.credentials
    const account = String(c.account ?? '')
    const user = String(c.user ?? '')
    const pk = String(c.privateKey ?? '')
    const sqlTemplate = String((opts.providerOptions?.sqlTemplate as string) ?? c.sqlTemplate ?? '')
    if (!sqlTemplate.trim()) throw new Error('Snowflake sqlTemplate not configured')
    const jwt = signSnowflakeJWT(account, user, pk)
    // Bind from/to dates as template params if the SQL uses them.
    const statement = sqlTemplate
      .replace(/:from_date/gi, `'${opts.fromDate ?? '1900-01-01'}'`)
      .replace(/:to_date/gi, `'${opts.toDate ?? '9999-12-31'}'`)

    const res = await connectorFetch(`https://${account}.snowflakecomputing.com/api/v2/statements`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        'X-Snowflake-Authorization-Token-Type': 'KEYPAIR_JWT',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        statement,
        warehouse: String(c.warehouse ?? ''),
        database: String(c.database ?? ''),
        schema: String(c.schema ?? ''),
        timeout: 120,
      }),
    })
    if (!res.ok) throw new Error(`Snowflake HTTP ${res.status}`)
    const payload = await res.json() as SnowflakeStatementResponse
    const cols = (payload.resultSetMetaData?.rowType ?? []).map(c2 => (c2.name ?? '').toLowerCase())
    const data = payload.data ?? []
    const idx = (n: string) => cols.indexOf(n)

    const rows: SyncRow[] = []
    const errors: SyncResult['errors'] = []
    data.forEach((r, i) => {
      try {
        const year = Number(r[idx('period_year')])
        const month = Number(r[idx('period_month')])
        const scope = Number(r[idx('scope')]) as 1 | 2 | 3
        const av = Number(r[idx('activity_value')])
        if (!Number.isFinite(year) || ![1, 2, 3].includes(scope) || !Number.isFinite(av)) {
          throw new Error('Missing required column or invalid value')
        }
        rows.push({
          rowId: String(i),
          periodYear: year,
          periodMonth: Number.isFinite(month) ? month : null,
          scope,
          category: String(r[idx('category')] ?? '') || null,
          subcategory: null,
          fuelType: null,
          facilityCode: String(r[idx('facility_code')] ?? '') || null,
          activityValue: av,
          activityUnit: String(r[idx('activity_unit')] ?? '') || null,
        })
      } catch (e) {
        errors.push({ row: i, error: e instanceof Error ? e.message : 'parse failure' })
      }
    })

    return { rows, result: { rowsFetched: data.length, rowsImported: 0, rowsFailed: errors.length, errors } }
  },
}
