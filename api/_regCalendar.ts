/**
 * Regulatory calendar engine — pure (no DB). Used by /api/regulatory-calendar.
 *
 * Deadlines are derived from rules, never hard-coded dates:
 *   - 'after_fy_fixed'   fixed month/day in the year after the FY-end year
 *                        (CN exchanges: 30 April; MEE disclosure: 15 March)
 *   - 'fy_plus_months'   N months after the FY end (HKEX Main Board 4, CSRD 4)
 *   - 'notice'           set each year by the regulator / programme — no date
 *                        is invented; `due_note` says how it is determined
 *   - 'with_statements'  same time as the financial statements / annual report
 *
 * Text comes from api/_i18n.ts (`calendar.*`) in the caller's locale.
 */
import { t, type Locale } from './_i18n.js'

export type CalendarRegion = 'CN' | 'HK' | 'EU' | 'GLOBAL'

type DueRule =
  | { type: 'after_fy_fixed'; month: number; day: number }
  | { type: 'fy_plus_months'; months: number }
  | { type: 'notice' }
  | { type: 'with_statements' }

export interface CalendarRule {
  id: string
  region: CalendarRegion
  /** Framework id from src/lib/frameworks.ts used to highlight the item. */
  framework_id: string | null
  /** Highlight when any enabled framework id starts with one of these. */
  framework_prefixes?: string[]
  /** Highlight when the org lists on one of these venues (org_settings.listing_venues). */
  listing_venues?: string[]
  kind: 'mandatory' | 'voluntary'
  /** i18n key prefix: `<key>.title`, `<key>.detail`, optional `<key>.note`. */
  key: string
  due: DueRule
  source_url?: string
}

export const CALENDAR_RULES: CalendarRule[] = [
  {
    id: 'cn-exchange-sustainability-report',
    region: 'CN',
    framework_id: 'cn-sse',
    listing_venues: ['SSE', 'SZSE', 'BSE'],
    kind: 'mandatory',
    key: 'calendar.cn_exchange_report',
    due: { type: 'after_fy_fixed', month: 4, day: 30 },
  },
  {
    id: 'cn-env-information-disclosure',
    region: 'CN',
    framework_id: null,
    kind: 'mandatory',
    key: 'calendar.cn_env_disclosure',
    due: { type: 'after_fy_fixed', month: 3, day: 15 },
    source_url: 'https://www.mee.gov.cn/gzk/gz/202112/t20211210_963770.shtml',
  },
  {
    id: 'cn-national-carbon-market',
    region: 'CN',
    framework_id: null,
    kind: 'mandatory',
    key: 'calendar.cn_ets',
    due: { type: 'notice' },
  },
  {
    id: 'cn-csds-climate',
    region: 'CN',
    framework_id: 'cn-csds',
    kind: 'voluntary',
    key: 'calendar.cn_csds',
    due: { type: 'notice' },
  },
  {
    id: 'hkex-esg-report',
    region: 'HK',
    framework_id: 'hkex-esg',
    listing_venues: ['HKEX'],
    kind: 'mandatory',
    key: 'calendar.hkex_esg',
    due: { type: 'fy_plus_months', months: 4 },
  },
  {
    id: 'csrd-sustainability-statement',
    region: 'EU',
    framework_id: 'csrd-e1',
    framework_prefixes: ['csrd-'],
    kind: 'mandatory',
    key: 'calendar.csrd',
    due: { type: 'fy_plus_months', months: 4 },
  },
  {
    id: 'issb-s1-s2',
    region: 'GLOBAL',
    framework_id: 'issb-s2',
    framework_prefixes: ['issb-'],
    kind: 'voluntary',
    key: 'calendar.issb',
    due: { type: 'with_statements' },
  },
  {
    id: 'cdp-disclosure-cycle',
    region: 'GLOBAL',
    framework_id: 'cdp-2024',
    framework_prefixes: ['cdp'],
    kind: 'voluntary',
    key: 'calendar.cdp',
    due: { type: 'notice' },
  },
  {
    id: 'tcfd-annual-report',
    region: 'GLOBAL',
    framework_id: 'tcfd',
    kind: 'voluntary',
    key: 'calendar.tcfd',
    due: { type: 'with_statements' },
  },
]

export interface CalendarItem {
  id: string
  region: CalendarRegion
  framework_id: string | null
  kind: 'mandatory' | 'voluntary'
  fiscal_year: number
  title: string
  detail: string
  due_date: string | null
  due_note: string | null
  days_until: number | null
  status: 'upcoming' | 'due_soon' | 'overdue' | 'no_fixed_date'
  /** True when one of the org's enabled frameworks / listing venues matches. */
  highlighted: boolean
  source_url: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

function iso(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** FY end date for fiscal year `fy` given 'MM-DD'. FY is labelled by the calendar year it ends in. */
export function fyEndDate(fy: number, fiscalYearEnd: string): { y: number; m: number; d: number } {
  const [mm, dd] = fiscalYearEnd.split('-').map(Number)
  const m = mm >= 1 && mm <= 12 ? mm : 12
  const d = Math.min(dd >= 1 ? dd : 31, lastDayOfMonth(fy, m))
  return { y: fy, m, d }
}

/** Deadline for a dated rule, or null. */
export function dueDateFor(rule: CalendarRule, fy: number, fiscalYearEnd: string): string | null {
  const end = fyEndDate(fy, fiscalYearEnd)
  if (rule.due.type === 'after_fy_fixed') return iso(end.y + 1, rule.due.month, rule.due.day)
  if (rule.due.type === 'fy_plus_months') {
    // Month-end-to-month-end: 31 Dec + 4 months = 30 Apr; 30 Jun + 4 = 31 Oct.
    const total = end.m - 1 + rule.due.months
    const y = end.y + Math.floor(total / 12)
    const m = (total % 12) + 1
    const endIsMonthEnd = end.d === lastDayOfMonth(end.y, end.m)
    const d = endIsMonthEnd ? lastDayOfMonth(y, m) : Math.min(end.d, lastDayOfMonth(y, m))
    return iso(y, m, d)
  }
  return null
}

/** Whole days from `today` (YYYY-MM-DD) to `date`; negative when past. */
export function daysBetween(today: string, date: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS)
}

/** Today's date (YYYY-MM-DD) in an IANA zone. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  } catch {
    return now.toISOString().slice(0, 10)
  }
}

export interface BuildCalendarInput {
  locale: Locale
  today: string
  fiscalYearEnd: string
  enabledFrameworks: string[]
  listingVenues?: string[] | null
  regions?: CalendarRegion[] | null
  /** Force a fiscal year; otherwise the FY whose deadline is next (or most recently due within 30 days). */
  fiscalYear?: number | null
  dueSoonDays?: number
}

function isHighlighted(rule: CalendarRule, enabled: Set<string>, venues: Set<string>): boolean {
  if (rule.framework_id && enabled.has(rule.framework_id)) return true
  if (rule.framework_prefixes?.some(p => [...enabled].some(id => id.startsWith(p)))) return true
  if (rule.listing_venues?.some(v => venues.has(v))) return true
  return false
}

export function buildCalendar(input: BuildCalendarInput): CalendarItem[] {
  const enabled = new Set(input.enabledFrameworks)
  const venues = new Set(input.listingVenues ?? [])
  const dueSoon = input.dueSoonDays ?? 30
  const todayYear = Number(input.today.slice(0, 4))
  const regions = input.regions && input.regions.length > 0 ? new Set(input.regions) : null

  const items: CalendarItem[] = []
  for (const rule of CALENDAR_RULES) {
    if (regions && !regions.has(rule.region)) continue

    // Pick the fiscal year: the earliest FY whose deadline is not more than
    // 30 days past (so a just-missed filing still shows as overdue).
    let fy = input.fiscalYear ?? null
    if (fy == null) {
      fy = todayYear - 1
      const dated = rule.due.type === 'after_fy_fixed' || rule.due.type === 'fy_plus_months'
      if (dated) {
        for (let candidate = todayYear - 2; candidate <= todayYear + 1; candidate++) {
          const d = dueDateFor(rule, candidate, input.fiscalYearEnd)!
          if (daysBetween(input.today, d) >= -30) { fy = candidate; break }
        }
      } else {
        // Undated items refer to the most recently ended FY.
        const end = fyEndDate(todayYear, input.fiscalYearEnd)
        fy = input.today >= iso(end.y, end.m, end.d) ? todayYear : todayYear - 1
      }
    }

    const due = dueDateFor(rule, fy, input.fiscalYearEnd)
    const days = due ? daysBetween(input.today, due) : null
    const params = { fy, due_year: fy + 1 }
    const noteKey = `${rule.key}.note`
    const note = t(input.locale, noteKey, params)
    items.push({
      id: `${rule.id}-fy${fy}`,
      region: rule.region,
      framework_id: rule.framework_id,
      kind: rule.kind,
      fiscal_year: fy,
      title: t(input.locale, `${rule.key}.title`, params),
      detail: t(input.locale, `${rule.key}.detail`, params),
      due_date: due,
      due_note: note === noteKey ? null : note,
      days_until: days,
      status: days == null ? 'no_fixed_date' : days < 0 ? 'overdue' : days <= dueSoon ? 'due_soon' : 'upcoming',
      highlighted: isHighlighted(rule, enabled, venues),
      source_url: rule.source_url ?? null,
    })
  }

  // Highlighted first, then dated (soonest first), then undated.
  return items.sort((a, b) => {
    if (a.highlighted !== b.highlighted) return a.highlighted ? -1 : 1
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
    if (a.due_date) return -1
    if (b.due_date) return 1
    return 0
  })
}
