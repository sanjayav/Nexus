/**
 * ExcelImport must parse .csv uploads as CSV (it used to hand every file to
 * ExcelJS's xlsx loader, which fails on any CSV) and must decode GBK files
 * saved by Chinese Excel.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ExcelImport from '../../components/ExcelImport'

const hex = (h: string) => new Uint8Array(h.match(/../g)!.map(b => parseInt(b, 16)))

/** Scope,Category,Source,Fuel,Quantity,Unit with two Chinese rows, GB18030-encoded. */
const GB18030_SHEET = hex(
  '53636f70652c43617465676f72792c536f757263652c4675656c2c5175616e746974792c556e69740d0a' +
  '53636f706520322ccde2b9bab5e7c1a62cd2cbb1f6b9a4b3a72cb9facdf8b5e7c1a62c22312c3233342e35222cc7a7cddfcab10d0a' +
  '53636f706520312cb9ccb6a8c8bcc9d52cb3c9b6bcbbf9b5d82cccecc8bbc6f82c3536302cc1a2b7bdc3d70d0a',
)

function upload(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

describe('ExcelImport CSV path', () => {
  it('parses a GBK-encoded .csv and shows Chinese values in the mapping step', async () => {
    render(<ExcelImport onImport={vi.fn()} onClose={vi.fn()} />)
    upload(new File([GB18030_SHEET], '温室气体排放.csv', { type: 'text/csv' }))

    expect(await screen.findByText('宜宾工厂')).toBeInTheDocument()
    expect(screen.getByText('成都基地')).toBeInTheDocument()
    expect(screen.getByText('温室气体排放.csv')).toBeInTheDocument()
    // "1,234.5" (quoted, thousands separator) became the number 1234.5.
    expect(screen.getByText('1234.5')).toBeInTheDocument()
    expect(screen.queryByText(/Could not parse the file/)).not.toBeInTheDocument()
  })

  it('parses a UTF-8 (BOM) .csv the same way', async () => {
    const text = 'Scope,Category,Source,Fuel,Quantity,Unit\r\nScope 1,固定燃烧,成都基地,天然气,560,立方米\r\n'
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(text)])
    render(<ExcelImport onImport={vi.fn()} onClose={vi.fn()} />)
    upload(new File([bytes], 'data.csv', { type: 'application/vnd.ms-excel' }))

    expect(await screen.findByText('成都基地')).toBeInTheDocument()
    // Header is not polluted by the BOM.
    await waitFor(() => expect(screen.getByRole('columnheader', { name: 'Scope' })).toBeInTheDocument())
  })
})
