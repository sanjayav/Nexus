/**
 * Live ERP connector framework — shared types.
 *
 * Each provider under ./providers/ implements ConnectorDefinition. The
 * registry in ./registry.ts exposes them as an array. Endpoints under
 * api/connectors/* iterate the registry to expose available providers,
 * initiate OAuth flows, test connections, and run syncs.
 *
 * Credentials are always passed in decrypted form via ConnectorConnection
 * — decryption happens at the endpoint boundary using api/_crypto.ts.
 * Never log decrypted credentials.
 */
import type { Sql } from '../_db.js'

export type AuthType = 'oauth2' | 'api_key' | 'basic' | 'jwt'

export type ConnectorCategory = 'ERP' | 'CRM' | 'HCM' | 'Data Warehouse' | 'Cloud' | 'Utilities'

export interface ConnectorOAuthConfig {
  /** Provider's authorization endpoint (where the user logs in). */
  authorizationUrl: string
  /** Token exchange endpoint (code → access/refresh tokens). */
  tokenUrl: string
  /** Required scopes for the connector to function. */
  scopes: string[]
  /** Whether the provider issues a refresh_token (most do). */
  refreshable: boolean
  /** Env var that holds Nexus's OAuth client_id with this provider. */
  clientIdEnv: string
  /** Env var that holds the matching client_secret. */
  clientSecretEnv: string
}

export interface ApiKeyField {
  /** Human label shown in the UI. */
  label: string
  /** Stored key inside the encrypted credentials JSON. */
  key: string
  /** Whether to mask the value in the UI (passwords, keys). */
  secret: boolean
  /** Optional description shown under the field. */
  description?: string
  /** Optional placeholder. */
  placeholder?: string
}

/**
 * Decrypted credentials passed to provider methods. Shape is per-provider:
 *  - OAuth providers: { accessToken, refreshToken?, expiresAt?, ... }
 *  - API-key providers: whatever keys the provider declared in apiKeyFields.
 */
export type DecryptedCredentials = Record<string, string | number | undefined>

export interface ConnectorConnection {
  id: string
  orgId: string
  provider: string
  displayName: string
  authType: AuthType
  baseUrl: string | null
  scopes: string[]
  /** Decrypted credentials — only populated inside endpoint handlers. */
  credentials: DecryptedCredentials
}

export interface SyncOptions {
  /** ISO date — inclusive lower bound. */
  fromDate?: string
  /** ISO date — inclusive upper bound. */
  toDate?: string
  /** External facility id → our facilities.id. Resolved by the endpoint
   *  before sync, so providers can map their raw IDs to ours. */
  facilityMapping?: Record<string, string>
  /** Provider-specific overrides (e.g. Snowflake's user SQL, Generic REST's
   *  GET path + JSON pointer). The endpoint passes these through verbatim. */
  providerOptions?: Record<string, unknown>
}

export interface SyncRow {
  /** Source row identifier for error reporting (defaults to row index). */
  rowId?: string
  periodYear: number
  periodMonth: number | null
  scope: 1 | 2 | 3
  category: string | null
  subcategory: string | null
  fuelType: string | null
  facilityCode: string | null
  activityValue: number
  activityUnit: string | null
  /** Raw extras we don't model but want to keep in `notes`. */
  notes?: string
}

export interface SyncResult {
  rowsFetched: number
  rowsImported: number
  rowsFailed: number
  errors: { row: number | string; error: string }[]
}

export interface TestResult {
  ok: boolean
  message: string
  /** Optional structured detail surfaced in the UI. */
  details?: Record<string, unknown>
}

export interface FieldMapping {
  /** External field name in the source system. */
  source: string
  /** Where it lands in our activity_data row. */
  target: string
  /** Brief explanation of any transformation. */
  notes?: string
}

export interface ConnectorDefinition {
  id: string
  name: string
  category: ConnectorCategory
  description: string
  /** SVG path/icon name used by the frontend ConnectorCard. */
  iconKey: string
  authType: AuthType
  oauth?: ConnectorOAuthConfig
  apiKeyFields?: ApiKeyField[]
  /** What we pull from this provider into activity_data. Shown read-only on
   *  the detail page so users know exactly what we're mapping. */
  fieldMappings: FieldMapping[]
  /** Default base URL (e.g. for Salesforce sandbox vs prod). Customers can
   *  override per-connection. */
  defaultBaseUrl?: string
  /** Optional documentation URL with provider-side setup steps. */
  docsUrl?: string
  /** Lightweight liveness check — should hit a /me or /whoami style endpoint. */
  testConnection: (connection: ConnectorConnection) => Promise<TestResult>
  /** Real data pull. Implementations should NOT write to the DB themselves —
   *  return SyncRow[] and let the sync endpoint persist into activity_data. */
  fetchData: (
    sql: Sql,
    connection: ConnectorConnection,
    opts: SyncOptions,
  ) => Promise<{ rows: SyncRow[]; result: SyncResult }>
}

/**
 * Lightweight fetch wrapper for connector implementations. Always sets a
 * 30s timeout and surfaces non-2xx as an Error with body excerpt so callers
 * can return a clear test/sync failure to the customer.
 */
export async function connectorFetch(
  url: string,
  init: RequestInit = {},
  timeoutMs = 30_000,
): Promise<Response> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal })
    return res
  } finally {
    clearTimeout(t)
  }
}

export async function connectorJson<T = unknown>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await connectorFetch(url, init)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}
