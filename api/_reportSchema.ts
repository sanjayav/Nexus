/**
 * Schema additions for localised report output (Phase 3, Chinese reports).
 *
 * Idempotent: every statement is ADD COLUMN IF NOT EXISTS on a nullable
 * column, so it is safe to run on every /api/setup call. Call it after
 * `organisations`, `questionnaire_item` and `report_artifacts` exist.
 *
 * Readers do not depend on this having run: the report generator reads the
 * new columns through `to_jsonb(row)->>'col'` and the publish path also keeps
 * the locale in report_artifacts.metadata, so a deploy that precedes the
 * migration still renders (in the requested language, with English fallback
 * for section headings).
 */

type SqlTag = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>

export async function ensureReportSchema(sql: SqlTag): Promise<void> {
  // Language the report artifact was rendered in ('en' | 'zh' | 'th'). The PDF
  // is hashed and anchored at publish time, so the language is fixed then;
  // DOCX and iXBRL renders of the same artifact reuse it.
  await sql`ALTER TABLE report_artifacts ADD COLUMN IF NOT EXISTS locale TEXT`

  // Simplified Chinese section / subsection headings for questionnaire items
  // (line_item_zh already exists). NULL means "use the English heading".
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS line_item_zh TEXT`
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS section_zh TEXT`
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS subsection_zh TEXT`

  // Chinese registered / display name for the report cover (e.g. 绿源控股集团有限公司).
  await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS name_zh TEXT`
  await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS legal_name_zh TEXT`
}
