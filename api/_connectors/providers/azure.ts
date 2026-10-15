/**
 * Microsoft Azure / Microsoft 365 connector.
 *
 * Auth: OAuth 2.0 against Microsoft Entra ID (formerly Azure AD). Uses the
 *       v2.0 endpoint with tenant-scoped consent (the customer's Azure admin
 *       grants the application). Tokens are bearer JWTs valid ~1 hour;
 *       refresh tokens are long-lived.
 *
 * Data: Azure Consumption API for Azure spend (Scope 3 cloud carbon) and
 *       MS Graph reports for M365 storage / mailbox usage. v1 ships the
 *       consumption side; M365 reports are optional via providerOptions.
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

interface AzureUsageDetailsResponse {
  value?: Array<{
    properties?: {
      date?: string
      meterName?: string
      meterCategory?: string
      meterSubCategory?: string
      resourceLocation?: string
      cost?: number
      quantity?: number
      billingCurrency?: string
      currency?: string
    }
  }>
}

export const azure: ConnectorDefinition = {
  id: 'azure',
  name: 'Microsoft Azure / M365',
  category: 'Cloud',
  iconKey: 'azure',
  description: 'Pull Azure subscription consumption + M365 service usage for Scope 3 cloud carbon.',
  authType: 'oauth2',
  oauth: {
    // common/tenant-aware — replaced at runtime with the configured tenant id
    authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: [
      'https://management.azure.com/user_impersonation',
      'offline_access',
    ],
    refreshable: true,
    clientIdEnv: 'AZURE_OAUTH_CLIENT_ID',
    clientSecretEnv: 'AZURE_OAUTH_CLIENT_SECRET',
  },
  fieldMappings: [
    { source: 'properties.date', target: 'period_year + period_month' },
    { source: 'properties.resourceLocation', target: 'facility_code', notes: 'Azure region' },
    { source: 'properties.meterCategory', target: 'subcategory' },
    { source: 'properties.cost', target: 'activity_value' },
    { source: 'properties.billingCurrency', target: 'activity_unit' },
  ],
  defaultBaseUrl: 'https://management.azure.com',
  docsUrl: 'https://learn.microsoft.com/en-us/rest/api/consumption/',

  async testConnection(connection: ConnectorConnection): Promise<TestResult> {
    const token = String(connection.credentials.accessToken ?? '')
    if (!token) return { ok: false, message: 'No access token' }
    try {
      await connectorJson('https://management.azure.com/subscriptions?api-version=2022-12-01', {
        headers: { Authorization: `Bearer ${token}` },
      })
      return { ok: true, message: 'Connected to Azure Management API' }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Connection failed' }
    }
  },

  async fetchData(_sql, connection: ConnectorConnection, opts: SyncOptions) {
    const token = String(connection.credentials.accessToken ?? '')
    if (!token) throw new Error('Azure access token missing')
    const subscriptionId = String(
      opts.providerOptions?.subscriptionId ?? connection.credentials.subscriptionId ?? '',
    )
    if (!subscriptionId) {
      return {
        rows: [],
        result: {
          rowsFetched: 0,
          rowsImported: 0,
          rowsFailed: 0,
          errors: [{ row: 'config', error: 'Azure requires subscriptionId in providerOptions' }],
        },
      }
    }
    const start = opts.fromDate ?? new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
    const end = opts.toDate ?? new Date().toISOString().slice(0, 10)
    const filter = `properties/usageStart ge '${start}' and properties/usageEnd le '${end}'`
    const url =
      `https://management.azure.com/subscriptions/${subscriptionId}` +
      `/providers/Microsoft.Consumption/usageDetails` +
      `?$filter=${encodeURIComponent(filter)}&$top=1000&api-version=2023-05-01`
    const payload = await connectorJson<AzureUsageDetailsResponse>(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const items = payload.value ?? []
    const rows: SyncRow[] = []
    const errors: SyncResult['errors'] = []
    items.forEach((u, i) => {
      try {
        const p = u.properties ?? {}
        const date = (p.date ?? '').slice(0, 10)
        const [yyyy, mm] = date.split('-')
        const year = parseInt(yyyy, 10)
        const month = parseInt(mm, 10)
        const cost = typeof p.cost === 'number' ? p.cost : NaN
        if (!Number.isFinite(year) || !Number.isFinite(cost)) throw new Error('Bad date/cost')
        rows.push({
          rowId: String(i),
          periodYear: year,
          periodMonth: Number.isFinite(month) ? month : null,
          scope: 3,
          category: 'Cat 1 — Purchased goods & services (Cloud)',
          subcategory: p.meterCategory ?? null,
          fuelType: null,
          facilityCode: p.resourceLocation ?? null,
          activityValue: cost,
          activityUnit: p.billingCurrency ?? p.currency ?? 'USD',
          notes: p.meterName ?? undefined,
        })
      } catch (e) {
        errors.push({ row: i, error: e instanceof Error ? e.message : 'parse' })
      }
    })
    return { rows, result: { rowsFetched: items.length, rowsImported: 0, rowsFailed: errors.length, errors } }
  },
}
