/**
 * Oracle Fusion ERP Cloud connector.
 *
 * Auth: OAuth 2.0 via Oracle Identity Cloud Service (IDCS). Client id/secret
 *       provisioned on the Oracle side; redirect URL points back at our
 *       /api/connectors/oauth/callback?provider=oracle_fusion endpoint.
 *
 * Data: REST /fscmRestApi/resources/11.13.18.05/purchaseOrders for utility
 *       and fuel procurement.
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

interface OraclePurchaseOrder {
  POHeaderId?: string
  CreationDate?: string  // ISO
  Description?: string
  OrderedAmount?: number
  CurrencyCode?: string
  ShipToLocationCode?: string
  ItemCategory?: string
  Quantity?: number
  UnitOfMeasure?: string
}

interface OracleListResponse { items?: OraclePurchaseOrder[]; hasMore?: boolean }

export const oracleFusion: ConnectorDefinition = {
  id: 'oracle_fusion',
  name: 'Oracle Fusion ERP Cloud',
  category: 'ERP',
  iconKey: 'oracle',
  description: 'Pull purchase orders for fuel + utilities from Oracle Fusion Cloud REST APIs.',
  authType: 'oauth2',
  oauth: {
    authorizationUrl: 'https://idcs-XXXXX.identity.oraclecloud.com/oauth2/v1/authorize',
    tokenUrl: 'https://idcs-XXXXX.identity.oraclecloud.com/oauth2/v1/token',
    scopes: ['urn:opc:resource:consumer::all'],
    refreshable: true,
    clientIdEnv: 'ORACLE_OAUTH_CLIENT_ID',
    clientSecretEnv: 'ORACLE_OAUTH_CLIENT_SECRET',
  },
  fieldMappings: [
    { source: 'CreationDate', target: 'period_year + period_month' },
    { source: 'ShipToLocationCode', target: 'facility_code' },
    { source: 'Quantity', target: 'activity_value' },
    { source: 'UnitOfMeasure', target: 'activity_unit' },
    { source: 'ItemCategory', target: 'category' },
  ],
  defaultBaseUrl: 'https://your-instance.fa.oraclecloud.com',
  docsUrl: 'https://docs.oracle.com/en/cloud/saas/applications-common/24a/farca/index.html',

  async testConnection(connection: ConnectorConnection): Promise<TestResult> {
    const base = connection.baseUrl ?? 'https://your-instance.fa.oraclecloud.com'
    const token = String(connection.credentials.accessToken ?? '')
    if (!token) return { ok: false, message: 'No access token' }
    try {
      await connectorJson(`${base}/fscmRestApi/resources/11.13.18.05/purchaseOrders?limit=1`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      return { ok: true, message: 'Connected to Oracle Fusion ERP' }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Connection failed' }
    }
  },

  async fetchData(_sql, connection: ConnectorConnection, opts: SyncOptions) {
    const base = connection.baseUrl ?? 'https://your-instance.fa.oraclecloud.com'
    const token = String(connection.credentials.accessToken ?? '')
    if (!token) throw new Error('Oracle access token missing')
    const params = new URLSearchParams({ limit: '1000' })
    if (opts.fromDate) params.set('q', `CreationDate >= "${opts.fromDate}"`)
    const url = `${base}/fscmRestApi/resources/11.13.18.05/purchaseOrders?${params}`
    const payload = await connectorJson<OracleListResponse>(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    const items = payload.items ?? []
    const rows: SyncRow[] = []
    const errors: SyncResult['errors'] = []
    items.forEach((p, idx) => {
      try {
        const date = (p.CreationDate ?? '').slice(0, 10)
        const [yyyy, mm] = date.split('-')
        const year = parseInt(yyyy, 10)
        const month = parseInt(mm, 10)
        const qty = typeof p.Quantity === 'number' ? p.Quantity : NaN
        if (!Number.isFinite(year) || !Number.isFinite(qty)) throw new Error('Invalid date or quantity')
        rows.push({
          rowId: p.POHeaderId ?? String(idx),
          periodYear: year,
          periodMonth: Number.isFinite(month) ? month : null,
          scope: (p.ItemCategory ?? '').toLowerCase().includes('elec') ? 2 : 1,
          category: p.ItemCategory ?? null,
          subcategory: null,
          fuelType: null,
          facilityCode: p.ShipToLocationCode ?? null,
          activityValue: qty,
          activityUnit: p.UnitOfMeasure ?? null,
          notes: p.Description ?? undefined,
        })
      } catch (e) {
        errors.push({ row: p.POHeaderId ?? idx, error: e instanceof Error ? e.message : 'parse' })
      }
    })
    return { rows, result: { rowsFetched: items.length, rowsImported: 0, rowsFailed: errors.length, errors } }
  },
}
