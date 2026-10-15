/**
 * AWS Cost Explorer connector.
 *
 * Auth: AWS Signature V4 with IAM access key + secret access key (the
 *       AWS-equivalent of "API key" auth). For OAuth-style flows AWS uses
 *       SSO/IAM Identity Center; v1 ships with static creds because every
 *       AWS customer can mint a programmatic key in 30 seconds.
 *
 * Data: ce.GetCostAndUsage grouped by REGION + SERVICE → Scope 3 cloud
 *       carbon (Cloud Carbon Footprint methodology). We pull last 12 months
 *       USD spend and surface as activity_value=USD so downstream emission
 *       factors (kgCO2e per $) translate to Scope 3 Cat 1 / Cat 8.
 */
import {
  type ConnectorDefinition,
  type ConnectorConnection,
  type SyncOptions,
  type SyncRow,
  type SyncResult,
  type TestResult,
  connectorFetch,
} from '../index.js'
import crypto from 'crypto'

interface CeResultByTime {
  TimePeriod?: { Start?: string; End?: string }
  Groups?: Array<{ Keys?: string[]; Metrics?: Record<string, { Amount?: string; Unit?: string }> }>
}

interface CeResponse {
  ResultsByTime?: CeResultByTime[]
}

function sha256Hex(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex')
}

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest()
}

function signV4(opts: {
  accessKey: string
  secretKey: string
  region: string
  service: string
  method: string
  host: string
  path: string
  body: string
  amzTarget: string
}): Record<string, string> {
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = sha256Hex(opts.body)
  const canonicalHeaders =
    `content-type:application/x-amz-json-1.1\n` +
    `host:${opts.host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${opts.amzTarget}\n`
  const signedHeaders = 'content-type;host;x-amz-date;x-amz-target'
  const canonicalReq =
    `${opts.method}\n${opts.path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`
  const credScope = `${dateStamp}/${opts.region}/${opts.service}/aws4_request`
  const strToSign =
    `AWS4-HMAC-SHA256\n${amzDate}\n${credScope}\n${sha256Hex(canonicalReq)}`
  const kDate = hmac(`AWS4${opts.secretKey}`, dateStamp)
  const kRegion = hmac(kDate, opts.region)
  const kService = hmac(kRegion, opts.service)
  const kSigning = hmac(kService, 'aws4_request')
  const signature = crypto.createHmac('sha256', kSigning).update(strToSign).digest('hex')
  return {
    'Content-Type': 'application/x-amz-json-1.1',
    Host: opts.host,
    'X-Amz-Date': amzDate,
    'X-Amz-Target': opts.amzTarget,
    Authorization:
      `AWS4-HMAC-SHA256 Credential=${opts.accessKey}/${credScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
  }
}

export const aws: ConnectorDefinition = {
  id: 'aws',
  name: 'AWS Cost Explorer',
  category: 'Cloud',
  iconKey: 'aws',
  description: 'Pull cloud spend by region + service from AWS Cost Explorer for Scope 3 cloud carbon (CCF methodology).',
  authType: 'api_key',
  apiKeyFields: [
    { label: 'Access Key ID', key: 'accessKey', secret: false, placeholder: 'AKIA…' },
    { label: 'Secret Access Key', key: 'secretKey', secret: true },
    { label: 'Default region', key: 'region', secret: false, placeholder: 'us-east-1' },
  ],
  fieldMappings: [
    { source: 'TimePeriod.Start', target: 'period_year + period_month' },
    { source: 'Groups[].Keys[REGION]', target: 'facility_code', notes: 'AWS region as a synthetic facility' },
    { source: 'Groups[].Keys[SERVICE]', target: 'subcategory' },
    { source: 'Groups[].Metrics.UnblendedCost.Amount', target: 'activity_value', notes: 'USD spend' },
  ],
  docsUrl: 'https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsage.html',

  async testConnection(connection: ConnectorConnection): Promise<TestResult> {
    const c = connection.credentials
    const accessKey = String(c.accessKey ?? '')
    const secretKey = String(c.secretKey ?? '')
    const region = String(c.region ?? 'us-east-1')
    if (!accessKey || !secretKey) return { ok: false, message: 'AWS access key/secret missing' }
    try {
      const today = new Date().toISOString().slice(0, 10)
      const start = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
      const body = JSON.stringify({
        TimePeriod: { Start: start, End: today },
        Granularity: 'DAILY',
        Metrics: ['UnblendedCost'],
      })
      const host = `ce.${region}.amazonaws.com`
      const headers = signV4({
        accessKey, secretKey, region, service: 'ce',
        method: 'POST', host, path: '/', body,
        amzTarget: 'AWSInsightsIndexService.GetCostAndUsage',
      })
      const res = await connectorFetch(`https://${host}/`, { method: 'POST', headers, body })
      if (!res.ok) return { ok: false, message: `AWS CE HTTP ${res.status}` }
      return { ok: true, message: 'Authenticated to AWS Cost Explorer' }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Connection failed' }
    }
  },

  async fetchData(_sql, connection: ConnectorConnection, opts: SyncOptions) {
    const c = connection.credentials
    const accessKey = String(c.accessKey ?? '')
    const secretKey = String(c.secretKey ?? '')
    const region = String(c.region ?? 'us-east-1')
    if (!accessKey || !secretKey) throw new Error('AWS credentials missing')
    const start = opts.fromDate ?? new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10)
    const end = opts.toDate ?? new Date().toISOString().slice(0, 10)
    const body = JSON.stringify({
      TimePeriod: { Start: start, End: end },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost'],
      GroupBy: [{ Type: 'DIMENSION', Key: 'REGION' }, { Type: 'DIMENSION', Key: 'SERVICE' }],
    })
    const host = `ce.${region}.amazonaws.com`
    const headers = signV4({
      accessKey, secretKey, region, service: 'ce',
      method: 'POST', host, path: '/', body,
      amzTarget: 'AWSInsightsIndexService.GetCostAndUsage',
    })
    const res = await connectorFetch(`https://${host}/`, { method: 'POST', headers, body })
    if (!res.ok) throw new Error(`AWS Cost Explorer HTTP ${res.status}`)
    const payload = await res.json() as CeResponse
    const periods = payload.ResultsByTime ?? []
    const rows: SyncRow[] = []
    const errors: SyncResult['errors'] = []
    let fetched = 0
    periods.forEach(p => {
      const startDate = p.TimePeriod?.Start ?? ''
      const year = parseInt(startDate.slice(0, 4), 10)
      const month = parseInt(startDate.slice(5, 7), 10)
      ;(p.Groups ?? []).forEach((g, i) => {
        fetched++
        try {
          const [reg, svc] = g.Keys ?? []
          const amt = parseFloat(g.Metrics?.UnblendedCost?.Amount ?? 'NaN')
          if (!Number.isFinite(amt)) throw new Error('Invalid amount')
          rows.push({
            rowId: `${startDate}-${reg}-${svc}-${i}`,
            periodYear: year,
            periodMonth: Number.isFinite(month) ? month : null,
            scope: 3,
            category: 'Cat 1 — Purchased goods & services (Cloud)',
            subcategory: svc ?? null,
            fuelType: null,
            facilityCode: reg ?? null,
            activityValue: amt,
            activityUnit: 'USD',
          })
        } catch (e) {
          errors.push({ row: `${startDate}-${i}`, error: e instanceof Error ? e.message : 'parse' })
        }
      })
    })
    return { rows, result: { rowsFetched: fetched, rowsImported: 0, rowsFailed: errors.length, errors } }
  },
}
