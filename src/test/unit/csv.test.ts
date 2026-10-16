/**
 * src/lib/csv.ts — BOM on export, encoding detection on import.
 *
 * GBK / GB18030 fixtures are the exact bytes Chinese Excel writes for
 * "CSV (逗号分隔)" (generated with Python's codecs, pasted as hex because
 * TextEncoder can only produce UTF-8).
 */
import { describe, it, expect } from 'vitest'
import { CSV_BOM, csvCell, toCsv, csvBlob, decodeCsvBytes, parseCsvBytes, readCsvFile, isCsvFile } from '../../lib/csv'

const hex = (h: string) => new Uint8Array(h.match(/../g)!.map(b => parseInt(b, 16)))

/** "指标,数值,单位\r\n范围一排放,12.5,吨二氧化碳当量\r\n" encoded as GBK. */
const GBK_CSV = hex('d6b8b1ea2ccafdd6b52cb5a5cebb0d0ab7b6cea7d2bbc5c5b7c52c31322e352cb6d6b6fed1f5bbafccbcb5b1c1bf0d0a')
const GBK_TEXT = '指标,数值,单位\r\n范围一排放,12.5,吨二氧化碳当量\r\n'

/** ExcelImport-shaped sheet with a quoted thousands value, as GB18030. */
const GB18030_SHEET = hex(
  '53636f70652c43617465676f72792c536f757263652c4675656c2c5175616e746974792c556e69740d0a' +
  '53636f706520322ccde2b9bab5e7c1a62cd2cbb1f6b9a4b3a72cb9facdf8b5e7c1a62c22312c3233342e35222cc7a7cddfcab10d0a' +
  '53636f706520312cb9ccb6a8c8bcc9d52cb3c9b6bcbbf9b5d82cccecc8bbc6f82c3536302cc1a2b7bdc3d70d0a',
)

const utf8 = (s: string) => new TextEncoder().encode(s)
const withBom = (s: string) => new Uint8Array([0xef, 0xbb, 0xbf, ...utf8(s)])

describe('decodeCsvBytes', () => {
  it('decodes GBK (Chinese Excel default) via the GB18030 fallback', () => {
    const { text, encoding } = decodeCsvBytes(GBK_CSV)
    expect(encoding).toBe('gb18030')
    expect(text).toBe(GBK_TEXT)
    expect(text).not.toContain('�')
  })

  it('decodes UTF-8 without BOM', () => {
    const { text, encoding } = decodeCsvBytes(utf8(GBK_TEXT))
    expect(encoding).toBe('utf-8')
    expect(text).toBe(GBK_TEXT)
  })

  it('decodes UTF-8 with BOM and strips the BOM', () => {
    const { text, encoding } = decodeCsvBytes(withBom(GBK_TEXT))
    expect(encoding).toBe('utf-8-bom')
    expect(text).toBe(GBK_TEXT)
    expect(text.charCodeAt(0)).not.toBe(0xfeff)
  })

  it('decodes BOM-marked UTF-16LE (Excel "Unicode Text")', () => {
    const s = '指标\t数值\r\n'
    const buf = new Uint8Array(2 + s.length * 2)
    buf[0] = 0xff; buf[1] = 0xfe
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); buf[2 + i * 2] = c & 0xff; buf[3 + i * 2] = c >> 8 }
    expect(decodeCsvBytes(buf)).toEqual({ text: s, encoding: 'utf-16le' })
  })

  it('keeps plain ASCII as UTF-8', () => {
    expect(decodeCsvBytes(utf8('a,b\r\n1,2\r\n')).encoding).toBe('utf-8')
  })

  it('accepts an ArrayBuffer', () => {
    expect(decodeCsvBytes(GBK_CSV.slice().buffer).text).toBe(GBK_TEXT)
  })
})

describe('parseCsvBytes', () => {
  it('parses a GBK file into Chinese headers and values', () => {
    const r = parseCsvBytes(GBK_CSV)
    expect(r.encoding).toBe('gb18030')
    expect(r.error).toBeNull()
    expect(r.headers).toEqual(['指标', '数值', '单位'])
    expect(r.rows).toEqual([{ 指标: '范围一排放', 数值: '12.5', 单位: '吨二氧化碳当量' }])
  })

  it('parses a UTF-8 BOM file without a "\\uFEFF" glued to the first header', () => {
    const r = parseCsvBytes(withBom('指标,数值\r\n范围一,1\r\n'))
    expect(r.headers[0]).toBe('指标')
    expect(r.rows[0]['指标']).toBe('范围一')
  })

  it('keeps quoted commas inside a cell', () => {
    const r = parseCsvBytes(GB18030_SHEET)
    expect(r.headers).toEqual(['Scope', 'Category', 'Source', 'Fuel', 'Quantity', 'Unit'])
    expect(r.rows[0]).toEqual({ Scope: 'Scope 2', Category: '外购电力', Source: '宜宾工厂', Fuel: '国网电力', Quantity: '1,234.5', Unit: '千瓦时' })
    expect(r.rows).toHaveLength(2)
  })

  it('readCsvFile reads a File', async () => {
    const file = new File([GBK_CSV], '排放数据.csv', { type: 'text/csv' })
    const r = await readCsvFile(file)
    expect(r.headers).toEqual(['指标', '数值', '单位'])
  })
})

describe('CSV export', () => {
  it('prefixes a UTF-8 BOM and quotes per RFC 4180', () => {
    const csv = toCsv([['gri_code', 'line_item'], ['305-1', '范围一排放, 直接'], ['x', 'say "hi"']])
    expect(csv.startsWith(CSV_BOM)).toBe(true)
    expect(csv).toBe('﻿gri_code,line_item\r\n305-1,"范围一排放, 直接"\r\nx,"say ""hi"""\r\n')
  })

  it('csvBlob bytes start with EF BB BF and round-trip through the importer', async () => {
    const blob = csvBlob([['指标', '数值'], ['范围一排放', 12.5]])
    expect(blob.type).toBe('text/csv;charset=utf-8')
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect(Array.from(bytes.subarray(0, 3))).toEqual([0xef, 0xbb, 0xbf])
    const r = parseCsvBytes(bytes)
    expect(r.encoding).toBe('utf-8-bom')
    expect(r.rows).toEqual([{ 指标: '范围一排放', 数值: '12.5' }])
  })

  it('csvCell handles null, numbers and objects', () => {
    expect(csvCell(null)).toBe('')
    expect(csvCell(undefined)).toBe('')
    expect(csvCell(0)).toBe('0')
    expect(csvCell('line\nbreak')).toBe('"line\nbreak"')
  })
})

describe('isCsvFile', () => {
  it('routes by extension first, then MIME type', () => {
    expect(isCsvFile({ name: '数据.CSV', type: '' })).toBe(true)
    // Windows often labels .csv as an Excel MIME type; the extension wins.
    expect(isCsvFile({ name: 'data.csv', type: 'application/vnd.ms-excel' })).toBe(true)
    expect(isCsvFile({ name: 'data.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })).toBe(false)
    expect(isCsvFile({ name: 'data.xls', type: 'application/vnd.ms-excel' })).toBe(false)
    expect(isCsvFile({ name: 'export', type: 'text/csv' })).toBe(true)
  })
})
