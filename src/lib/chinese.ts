/**
 * Simplified → Traditional (Hong Kong standard) conversion for HKEX filings.
 * OpenCC's dictionaries are ~1 MB, so they load only when a Traditional export
 * is requested.
 */
let converter: Promise<(text: string) => string> | null = null

export function toTraditionalHK(): Promise<(text: string) => string> {
  converter ??= import('opencc-js/cn2t').then(m => m.Converter({ from: 'cn', to: 'hk' }))
  return converter
}
