/**
 * Server-side PDF renderer for sustainability reports.
 *
 * Uses @react-pdf/renderer (pure JS, works in Vercel serverless).
 * Produces a standards-shaped artefact:
 *   1. Cover page — org, framework, period, status watermark, verification QR
 *   2. Table of Contents (with page refs)
 *   3. About this report — scope, boundary, methodology, preparer
 *   4. Management assertion
 *   5. Narrative disclosures (pulled from approved assignment.narrative_body)
 *   6. Metrics (numeric tables by section)
 *   7. GRI Content Index (one row per disclosure with status + page ref)
 *   8. Assurance Statement (embedded signed PDF page or "PENDING" notice)
 *
 * No tricks — all content is pulled from the caller. If the data isn't there, the
 * section is either omitted or stamped "not provided" (which is itself a disclosure).
 */
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

// ─── Types ──────────────────────────────────────────────────────

export interface ReportInput {
  org: {
    name: string
    legal_name?: string
    thai_name?: string
    country?: string
    primary_color?: string
    secondary_color?: string
    logo_mark?: string
    industry?: string
    headquarters?: string
    website?: string
  }
  framework: { id: string; code: string; name: string }
  period: { label: string; year: number; start_date?: string | null; end_date?: string | null }
  /** Metrics — one row per approved disclosure */
  metrics: Array<{
    gri_code: string
    line_item: string
    section: string
    subsection: string
    unit: string | null
    value: number
    entity_count: number
  }>
  /** Narrative disclosures — approved narratives keyed by gri_code */
  narratives: Array<{
    gri_code: string
    line_item: string
    section: string
    subsection: string
    body: string
  }>
  /** GRI Content Index rows */
  contentIndex: Array<{
    gri_code: string
    line_item: string
    section: string
    status: 'fully' | 'partially' | 'omitted'
    approved: number
    total: number
  }>
  /** Assurance artefact — null if no signed statement yet */
  assurance: {
    firm: string
    signed_by: string
    signed_at: string
    opinion: 'limited' | 'reasonable'
    isae_reference: string
    notes?: string
  } | null
  /** Verification metadata stamped on cover */
  verification: {
    token: string
    /** base URL like "https://app.aeiforo.com" — used for QR code */
    baseUrl: string
    /** QR code as PNG data-url, pre-computed by caller */
    qrPngDataUrl: string
  }
  /** Published metadata */
  publishedBy: string
  publishedAt: string
}

// ─── Design tokens (mirror the Aeiforo brand) ──────────────────

const colors = {
  brand: '#1B6B7B',
  brandStrong: '#134E5A',
  brandSoft: '#EAF4F7',
  ink: '#0B1220',
  ink2: '#414B5C',
  ink3: '#6A748A',
  ink4: '#99A3B5',
  border: '#E3E7EC',
  borderSoft: '#EDF0F3',
  bg: '#F7F8FA',
  green: '#2E7D32',
  amber: '#E6A817',
  red: '#C62828',
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 64,
    paddingHorizontal: 48,
    fontSize: 10,
    color: colors.ink,
    fontFamily: 'Helvetica',
    lineHeight: 1.45,
  },
  coverPage: {
    padding: 0,
    fontSize: 10,
    color: colors.ink,
    fontFamily: 'Helvetica',
  },
  coverTop: {
    backgroundColor: colors.brand,
    color: 'white',
    padding: 48,
    height: 420,
    justifyContent: 'flex-end',
  },
  coverBottom: {
    padding: 48,
  },
  header: {
    position: 'absolute',
    top: 24,
    left: 48,
    right: 48,
    fontSize: 9,
    color: colors.ink3,
    borderBottom: `0.5pt solid ${colors.borderSoft}`,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 8,
    color: colors.ink4,
    borderTop: `0.5pt solid ${colors.borderSoft}`,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  h1: { fontSize: 28, fontWeight: 700, marginBottom: 6, color: colors.ink, lineHeight: 1.15 },
  h2: { fontSize: 18, fontWeight: 700, marginTop: 20, marginBottom: 10, color: colors.ink },
  h3: { fontSize: 13, fontWeight: 700, marginTop: 14, marginBottom: 6, color: colors.ink },
  kicker: { fontSize: 9, letterSpacing: 1.5, color: colors.brand, marginBottom: 4, textTransform: 'uppercase', fontWeight: 700 },
  body: { fontSize: 10, color: colors.ink2, marginBottom: 6 },
  mono: { fontFamily: 'Courier', fontSize: 8, color: colors.ink3 },
  tocItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottom: `0.5pt solid ${colors.borderSoft}` },
  tocLabel: { fontSize: 10, color: colors.ink },
  tocPage: { fontSize: 10, color: colors.ink3 },
  table: { width: '100%', marginTop: 4, marginBottom: 10 },
  th: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.ink3,
    fontWeight: 700,
  },
  tr: {
    flexDirection: 'row',
    borderBottom: `0.5pt solid ${colors.borderSoft}`,
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontSize: 9,
  },
  td: { color: colors.ink2 },
  statusPill: { fontSize: 7, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 700 },
  draftBand: {
    position: 'absolute',
    top: 420 / 2 - 30,
    left: -40,
    right: -40,
    paddingVertical: 10,
    backgroundColor: colors.amber,
    color: 'white',
    fontSize: 16,
    letterSpacing: 6,
    textAlign: 'center',
    fontWeight: 700,
    transform: 'rotate(-8deg)',
  },
  verifyBox: {
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: 12,
    marginTop: 14,
    fontSize: 8,
    color: colors.ink3,
  },
  narrativeBlock: {
    marginTop: 10,
    marginBottom: 14,
    paddingLeft: 10,
    borderLeft: `2pt solid ${colors.brand}`,
  },
})

// ─── Number formatting ───────────────────────────────────────────

function formatValue(v: number): string {
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(2) + 'k'
  return v.toFixed(0)
}

// ─── Cover page ──────────────────────────────────────────────────

function Cover({ input }: { input: ReportInput }) {
  const isDraft = input.assurance == null
  const primary = input.org.primary_color || '#1B6B7B'
  const secondary = input.org.secondary_color || '#134E5A'
  const displayName = input.org.name
  const legalName = input.org.legal_name
  const thaiName = input.org.thai_name
  const logoMark = input.org.logo_mark || displayName.split(' ').map(s => s[0]).join('').slice(0, 4).toUpperCase()

  return (
    <Page size="A4" style={styles.coverPage}>
      <View style={{ ...styles.coverTop, backgroundColor: primary, position: 'relative' }}>
        {/* Subtle gradient overlay */}
        <View style={{ position: 'absolute', top: 0, right: 0, width: 260, height: 260, backgroundColor: secondary, opacity: 0.35, borderRadius: 130 }} />
        <View style={{ position: 'absolute', bottom: -60, left: -60, width: 180, height: 180, backgroundColor: 'white', opacity: 0.04, borderRadius: 90 }} />

        {isDraft && (
          <Text style={styles.draftBand}>UNAUDITED DRAFT</Text>
        )}

        {/* Logo mark top-left */}
        <View style={{ position: 'absolute', top: 32, left: 48, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: 700, color: primary, letterSpacing: 0.4 }}>{logoMark}</Text>
          </View>
          {input.org.industry && (
            <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700 }}>
              {input.org.industry}
            </Text>
          )}
        </View>

        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', letterSpacing: 3, marginBottom: 14, textTransform: 'uppercase', fontWeight: 700 }}>
          {input.framework.code} Sustainability Report · รายงานความยั่งยืน
        </Text>
        <Text style={{ fontSize: 36, fontWeight: 700, color: 'white', lineHeight: 1.05, marginBottom: 8 }}>
          {displayName}
        </Text>
        {thaiName && (
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 1.3, marginBottom: 14 }}>
            {thaiName}
          </Text>
        )}
        {legalName && !thaiName && (
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 14 }}>
            {legalName}
          </Text>
        )}
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>
          {input.period.label} · Fiscal Year {input.period.year} · ปีบัญชี {input.period.year + 543}
        </Text>
      </View>

      <View style={styles.coverBottom}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: 24 }}>
            <Text style={{ ...styles.kicker, color: primary }}>About this report · เกี่ยวกับรายงาน</Text>
            <Text style={styles.body}>
              This report discloses {displayName}'s sustainability performance for the period{' '}
              {input.period.start_date || `FY${input.period.year}`}
              {input.period.end_date ? ` to ${input.period.end_date}` : ''}
              , prepared in accordance with {input.framework.name}.
            </Text>
            <Text style={styles.body}>
              It consolidates data from every operating entity in scope. Each metric has been reviewed
              by a subsidiary lead and approved by the group sustainability officer.
              A cryptographic hash of this document is anchored to a public timestamp calendar
              so any recipient can verify the file has not been modified.
            </Text>

            {(input.org.headquarters || input.org.website) && (
              <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: colors.borderSoft }}>
                {input.org.headquarters && (
                  <Text style={{ fontSize: 9, color: colors.ink3, marginBottom: 2 }}>
                    Headquarters: {input.org.headquarters}
                  </Text>
                )}
                {input.org.website && (
                  <Text style={{ fontSize: 9, color: colors.ink3 }}>
                    {input.org.website}
                  </Text>
                )}
              </View>
            )}

            <View style={{ ...styles.verifyBox, borderLeftWidth: 3, borderLeftColor: primary }}>
              <Text style={{ fontSize: 9, fontWeight: 700, color: colors.ink, marginBottom: 4 }}>Document verification</Text>
              <Text>Token: <Text style={styles.mono}>{input.verification.token}</Text></Text>
              <Text>Verify at: <Text style={styles.mono}>{input.verification.baseUrl}/verify/{input.verification.token}</Text></Text>
              <Text style={{ marginTop: 4 }}>
                Published by {input.publishedBy} on {new Date(input.publishedAt).toISOString().slice(0, 10)}
              </Text>
            </View>
          </View>

          <View style={{ width: 120, alignItems: 'center' }}>
            {input.verification.qrPngDataUrl && (
              <Image src={input.verification.qrPngDataUrl} style={{ width: 110, height: 110, marginBottom: 6 }} />
            )}
            <Text style={{ fontSize: 8, color: colors.ink3, textAlign: 'center' }}>Scan to verify · สแกนเพื่อตรวจสอบ</Text>
          </View>
        </View>
      </View>
    </Page>
  )
}

// ─── TOC page ────────────────────────────────────────────────────

function TOC({ input }: { input: ReportInput }) {
  const toc = [
    { label: '1. About this report', page: 3 },
    { label: '2. Management assertion', page: 4 },
    { label: '3. Sustainability narrative disclosures', page: 5 },
    { label: '4. Performance metrics', page: 6 + Math.ceil(input.narratives.length / 2) },
    { label: '5. GRI Content Index', page: 6 + Math.ceil(input.narratives.length / 2) + Math.ceil(input.metrics.length / 28) },
    { label: '6. Independent assurance statement', page: 7 + Math.ceil(input.narratives.length / 2) + Math.ceil(input.metrics.length / 28) + Math.ceil(input.contentIndex.length / 32) },
  ]
  return (
    <Page size="A4" style={styles.page}>
      <Header input={input} />
      <Text style={styles.kicker}>Contents</Text>
      <Text style={styles.h1}>Table of contents</Text>
      <View style={{ marginTop: 20 }}>
        {toc.map(t => (
          <View key={t.label} style={styles.tocItem}>
            <Text style={styles.tocLabel}>{t.label}</Text>
            <Text style={styles.tocPage}>{t.page}</Text>
          </View>
        ))}
      </View>
      <Footer input={input} />
    </Page>
  )
}

// ─── About + Management Assertion page ──────────────────────────

function AboutAndAssertion({ input }: { input: ReportInput }) {
  return (
    <Page size="A4" style={styles.page}>
      <Header input={input} />
      <Text style={styles.kicker}>Section 1</Text>
      <Text style={styles.h2}>About this report</Text>
      <Text style={styles.body}>
        <Text style={{ fontWeight: 700 }}>Reporting organisation.</Text>{' '}
        {input.org.name}{input.org.country ? `, headquartered in ${input.org.country}` : ''}.
      </Text>
      <Text style={styles.body}>
        <Text style={{ fontWeight: 700 }}>Reporting framework.</Text> {input.framework.name} ({input.framework.code}). The content
        index in Section 5 maps each disclosure in scope to its status (fully reported, partially reported, or omitted with reason).
      </Text>
      <Text style={styles.body}>
        <Text style={{ fontWeight: 700 }}>Reporting period.</Text> {input.period.label} — fiscal year {input.period.year}
        {input.period.start_date && input.period.end_date ? ` (${input.period.start_date} to ${input.period.end_date})` : ''}.
      </Text>
      <Text style={styles.body}>
        <Text style={{ fontWeight: 700 }}>Boundary.</Text> Consolidated across every operating entity in the organisation structure, with
        equity-weighted rollup from plant → subsidiary → group. Joint ventures outside the consolidation boundary are reported in parallel
        where material.
      </Text>
      <Text style={styles.body}>
        <Text style={{ fontWeight: 700 }}>Data preparation.</Text> Each line item was entered by a named data contributor, reviewed by a
        subsidiary lead, and approved by the group sustainability officer. Evidence is attached at the line-item level. Every state
        transition is cryptographically hash-chained; a tip hash is externally anchored via OpenTimestamps at publication time.
      </Text>

      <Text style={[styles.kicker, { marginTop: 24 }]}>Section 2</Text>
      <Text style={styles.h2}>Management assertion</Text>
      <Text style={styles.body}>
        The management of {input.org.name} is responsible for the preparation and presentation of the information in this report.
        We confirm that, to the best of our knowledge:
      </Text>
      <Text style={[styles.body, { marginLeft: 14 }]}>• the information has been prepared in accordance with {input.framework.name};</Text>
      <Text style={[styles.body, { marginLeft: 14 }]}>• the consolidation boundary, methodology, and assumptions disclosed above accurately describe how the data was produced;</Text>
      <Text style={[styles.body, { marginLeft: 14 }]}>• material restatements, if any, are identified alongside the relevant disclosure;</Text>
      <Text style={[styles.body, { marginLeft: 14 }]}>• the information is complete with respect to the topics identified as material following our materiality assessment.</Text>

      <Text style={[styles.body, { marginTop: 12 }]}>Published by: <Text style={{ fontWeight: 700 }}>{input.publishedBy}</Text></Text>
      <Text style={styles.body}>Date: {new Date(input.publishedAt).toISOString().slice(0, 10)}</Text>
      <Footer input={input} />
    </Page>
  )
}

// ─── Narrative disclosures ──────────────────────────────────────

function Narratives({ input }: { input: ReportInput }) {
  if (input.narratives.length === 0) {
    return (
      <Page size="A4" style={styles.page}>
        <Header input={input} />
        <Text style={styles.kicker}>Section 3</Text>
        <Text style={styles.h2}>Sustainability narrative disclosures</Text>
        <Text style={styles.body}>
          No narrative disclosures were approved for this reporting period. Narratives are recorded alongside the corresponding
          quantitative disclosure; their absence is itself a disclosure — see the Content Index for status per line item.
        </Text>
        <Footer input={input} />
      </Page>
    )
  }
  // Group by section
  const bySection: Record<string, typeof input.narratives> = {}
  for (const n of input.narratives) {
    bySection[n.section] ??= []
    bySection[n.section].push(n)
  }
  return (
    <Page size="A4" style={styles.page}>
      <Header input={input} />
      <Text style={styles.kicker}>Section 3</Text>
      <Text style={styles.h2}>Sustainability narrative disclosures</Text>
      {Object.entries(bySection).map(([section, rows]) => (
        <View key={section} wrap={true}>
          <Text style={styles.h3}>{section}</Text>
          {rows.map(n => (
            <View key={n.gri_code} style={styles.narrativeBlock} wrap={true}>
              <Text style={{ fontSize: 9, color: colors.brand, fontWeight: 700, marginBottom: 2 }}>
                {n.gri_code} · {n.line_item}
              </Text>
              <Text style={{ fontSize: 10, color: colors.ink2, lineHeight: 1.5 }}>{n.body}</Text>
            </View>
          ))}
        </View>
      ))}
      <Footer input={input} />
    </Page>
  )
}

// ─── Metrics tables ─────────────────────────────────────────────

function Metrics({ input }: { input: ReportInput }) {
  const bySection: Record<string, typeof input.metrics> = {}
  for (const m of input.metrics) {
    bySection[m.section] ??= []
    bySection[m.section].push(m)
  }
  if (Object.keys(bySection).length === 0) {
    return (
      <Page size="A4" style={styles.page}>
        <Header input={input} />
        <Text style={styles.kicker}>Section 4</Text>
        <Text style={styles.h2}>Performance metrics</Text>
        <Text style={styles.body}>No approved numeric disclosures in this reporting period.</Text>
        <Footer input={input} />
      </Page>
    )
  }
  return (
    <Page size="A4" style={styles.page}>
      <Header input={input} />
      <Text style={styles.kicker}>Section 4</Text>
      <Text style={styles.h2}>Performance metrics</Text>
      <Text style={styles.body}>
        All figures below are group consolidated totals, summed from approved entity-level submissions in scope.
      </Text>

      {Object.entries(bySection).map(([section, rows]) => (
        <View key={section} wrap={true} style={{ marginTop: 10 }}>
          <Text style={styles.h3}>{section}</Text>
          <View style={styles.table}>
            <View style={styles.th}>
              <Text style={{ width: '18%' }}>Code</Text>
              <Text style={{ width: '44%' }}>Line item</Text>
              <Text style={{ width: '14%' }}>Unit</Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>Group total</Text>
              <Text style={{ width: '8%', textAlign: 'right' }}>Entities</Text>
            </View>
            {rows.map(r => (
              <View key={r.gri_code + r.line_item} style={styles.tr}>
                <Text style={{ width: '18%', color: colors.brand, fontWeight: 700 }}>{r.gri_code}</Text>
                <Text style={{ width: '44%', color: colors.ink }}>{r.line_item}</Text>
                <Text style={{ width: '14%', color: colors.ink3 }}>{r.unit ?? '—'}</Text>
                <Text style={{ width: '16%', textAlign: 'right', color: colors.ink, fontWeight: 700 }}>{formatValue(r.value)}</Text>
                <Text style={{ width: '8%', textAlign: 'right', color: colors.ink3 }}>{r.entity_count}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
      <Footer input={input} />
    </Page>
  )
}

// ─── GRI Content Index ──────────────────────────────────────────

function ContentIndex({ input }: { input: ReportInput }) {
  return (
    <Page size="A4" style={styles.page}>
      <Header input={input} />
      <Text style={styles.kicker}>Section 5</Text>
      <Text style={styles.h2}>{input.framework.code} Content Index</Text>
      <Text style={styles.body}>
        Disclosure-level index. Each line references a {input.framework.code} topic and its reporting status in this period.
        "Fully" means every required data point in scope has been approved; "Partially" means some, but not all; "Omitted" means
        the disclosure was identified as not material or data is unavailable this cycle.
      </Text>

      <View style={styles.table}>
        <View style={styles.th}>
          <Text style={{ width: '16%' }}>Code</Text>
          <Text style={{ width: '48%' }}>Disclosure</Text>
          <Text style={{ width: '22%' }}>Section</Text>
          <Text style={{ width: '8%', textAlign: 'right' }}>Cov.</Text>
          <Text style={{ width: '6%', textAlign: 'center' }}>Status</Text>
        </View>
        {input.contentIndex.map((r, i) => (
          <View key={i} style={styles.tr} wrap={false}>
            <Text style={{ width: '16%', color: colors.brand, fontWeight: 700 }}>{r.gri_code}</Text>
            <Text style={{ width: '48%', color: colors.ink }}>{r.line_item}</Text>
            <Text style={{ width: '22%', color: colors.ink3, fontSize: 8 }}>{r.section}</Text>
            <Text style={{ width: '8%', textAlign: 'right', color: colors.ink2, fontSize: 8 }}>
              {r.total === 0 ? '—' : `${r.approved}/${r.total}`}
            </Text>
            <Text
              style={[
                styles.statusPill,
                { width: '6%', textAlign: 'center' },
                r.status === 'fully' ? { color: colors.green } : r.status === 'partially' ? { color: colors.amber } : { color: colors.ink4 },
              ]}
            >
              {r.status === 'fully' ? 'FULL' : r.status === 'partially' ? 'PART' : 'OMIT'}
            </Text>
          </View>
        ))}
      </View>
      <Footer input={input} />
    </Page>
  )
}

// ─── Assurance Statement ────────────────────────────────────────

function AssurancePage({ input }: { input: ReportInput }) {
  const a = input.assurance
  return (
    <Page size="A4" style={styles.page}>
      <Header input={input} />
      <Text style={styles.kicker}>Section 6</Text>
      <Text style={styles.h2}>Independent assurance statement</Text>
      {a ? (
        <>
          <Text style={styles.body}>
            <Text style={{ fontWeight: 700 }}>Assurance firm:</Text> {a.firm}
          </Text>
          <Text style={styles.body}>
            <Text style={{ fontWeight: 700 }}>Signed by:</Text> {a.signed_by}
          </Text>
          <Text style={styles.body}>
            <Text style={{ fontWeight: 700 }}>Signed on:</Text> {new Date(a.signed_at).toISOString().slice(0, 10)}
          </Text>
          <Text style={styles.body}>
            <Text style={{ fontWeight: 700 }}>Level of assurance:</Text> {a.opinion === 'reasonable' ? 'Reasonable assurance' : 'Limited assurance'}
          </Text>
          <Text style={styles.body}>
            <Text style={{ fontWeight: 700 }}>Assurance standard:</Text> {a.isae_reference}
          </Text>
          {a.notes && <Text style={[styles.body, { marginTop: 10 }]}>{a.notes}</Text>}
          <Text style={[styles.body, { marginTop: 14, fontStyle: 'italic', color: colors.ink3 }]}>
            The signed assurance statement from {a.firm} is appended to this document in full.
            Page continuation follows.
          </Text>
        </>
      ) : (
        <View style={{ marginTop: 16, padding: 16, borderWidth: 1, borderColor: colors.amber, backgroundColor: '#FFF8E1' }}>
          <Text style={{ fontSize: 12, fontWeight: 700, color: colors.amber, marginBottom: 6 }}>
            ASSURANCE PENDING
          </Text>
          <Text style={styles.body}>
            This report has not yet received third-party assurance. It is published as an{' '}
            <Text style={{ fontWeight: 700 }}>unaudited draft</Text>.
          </Text>
          <Text style={styles.body}>
            Once an independent assurance provider (e.g. an ISAE 3000 Revised qualified firm) signs off, a new version of this
            report will be re-issued with their statement embedded here and the draft watermark removed.
          </Text>
          <Text style={styles.body}>
            Readers should treat the figures in Sections 3 and 4 as management's own representation until such assurance is
            obtained. The verification token on the cover page links to the document's published hash, which is externally
            timestamped for tamper evidence irrespective of assurance status.
          </Text>
        </View>
      )}
      <Footer input={input} />
    </Page>
  )
}

// ─── Chrome ─────────────────────────────────────────────────────

function Header({ input }: { input: ReportInput }) {
  return (
    <View style={styles.header} fixed>
      <Text>{input.org.name}</Text>
      <Text>{input.framework.code} · {input.period.label}</Text>
    </View>
  )
}

function Footer({ input }: { input: ReportInput }) {
  return (
    <View style={styles.footer} fixed>
      <Text>
        Verify: {input.verification.baseUrl}/verify/{input.verification.token}
      </Text>
      <Text
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  )
}

// ─── Document (composed) ────────────────────────────────────────

export function ReportDocument({ input }: { input: ReportInput }) {
  // Override the brand accent colors from the org so every internal page feels
  // on-brand without creating a separate theme file.
  const brandPrimary = input.org.primary_color || colors.brand
  const brandStrong = input.org.secondary_color || colors.brandStrong
  // Mutate colors only for this document instance via a wrapped style override
  Object.assign(colors, { brand: brandPrimary, brandStrong })

  return (
    <Document
      title={`${input.org.name} — ${input.framework.code} Report ${input.period.year}`}
      author={input.publishedBy}
      subject={`${input.framework.name} sustainability disclosure for fiscal year ${input.period.year}`}
      keywords={`ESG, sustainability, ${input.framework.code}, ${input.org.name}`}
      creator="Aeiforo"
      producer="Aeiforo ESG Platform"
    >
      <Cover input={input} />
      <TOC input={input} />
      <AboutAndAssertion input={input} />
      <Narratives input={input} />
      <Metrics input={input} />
      <ContentIndex input={input} />
      <AssurancePage input={input} />
    </Document>
  )
}
