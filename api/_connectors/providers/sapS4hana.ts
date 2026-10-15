/**
 * SAP S/4HANA connector.
 *
 * Auth: OAuth 2.0 (S/4HANA Cloud) — auth code flow with client credentials
 *       stored as SAP_OAUTH_CLIENT_ID / SAP_OAUTH_CLIENT_SECRET on Nexus.
 *       On-prem customers can use basic auth via the apiKeyFields path
 *       (we expose both — pick the right provider at connect time).
 *
 * Data: OData /sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocumentItem
 *       for fuel + utility procurement line items. Each line maps to a
 *       Scope 1 (fuel) or Scope 2 (electricity) activity_data row using the
 *       material's product category as the discriminator.
 *
 * SAP date quirks:
 *   - GJAHR is fiscal year (we treat as calendar year — customer can override)
 *   - MONAT is fiscal month "001".."012" — zero-padded string we coerce to int
 *   - KOSTL is the cost center code, mapped to our facility_code
 *   - MENGE is the quantity, MEINS is the unit of measure
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

interface SapBillingItem {
  GJAHR?: string
  MONAT?: string
  KOSTL?: string
  MENGE?: string | number
  MEINS?: string
  MATKL?: string  // Material group — used to classify scope
  BillingDocumentItem?: string
}

interface SapODataResponse {
  d?: { results?: SapBillingItem[] }
  value?: SapBillingItem[]
}

function classifyScope(matkl: string | undefined): { scope: 1 | 2 | 3; category: string; fuelType: string | null } | null {
  const m = (matkl ?? '').toUpperCase()
  if (!m) return null
  if (m.includes('FUEL') || m.includes('DIESEL') || m.includes('GASOLINE') || m.includes('LPG')) {
    return { scope: 1, category: 'Stationary combustion', fuelType: m.toLowerCase() }
  }
  if (m.includes('ELEC') || m.includes('POWER')) {
    return { scope: 2, category: 'Purchased electricity', fuelType: null }
  }
  if (m.includes('GAS') || m.includes('NATURAL_GAS')) {
    return { scope: 1, category: 'Stationary combustion', fuelType: 'natural gas' }
  }
  return null
}

export const sapS4hana: ConnectorDefinition = {
  id: 'sap_s4hana',
  name: 'SAP S/4HANA',
  category: 'ERP',
  iconKey: 'sap',
  description: 'Pull fuel + electricity procurement line items from SAP S/4HANA Cloud OData APIs.',
  authType: 'oauth2',
  oauth: {
    authorizationUrl: 'https://accounts.sap.com/saml2/idp/sso',
    tokenUrl: 'https://api.sap.com/oauth/token',
    scopes: ['API_BILLING_DOCUMENT_SRV_0001'],
    refreshable: true,
    clientIdEnv: 'SAP_OAUTH_CLIENT_ID',
    clientSecretEnv: 'SAP_OAUTH_CLIENT_SECRET',
  },
  fieldMappings: [
    { source: 'GJAHR', target: 'period_year', notes: 'SAP fiscal year' },
    { source: 'MONAT', target: 'period_month', notes: 'SAP fiscal period 001-012' },
    { source: 'KOSTL', target: 'facility_code', notes: 'SAP cost center' },
    { source: 'MENGE', target: 'activity_value' },
    { source: 'MEINS', target: 'activity_unit', notes: 'SAP unit of measure' },
    { source: 'MATKL', target: 'category', notes: 'Material group → scope/category mapping' },
  ],
  defaultBaseUrl: 'https://my000000.s4hana.cloud.sap',
  docsUrl: 'https://api.sap.com/api/API_BILLING_DOCUMENT_SRV',

  async testConnection(connection: ConnectorConnection): Promise<TestResult> {
    const base = connection.baseUrl ?? 'https://my000000.s4hana.cloud.sap'
    const token = String(connection.credentials.accessToken ?? '')
    if (!token) return { ok: false, message: 'No access token on connection' }
    try {
      const res = await connectorJson<{ d?: unknown }>(
        `${base}/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/$metadata?$top=1`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
      )
      return { ok: true, message: 'Connected to SAP S/4HANA Cloud', details: { hasMetadata: Boolean(res) } }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Connection failed' }
    }
  },

  async fetchData(_sql, connection: ConnectorConnection, opts: SyncOptions) {
    const base = connection.baseUrl ?? 'https://my000000.s4hana.cloud.sap'
    const token = String(connection.credentials.accessToken ?? '')
    if (!token) throw new Error('SAP access token missing — re-authorize the connection')

    const filters: string[] = []
    if (opts.fromDate) filters.push(`BillingDocumentDate ge datetime'${opts.fromDate}T00:00:00'`)
    if (opts.toDate)   filters.push(`BillingDocumentDate le datetime'${opts.toDate}T23:59:59'`)
    const qs = new URLSearchParams({
      $format: 'json',
      $top: '1000',
      ...(filters.length ? { $filter: filters.join(' and ') } : {}),
    })

    const url = `${base}/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocumentItem?${qs}`
    const payload = await connectorJson<SapODataResponse>(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })

    const items = payload.d?.results ?? payload.value ?? []
    const rows: SyncRow[] = []
    const errors: SyncResult['errors'] = []

    items.forEach((item, idx) => {
      try {
        const cls = classifyScope(item.MATKL)
        if (!cls) return  // skip non-emissions items silently
        const year = parseInt(item.GJAHR ?? '', 10)
        const month = parseInt((item.MONAT ?? '').replace(/^0+/, ''), 10)
        const qty = typeof item.MENGE === 'number' ? item.MENGE : parseFloat(String(item.MENGE ?? ''))
        if (!Number.isFinite(year) || !Number.isFinite(qty)) throw new Error('Invalid GJAHR/MENGE')
        rows.push({
          rowId: item.BillingDocumentItem ?? String(idx),
          periodYear: year,
          periodMonth: Number.isFinite(month) ? month : null,
          scope: cls.scope,
          category: cls.category,
          subcategory: item.MATKL ?? null,
          fuelType: cls.fuelType,
          facilityCode: item.KOSTL ?? null,
          activityValue: qty,
          activityUnit: item.MEINS ?? null,
        })
      } catch (e) {
        errors.push({ row: item.BillingDocumentItem ?? idx, error: e instanceof Error ? e.message : 'parse failure' })
      }
    })

    return {
      rows,
      result: {
        rowsFetched: items.length,
        rowsImported: 0,  // caller fills after persist
        rowsFailed: errors.length,
        errors,
      },
    }
  },
}
