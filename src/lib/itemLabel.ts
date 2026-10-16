/**
 * Localised text for a questionnaire item.
 *
 * `questionnaire_item.line_item` is the canonical (English) text and stays the
 * conflict key. Frameworks authored in Chinese (CN-SSE, CN-CSDS, HKEX ESG,
 * CASS-ESG) also carry `line_item_zh`; any framework may add it later.
 * When the UI language is Chinese and a translation exists, show it;
 * otherwise fall back to the canonical text.
 */
export interface LocalisableItem {
  line_item?: string | null
  lineItem?: string | null
  line_item_zh?: string | null
  lineItemZh?: string | null
}

export function itemLabel(item: LocalisableItem, language: string | undefined): string {
  const canonical = item.line_item ?? item.lineItem ?? ''
  if (language?.startsWith('zh')) {
    const zh = item.line_item_zh ?? item.lineItemZh
    if (zh) return zh
  }
  return canonical
}
