/**
 * iXBRL scaffold — produces an XHTML+ix document with embedded
 * ix:nonFraction / ix:nonNumeric tags. The current implementation emits a
 * minimal valid-shaped skeleton — production ESRS taxonomy validation should
 * be delegated to a partner SDK (CoreFiling Magnify, ParsePort, IRIS Carbon)
 * by replacing the body of `generateIxbrl`.
 *
 * See docs/IXBRL_PARTNERS.md for integration notes.
 */

export interface IxbrlTag {
  conceptName: string  // e.g. "esrs:GrossScope1GreenhouseGasEmissions"
  value: string | number
  unit?: string        // e.g. "tCO2e", "EUR", "pure"
  contextRef: string   // e.g. "FY2026"
  decimals?: number
  scale?: number
}

export interface IxbrlMapping {
  questionnaireItemId: string
  conceptName: string
  unit: string
}

export async function generateIxbrl(
  reportId: string,
  mappings: IxbrlMapping[],
  data: Record<string, IxbrlTag>,
): Promise<string> {
  const tags = Object.values(data).map(t => `
    <ix:nonFraction
      name="${escapeXml(t.conceptName)}"
      contextRef="${escapeXml(t.contextRef)}"
      unitRef="${escapeXml(t.unit ?? 'pure')}"
      decimals="${t.decimals ?? 0}"
      scale="${t.scale ?? 0}">${escapeXml(String(t.value))}</ix:nonFraction>
  `).join('\n')

  const mappingComment = mappings.length > 0
    ? `<!-- ${mappings.length} concept mapping(s) applied -->`
    : `<!-- no concept mappings supplied -->`

  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:ix="http://www.xbrl.org/2013/inlineXBRL"
      xmlns:xbrli="http://www.xbrl.org/2003/instance"
      xmlns:esrs="http://xbrl.efrag.org/taxonomy/esrs">
<head>
  <title>Sustainability Report ${escapeXml(reportId)} — iXBRL</title>
  ${mappingComment}
</head>
<body>
${tags}
</body>
</html>`
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', "'":'&apos;', '"':'&quot;' }[c]!))
}
