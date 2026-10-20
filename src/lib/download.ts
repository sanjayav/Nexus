/** Browser file downloads, shared by every export in the app. */

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** Hand a generated file to the browser as a download. */
export function saveFile(bytes: Uint8Array, name: string, type = XLSX_MIME) {
  const url = URL.createObjectURL(new Blob([bytes.slice().buffer], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** File-name safe: no path separators or characters Windows rejects; spaces become hyphens. */
export const fileSafe = (s: string) =>
  s
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '-')

const escapeCell = (v: string | number) => {
  const s = String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Download rows as CSV. UTF-8 BOM so Excel opens Chinese text correctly. */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const body = '﻿' + rows.map(r => r.map(escapeCell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
