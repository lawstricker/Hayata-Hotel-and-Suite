import * as XLSX from 'xlsx'
import { downloadCsv } from '@/lib/utils'

export type ExportFormat = 'csv' | 'xlsx'

/** Native CSV export plus SheetJS XLSX export for every finance list/report. */
export function exportRows(filename: string, rows: Record<string, unknown>[], format: ExportFormat) {
  if (!rows.length) return
  if (format === 'csv') {
    downloadCsv(`${filename}.csv`, rows)
    return
  }
  const sheet = XLSX.utils.json_to_sheet(rows)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Data')
  XLSX.writeFile(book, `${filename}.xlsx`)
}
