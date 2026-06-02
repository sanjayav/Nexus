/**
 * Connector framework unit tests.
 *
 * Exercises:
 *  - Registry shape (10 providers wired)
 *  - Each adapter's metadata (id, scopes, field mappings)
 *  - Graceful failure for adapters when API calls are mocked to reject
 *  - Token encryption round-trip via api/_crypto.ts (used to persist tokens)
 *  - Generic REST field-map plucking
 *
 * Network calls are stubbed via global.fetch — we never reach a real provider.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { encrypt, decrypt } from '../../../api/_crypto'
import { CONNECTORS, getConnector, listConnectors } from '../../../api/_connectors/registry'
import type { ConnectorConnection, SyncOptions } from '../../../api/_connectors/index'

const fetchMock = vi.fn()
const originalFetch = globalThis.fetch

beforeEach(() => {
  fetchMock.mockReset()
  globalThis.fetch = fetchMock as unknown as typeof fetch
})
afterEach(() => {
  globalThis.fetch = originalFetch
})

function makeConnection(provider: string, creds: Record<string, string> = {}): ConnectorConnection {
  return {
    id: 'conn-1',
    orgId: 'org-1',
    provider,
    displayName: 'Test',
    authType: 'oauth2',
    baseUrl: 'https://example.test',
    scopes: [],
    credentials: { accessToken: 'tok', ...creds },
  }
}

describe('connector registry', () => {
  it('registers all 10 expected providers', () => {
    const ids = listConnectors().map(c => c.id).sort()
    expect(ids).toEqual([
      'aws',
      'azure',
      'gcp',
      'generic_rest',
      'netsuite',
      'oracle_fusion',
      'salesforce',
      'sap_s4hana',
      'snowflake',
      'workday',
    ])
  })

  it('returns undefined for unknown ids', () => {
    expect(getConnector('does_not_exist')).toBeUndefined()
  })

  it('every adapter declares an iconKey + non-empty description', () => {
    for (const c of listConnectors()) {
      expect(c.iconKey).toBeTruthy()
      expect(c.description.length).toBeGreaterThan(10)
      expect(c.fieldMappings.length).toBeGreaterThan(0)
    }
  })

  it('OAuth providers carry an authorizationUrl, tokenUrl, and env vars', () => {
    const oauthProviders = listConnectors().filter(c => c.authType === 'oauth2')
    expect(oauthProviders.length).toBeGreaterThan(0)
    for (const c of oauthProviders) {
      expect(c.oauth?.authorizationUrl).toMatch(/^https:\/\//)
      expect(c.oauth?.tokenUrl).toMatch(/^https:\/\//)
      expect(c.oauth?.clientIdEnv).toMatch(/^[A-Z_]+$/)
      expect(c.oauth?.clientSecretEnv).toMatch(/^[A-Z_]+$/)
      expect(c.oauth?.scopes.length).toBeGreaterThan(0)
    }
  })

  it('API-key providers declare apiKeyFields', () => {
    const keyProviders = listConnectors().filter(c => c.authType === 'api_key')
    expect(keyProviders.length).toBeGreaterThan(0)
    for (const c of keyProviders) {
      expect(c.apiKeyFields).toBeDefined()
      expect((c.apiKeyFields ?? []).length).toBeGreaterThan(0)
    }
  })
})

describe('crypto round-trip for stored credentials', () => {
  it('access token survives encrypt → decrypt', () => {
    const tok = 'ya29.a0AfH6SMB' + 'x'.repeat(80)
    const ct = encrypt(tok)
    expect(ct).not.toBe(tok)
    expect(decrypt(ct)).toBe(tok)
  })

  it('JSON credential blob survives encrypt → decrypt', () => {
    const creds = JSON.stringify({ accessKey: 'AKIA…', secretKey: 'shh', region: 'us-east-1' })
    expect(JSON.parse(decrypt(encrypt(creds)))).toEqual({
      accessKey: 'AKIA…', secretKey: 'shh', region: 'us-east-1',
    })
  })
})

describe('adapter sync — graceful failure on API errors', () => {
  it('SAP: throws on missing access token, swallows non-2xx as error', async () => {
    const sap = getConnector('sap_s4hana')!
    await expect(sap.fetchData(null as never, makeConnection('sap_s4hana', { accessToken: '' }), {}))
      .rejects.toThrow(/access token/i)

    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }))
    await expect(sap.fetchData(null as never, makeConnection('sap_s4hana'), {}))
      .rejects.toThrow(/500|HTTP/i)
  })

  it('Salesforce: handles empty SOQL response without throwing', async () => {
    const sf = getConnector('salesforce')!
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ records: [] }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }))
    const { rows, result } = await sf.fetchData(null as never, makeConnection('salesforce'), {})
    expect(rows).toEqual([])
    expect(result.rowsFetched).toBe(0)
    expect(result.errors).toEqual([])
  })

  it('Oracle Fusion: parses a single PO row into a Scope-2 activity row', async () => {
    const oracle = getConnector('oracle_fusion')!
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      items: [{
        POHeaderId: 'po-1',
        CreationDate: '2026-03-15',
        ShipToLocationCode: 'HQ',
        ItemCategory: 'Electricity',
        Quantity: 1234,
        UnitOfMeasure: 'kWh',
      }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const { rows } = await oracle.fetchData(null as never, makeConnection('oracle_fusion'), {})
    expect(rows.length).toBe(1)
    expect(rows[0].scope).toBe(2)
    expect(rows[0].periodYear).toBe(2026)
    expect(rows[0].activityValue).toBe(1234)
  })

  it('Workday: aggregates headcount per location', async () => {
    const wd = getConnector('workday')!
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      data: [
        { Location: 'NYC', Count: 42 },
        { Location: 'LON', Count: 17 },
      ],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const { rows } = await wd.fetchData(null as never, makeConnection('workday'), { toDate: '2026-01-01' })
    expect(rows.length).toBe(2)
    expect(rows.find(r => r.facilityCode === 'NYC')?.activityValue).toBe(42)
    expect(rows.every(r => r.scope === 3)).toBe(true)
  })

  it('Azure: returns config error (not crash) when subscriptionId missing', async () => {
    const az = getConnector('azure')!
    const { rows, result } = await az.fetchData(null as never, makeConnection('azure'), {})
    expect(rows).toEqual([])
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].error).toMatch(/subscriptionId/)
  })

  it('GCP: returns config error when BigQuery export not configured', async () => {
    const g = getConnector('gcp')!
    const { rows, result } = await g.fetchData(null as never, makeConnection('gcp'), {})
    expect(rows).toEqual([])
    expect(result.errors[0].error).toMatch(/projectId|datasetId|tableId/)
  })

  it('Generic REST: throws when endpoint URL not configured', async () => {
    const gr = getConnector('generic_rest')!
    const conn: ConnectorConnection = {
      ...makeConnection('generic_rest'),
      authType: 'api_key',
      credentials: { endpointUrl: '' },
    }
    await expect(gr.fetchData(null as never, conn, {})).rejects.toThrow(/endpoint URL/i)
  })

  it('Generic REST: maps rows via customer-provided field map', async () => {
    const gr = getConnector('generic_rest')!
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      data: [
        { y: 2026, m: 1, sc: 1, c: 'Stationary', v: 100, u: 'litres' },
        { y: 2026, m: 2, sc: 2, c: 'Electricity', v: 200, u: 'kWh' },
      ],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const conn: ConnectorConnection = {
      ...makeConnection('generic_rest'),
      authType: 'api_key',
      credentials: { endpointUrl: 'https://api.test/usage' },
    }
    const opts: SyncOptions = {
      providerOptions: {
        rowsPath: 'data',
        fieldMap: {
          periodYear: 'y', periodMonth: 'm', scope: 'sc',
          category: 'c', activityValue: 'v', activityUnit: 'u',
        },
      },
    }
    const { rows, result } = await gr.fetchData(null as never, conn, opts)
    expect(result.rowsFetched).toBe(2)
    expect(rows[0]).toMatchObject({ periodYear: 2026, scope: 1, activityValue: 100, activityUnit: 'litres' })
    expect(rows[1]).toMatchObject({ periodYear: 2026, scope: 2, activityValue: 200, activityUnit: 'kWh' })
  })

  it('NetSuite: throws when accountId missing', async () => {
    const ns = getConnector('netsuite')!
    const conn: ConnectorConnection = {
      ...makeConnection('netsuite'),
      authType: 'api_key',
      credentials: {},
    }
    await expect(ns.fetchData(null as never, conn, {})).rejects.toThrow(/account/i)
  })

  it('AWS: throws when access/secret keys missing', async () => {
    const a = getConnector('aws')!
    const conn: ConnectorConnection = {
      ...makeConnection('aws'),
      authType: 'api_key',
      credentials: {},
    }
    await expect(a.fetchData(null as never, conn, {})).rejects.toThrow(/credentials/i)
  })
})

describe('adapter test connections — surface failure without crashing', () => {
  it('SAP testConnection returns ok=false when token missing', async () => {
    const sap = getConnector('sap_s4hana')!
    const r = await sap.testConnection({
      ...makeConnection('sap_s4hana', { accessToken: '' }),
    })
    expect(r.ok).toBe(false)
  })

  it('Snowflake testConnection returns ok=false on missing creds', async () => {
    const sf = getConnector('snowflake')!
    const r = await sf.testConnection({
      ...makeConnection('snowflake'),
      authType: 'api_key',
      credentials: {},
    })
    expect(r.ok).toBe(false)
  })

  it('Generic REST testConnection short-circuits when URL missing', async () => {
    const gr = getConnector('generic_rest')!
    const r = await gr.testConnection({
      ...makeConnection('generic_rest'),
      authType: 'api_key',
      credentials: {},
    })
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/URL/i)
  })

  it('AWS testConnection returns ok=false on missing keys (no crash)', async () => {
    const a = getConnector('aws')!
    const r = await a.testConnection({
      ...makeConnection('aws'),
      authType: 'api_key',
      credentials: {},
    })
    expect(r.ok).toBe(false)
  })
})

describe('CONNECTORS export shape (smoke)', () => {
  it('exposes adapters keyed by their id', () => {
    expect(CONNECTORS.sap_s4hana?.id).toBe('sap_s4hana')
    expect(CONNECTORS.generic_rest?.id).toBe('generic_rest')
    expect(Object.keys(CONNECTORS).length).toBe(10)
  })
})
