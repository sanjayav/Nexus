/**
 * Report generator (api/_reportGenerator.ts) against a fake `sql` tag:
 * language selection with English fallback, framework metadata, and a
 * render smoke test that the Chinese PDF embeds Noto Sans SC.
 */
import { assembleReportInput, renderReportPdf } from '../../../api/_reportGenerator'
import { CN_ORG, REPORT_ARGS, cnMetricRows, makeReportSql } from './report-fixture'

describe('assembleReportInput — language', () => {
  it('uses line_item_zh / section_zh / subsection_zh when the locale is zh', async () => {
    const { sql } = makeReportSql()
    const input = await assembleReportInput(sql, { ...REPORT_ARGS, locale: 'zh-CN' })
    expect(input.locale).toBe('zh')
    const raw = cnMetricRows()
    expect(input.metrics[0].line_item).toBe(raw[0].line_item_zh)
    expect(input.metrics[0].section).toBe('上市公司可持续发展报告指引')
    expect(input.metrics[0].subsection).toBe(raw[0].subsection_zh)
    expect(input.narratives.every(n => /[一-鿿]/.test(n.line_item))).toBe(true)
    expect(input.contentIndex[0].line_item).toMatch(/[一-鿿]/)
    expect(input.contentIndex[0].subsection).toMatch(/[一-鿿]/)
  })

  it('falls back to English when a translation is missing', async () => {
    const { sql } = makeReportSql()
    const input = await assembleReportInput(sql, { ...REPORT_ARGS, locale: 'zh' })
    const raw = cnMetricRows()
    // Row 3 of the fixture has no zh text.
    expect(input.metrics[3].line_item).toBe(raw[3].line_item)
    expect(input.metrics[3].subsection).toBe(raw[3].subsection)
  })

  it('falls back to a localised "general disclosures" section when none is set', async () => {
    const { sql } = makeReportSql({ metrics: [{ gri_code: 'X-1', line_item: 'Thing', line_item_zh: null, section: null, section_zh: null, subsection: '', subsection_zh: null, unit: 't', value: 1, entity_count: 1 }] })
    const zh = await assembleReportInput(sql, { ...REPORT_ARGS, locale: 'zh' })
    expect(zh.metrics[0].section).toBe('一般披露')
    const en = await assembleReportInput(sql, { ...REPORT_ARGS, locale: 'en' })
    expect(en.metrics[0].section).toBe('General disclosures')
  })

  it('keeps English text for an en report of the same data', async () => {
    const { sql } = makeReportSql()
    const input = await assembleReportInput(sql, { ...REPORT_ARGS, locale: 'en' })
    expect(input.locale).toBe('en')
    expect(input.metrics[0].line_item).toBe(cnMetricRows()[0].line_item)
    expect(input.metrics[0].section).toBe('CN-SSE Sustainability Reporting Guidelines')
    expect(input.framework.indexTitle).toBe('Sustainability Report Guideline Index')
  })

  it('reads localised columns schema-drift-safely via to_jsonb', async () => {
    const { sql, queries } = makeReportSql()
    await assembleReportInput(sql, { ...REPORT_ARGS, locale: 'zh' })
    const all = queries.join('\n')
    expect(all).toMatch(/to_jsonb\(qi\)->>'line_item_zh'/)
    expect(all).toMatch(/to_jsonb\(qi\)->>'section_zh'/)
    expect(all).toMatch(/to_jsonb\(qi\)->>'subsection_zh'/)
    expect(all).toMatch(/to_jsonb\(o\)->>'name_zh'/)
  })

  it('maps CN frameworks to their own name and content-index title', async () => {
    const { sql } = makeReportSql()
    const input = await assembleReportInput(sql, { ...REPORT_ARGS, locale: 'zh' })
    expect(input.framework.code).toBe('SSE')
    expect(input.framework.name).toContain('可持续发展报告')
    expect(input.framework.indexTitle).toBe('《可持续发展报告》指标索引')
    expect(input.framework.name).not.toBe('cn-sse')
  })

  it('uses the Chinese legal name and CSAE 3101 default for a mainland org', async () => {
    const { sql } = makeReportSql({
      assurance: [{ auditor_firm: null, signed_by: null, signed_at: '2026-04-15T00:00:00Z', opinion_type: 'limited', isae_reference: null, notes: null }],
    })
    const input = await assembleReportInput(sql, { ...REPORT_ARGS, assuranceRequestId: 'ar-1', locale: 'zh' })
    expect(input.org.legal_name).toBe(CN_ORG.legal_name_zh)
    expect(input.assurance?.isae_reference).toContain('CSAE 3101')
    expect(input.assurance?.firm).toBe('独立鉴证机构')
  })

  it('defaults a Thai org to the th locale', async () => {
    const { sql } = makeReportSql({ org: { ...CN_ORG, country: 'TH', thai_name: 'บริษัท ตัวอย่าง จำกัด' } })
    const input = await assembleReportInput(sql, { ...REPORT_ARGS, locale: 'en' })
    expect(input.locale).toBe('th')
  })
})

describe('renderReportPdf — Chinese', () => {
  it('embeds Noto Sans SC and renders the signed (italic) assurance page', async () => {
    const { sql } = makeReportSql({
      assurance: [{ auditor_firm: '某会计师事务所', signed_by: '李明', signed_at: '2026-04-15T00:00:00Z', opinion_type: 'reasonable', isae_reference: null, notes: null }],
    })
    const input = await assembleReportInput(sql, { ...REPORT_ARGS, assuranceRequestId: 'ar-1', locale: 'zh' })
    const { bytes, sha256 } = await renderReportPdf(input)
    const text = bytes.toString('latin1')
    expect(text).toContain('NotoSansSC')
    expect(text).not.toMatch(/\/BaseFont \/Helvetica\b/)
    expect(sha256).toMatch(/^[0-9a-f]{64}$/)
    // Subsetting keeps the output small despite ~10 MB source fonts.
    expect(bytes.length).toBeLessThan(2 * 1024 * 1024)
  }, 60_000)
})
