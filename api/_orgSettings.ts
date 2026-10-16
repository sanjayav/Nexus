/**
 * Org market settings (`org_settings`, created by api/_cnSchema.ts) and the
 * DB-aware half of locale resolution.
 *
 * An org without a row gets ORG_SETTINGS_DEFAULTS, which reproduce the
 * pre-Phase-4 behaviour exactly (market 'global', AI on, provider chosen
 * automatically → Anthropic). Nothing here writes rows implicitly.
 *
 * Every reader swallows "relation does not exist" style errors and falls back
 * to defaults so endpoints keep working before /api/setup has run the new
 * schema.
 */
import { z } from 'zod'
import type { VercelRequest } from '@vercel/node'
import type { Sql } from './_db.js'
import { resolveLocale, type Locale, type Market } from './_i18n.js'

export const MARKETS = ['global', 'cn'] as const
export const RESIDENCY_REGIONS = ['us', 'eu', 'apac', 'cn'] as const
/**
 * PIPL cross-border transfer posture. 'exempt' covers the exemptions in the
 * 2024 CAC Provisions on Promoting and Regulating Cross-Border Data Flows;
 * the other three are the PIPL art. 38 mechanisms.
 */
export const CROSS_BORDER_STATUSES = [
  'not_assessed',
  'no_transfer',
  'exempt',
  'standard_contract',
  'certification',
  'security_assessment',
] as const
export const AI_PROVIDERS = ['anthropic', 'openai_compatible'] as const
export const LISTING_VENUES = ['SSE', 'SZSE', 'BSE', 'HKEX', 'OTHER'] as const

export type AiProviderId = (typeof AI_PROVIDERS)[number]

export interface OrgSettings {
  org_id: string
  market: Market
  data_residency_region: (typeof RESIDENCY_REGIONS)[number] | null
  icp_number: string | null
  mlps_level: number | null
  cross_border_status: (typeof CROSS_BORDER_STATUSES)[number] | null
  ai_enabled: boolean
  /** null = automatic (market 'cn' → openai_compatible, else anthropic). */
  ai_provider: AiProviderId | null
  timezone: string | null
  currency: string | null
  /** 'MM-DD'; null = 12-31. */
  fiscal_year_end: string | null
  listing_venues: string[] | null
  updated_at: string | null
  updated_by: string | null
}

export function defaultOrgSettings(orgId: string): OrgSettings {
  return {
    org_id: orgId,
    market: 'global',
    data_residency_region: null,
    icp_number: null,
    mlps_level: null,
    cross_border_status: null,
    ai_enabled: true,
    ai_provider: null,
    timezone: null,
    currency: null,
    fiscal_year_end: null,
    listing_venues: null,
    updated_at: null,
    updated_by: null,
  }
}

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/**
 * ICP filing (备案) or licence (经营许可证) number, e.g. 京ICP备12345678号-1 or
 * 沪ICP证123456号. One-character province abbreviation.
 */
export const ICP_PATTERN = /^[一-龥]ICP[备证]\d{4,12}号(-\d{1,3})?$/

export const orgSettingsPatchSchema = z
  .object({
    market: z.enum(MARKETS),
    data_residency_region: z.enum(RESIDENCY_REGIONS).nullable(),
    icp_number: z.string().trim().max(64).regex(ICP_PATTERN, 'icp_number must look like 京ICP备12345678号-1').nullable(),
    mlps_level: z.number().int().min(1).max(5).nullable(),
    cross_border_status: z.enum(CROSS_BORDER_STATUSES).nullable(),
    ai_enabled: z.boolean(),
    ai_provider: z.enum(AI_PROVIDERS).nullable(),
    timezone: z.string().max(64).refine(isValidTimeZone, 'timezone must be an IANA zone such as Asia/Shanghai').nullable(),
    currency: z.string().regex(/^[A-Z]{3}$/, 'currency must be an ISO 4217 code').nullable(),
    fiscal_year_end: z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'fiscal_year_end must be MM-DD').nullable(),
    listing_venues: z.array(z.enum(LISTING_VENUES)).max(LISTING_VENUES.length).nullable(),
  })
  .partial()
  .strict()

export type OrgSettingsPatch = z.infer<typeof orgSettingsPatchSchema>

/** Derived values the UI and server use; never stored. */
export function effectiveSettings(s: OrgSettings) {
  return {
    default_locale: (s.market === 'cn' ? 'zh' : 'en') as Locale,
    timezone: s.timezone ?? (s.market === 'cn' ? 'Asia/Shanghai' : 'UTC'),
    currency: s.currency ?? (s.market === 'cn' ? 'CNY' : null),
    fiscal_year_end: s.fiscal_year_end ?? '12-31',
    ai_provider: (s.ai_provider ?? (s.market === 'cn' ? 'openai_compatible' : 'anthropic')) as AiProviderId,
  }
}

type Row = Omit<OrgSettings, 'updated_at'> & { updated_at: string | Date | null; mlps_level: number | string | null }

function fromRow(orgId: string, r: Row | undefined): OrgSettings {
  if (!r) return defaultOrgSettings(orgId)
  const d = defaultOrgSettings(orgId)
  return {
    ...d,
    market: r.market === 'cn' ? 'cn' : 'global',
    data_residency_region: (r.data_residency_region ?? null) as OrgSettings['data_residency_region'],
    icp_number: r.icp_number ?? null,
    mlps_level: r.mlps_level == null ? null : Number(r.mlps_level),
    cross_border_status: (r.cross_border_status ?? null) as OrgSettings['cross_border_status'],
    ai_enabled: r.ai_enabled !== false,
    ai_provider: (AI_PROVIDERS as readonly string[]).includes(String(r.ai_provider)) ? (r.ai_provider as AiProviderId) : null,
    timezone: r.timezone ?? null,
    currency: r.currency ?? null,
    fiscal_year_end: r.fiscal_year_end ?? null,
    listing_venues: Array.isArray(r.listing_venues) ? r.listing_venues : null,
    updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : (r.updated_at ?? null),
    updated_by: r.updated_by ?? null,
  }
}

/** Load settings; returns defaults (stored=false) when no row or no table. */
export async function loadOrgSettings(sql: Sql, orgId: string): Promise<OrgSettings & { stored: boolean }> {
  try {
    const rows = (await sql`
      SELECT org_id, market, data_residency_region, icp_number, mlps_level,
             cross_border_status, ai_enabled, ai_provider, timezone, currency,
             fiscal_year_end, listing_venues, updated_at, updated_by
      FROM org_settings WHERE org_id = ${orgId} LIMIT 1
    `) as Row[]
    return { ...fromRow(orgId, rows[0]), stored: rows.length > 0 }
  } catch {
    return { ...defaultOrgSettings(orgId), stored: false }
  }
}

/** Merge a validated patch onto current settings and upsert. Returns the new row. */
export async function saveOrgSettings(
  sql: Sql,
  orgId: string,
  patch: OrgSettingsPatch,
  actor: string | null,
): Promise<{ before: OrgSettings & { stored: boolean }; after: OrgSettings }> {
  const before = await loadOrgSettings(sql, orgId)
  const next: OrgSettings = { ...before, ...patch, org_id: orgId }
  const rows = (await sql`
    INSERT INTO org_settings
      (org_id, market, data_residency_region, icp_number, mlps_level, cross_border_status,
       ai_enabled, ai_provider, timezone, currency, fiscal_year_end, listing_venues,
       updated_at, updated_by)
    VALUES
      (${orgId}, ${next.market}, ${next.data_residency_region}, ${next.icp_number}, ${next.mlps_level},
       ${next.cross_border_status}, ${next.ai_enabled}, ${next.ai_provider}, ${next.timezone},
       ${next.currency}, ${next.fiscal_year_end}, ${next.listing_venues}, now(), ${actor})
    ON CONFLICT (org_id) DO UPDATE SET
      market = EXCLUDED.market,
      data_residency_region = EXCLUDED.data_residency_region,
      icp_number = EXCLUDED.icp_number,
      mlps_level = EXCLUDED.mlps_level,
      cross_border_status = EXCLUDED.cross_border_status,
      ai_enabled = EXCLUDED.ai_enabled,
      ai_provider = EXCLUDED.ai_provider,
      timezone = EXCLUDED.timezone,
      currency = EXCLUDED.currency,
      fiscal_year_end = EXCLUDED.fiscal_year_end,
      listing_venues = EXCLUDED.listing_venues,
      updated_at = now(),
      updated_by = EXCLUDED.updated_by
    RETURNING org_id, market, data_residency_region, icp_number, mlps_level,
              cross_border_status, ai_enabled, ai_provider, timezone, currency,
              fiscal_year_end, listing_venues, updated_at, updated_by
  `) as Row[]
  return { before, after: fromRow(orgId, rows[0]) }
}

/** Field-level diff for the audit log (only keys that changed). */
export function diffSettings(before: OrgSettings, after: OrgSettings): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {}
  const keys: Array<keyof OrgSettings> = [
    'market', 'data_residency_region', 'icp_number', 'mlps_level', 'cross_border_status',
    'ai_enabled', 'ai_provider', 'timezone', 'currency', 'fiscal_year_end', 'listing_venues',
  ]
  for (const k of keys) {
    if (JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null)) {
      out[k] = { from: before[k] ?? null, to: after[k] ?? null }
    }
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────
// Locale resolution against the DB
// ─────────────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** users.locale for a user id (null for API-key actors, unknown users or pre-migration DBs). */
export async function loadUserLocale(sql: Sql, userId: string | null | undefined): Promise<string | null> {
  if (!userId || !UUID_RE.test(userId)) return null
  try {
    const rows = (await sql`
      SELECT to_jsonb(u) ->> 'locale' AS locale FROM users u WHERE u.id = ${userId} LIMIT 1
    `) as Array<{ locale: string | null }>
    return rows[0]?.locale ?? null
  } catch {
    return null
  }
}

/**
 * Locale for the caller of an HTTP request:
 * user.locale → Accept-Language → org market default (zh for cn) → en.
 * Pass `settings` when already loaded to save a query.
 */
export async function resolveRequestLocale(
  sql: Sql,
  req: Pick<VercelRequest, 'headers'>,
  token: { sub: string; org: string },
  settings?: Pick<OrgSettings, 'market'>,
): Promise<Locale> {
  const [userLocale, s] = await Promise.all([
    loadUserLocale(sql, token.sub),
    settings ? Promise.resolve(settings) : loadOrgSettings(sql, token.org),
  ])
  return resolveLocale({
    userLocale,
    acceptLanguage: req.headers['accept-language'],
    market: s.market,
  })
}

/**
 * Locale for a notification recipient (no request header available):
 * user.locale (by id, else by email) → org market default → en.
 */
export async function resolveRecipientLocale(
  sql: Sql,
  args: { orgId: string; userId?: string | null; email?: string | null },
): Promise<Locale> {
  let userLocale: string | null = null
  try {
    const uid = args.userId && UUID_RE.test(args.userId) ? args.userId : null
    const email = args.email ? args.email.toLowerCase().trim() : null
    if (uid || email) {
      const rows = (await sql`
        SELECT to_jsonb(u) ->> 'locale' AS locale
        FROM users u
        WHERE (${uid}::uuid IS NOT NULL AND u.id = ${uid}::uuid)
           OR (${email}::text IS NOT NULL AND ${email}::text <> '' AND lower(u.email) = ${email}::text)
        ORDER BY (u.id = ${uid}::uuid) DESC NULLS LAST
        LIMIT 1
      `) as Array<{ locale: string | null }>
      userLocale = rows[0]?.locale ?? null
    }
  } catch {
    userLocale = null
  }
  const s = await loadOrgSettings(sql, args.orgId)
  return resolveLocale({ userLocale, market: s.market })
}
