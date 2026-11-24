import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Columns3, Download, Search, SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn, downloadCsv } from '@/lib/utils'

export interface DataTableColumn<T> {
  key: string
  header: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  className?: string
  cell?: (row: T) => ReactNode
  exportValue?: (row: T) => string | number
  hideOnMobile?: boolean
}

interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  searchPlaceholder?: string
  searchKeys?: Array<(row: T) => string>
  toolbar?: ReactNode
  bulkActions?: (selectedIds: string[], clear: () => void) => ReactNode
  onRowClick?: (row: T) => void
  pageSize?: number
  emptyTitle?: string
  emptyDescription?: string
  filename?: string
  selectable?: boolean
  initialSort?: { key: string; direction: 'asc' | 'desc' }
}

function rawValue<T>(row: T, key: string): unknown {
  const value = row[key as keyof T]
  if (value instanceof Date) return value.getTime()
  return value
}

export function DataTable<T extends { id: string }>({ data, columns, searchPlaceholder = 'Search…', searchKeys, toolbar, bulkActions, onRowClick, pageSize = 8, emptyTitle = 'No matching records', emptyDescription = 'Try changing your filters or search query.', filename = 'export.csv', selectable = false, initialSort }: DataTableProps<T>) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(initialSort ?? null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(columns.map((column) => column.key)))

  const filtered = useMemo(() => {
    let rows = [...data]
    const normalizedQuery = query.trim().toLowerCase()
    if (normalizedQuery) {
      rows = rows.filter((row) => {
        const values = searchKeys?.length ? searchKeys.map((getter) => getter(row)) : columns.map((column) => String(rawValue(row, column.key) ?? ''))
        return values.join(' ').toLowerCase().includes(normalizedQuery)
      })
    }
    if (sort) {
      rows.sort((a, b) => {
        const first = rawValue(a, sort.key)
        const second = rawValue(b, sort.key)
        const comparison = typeof first === 'number' && typeof second === 'number' ? first - second : String(first ?? '').localeCompare(String(second ?? ''))
        return sort.direction === 'asc' ? comparison : -comparison
      })
    }
    return rows
  }, [columns, data, query, searchKeys, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const visibleColumnDefs = columns.filter((column) => visibleColumns.has(column.key))

  function toggleSort(key: string) {
    setSort((current) => current?.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' })
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(visibleRows.map((row) => row.id)) : new Set())
  }

  function toggleRow(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function exportRows() {
    const rows = filtered.map((row) => {
      const output: Record<string, unknown> = {}
      visibleColumnDefs.forEach((column) => {
        output[column.header] = column.exportValue ? column.exportValue(row) : rawValue(row, column.key)
      })
      return output
    })
    downloadCsv(filename, rows)
    toast.success(`${rows.length} rows exported`, { description: `${filename} downloaded successfully.` })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder={searchPlaceholder} className="pl-9" aria-label={searchPlaceholder} />
            {query && <button type="button" onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Clear search"><X className="size-3.5" /></button>}
          </div>
          {toolbar}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm"><Columns3 /> Columns</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  checked={visibleColumns.has(column.key)}
                  onCheckedChange={(checked) => setVisibleColumns((current) => {
                    const next = new Set(current)
                    if (checked) next.add(column.key)
                    else next.delete(column.key)
                    return next
                  })}
                >
                  {column.header}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={exportRows}><Download /> Export</Button>
        </div>
      </div>

      {selectable && selected.size > 0 && bulkActions && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <p className="text-sm font-semibold text-primary">{selected.size} selected</p>
          <div className="flex items-center gap-2">
            {bulkActions([...selected], () => setSelected(new Set()))}
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {selectable && (
                  <TableHead className="w-10 pl-4">
                    <Checkbox checked={visibleRows.length > 0 && visibleRows.every((row) => selected.has(row.id))} onCheckedChange={(checked) => toggleAll(checked === true)} aria-label="Select visible rows" />
                  </TableHead>
                )}
                {visibleColumnDefs.map((column) => (
                  <TableHead key={column.key} className={cn(column.align === 'right' && 'text-right', column.align === 'center' && 'text-center', column.className)}>
                    {column.sortable ? (
                      <button type="button" onClick={() => toggleSort(column.key)} className="inline-flex items-center gap-1 font-bold hover:text-foreground">
                        {column.header}
                        {sort?.key === column.key ? (sort.direction === 'asc' ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />) : null}
                      </button>
                    ) : column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row) => (
                <TableRow key={row.id} onClick={() => onRowClick?.(row)} className={cn(onRowClick && 'cursor-pointer')}>
                  {selectable && (
                    <TableCell className="pl-4" onClick={(event) => event.stopPropagation()}>
                      <Checkbox checked={selected.has(row.id)} onCheckedChange={(checked) => toggleRow(row.id, checked === true)} aria-label={`Select row ${row.id}`} />
                    </TableCell>
                  )}
                  {visibleColumnDefs.map((column) => (
                    <TableCell key={column.key} className={cn(column.align === 'right' && 'text-right', column.align === 'center' && 'text-center', column.hideOnMobile && 'hidden md:table-cell', column.className)}>
                      {column.cell ? column.cell(row) : String(rawValue(row, column.key) ?? '—')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {!visibleRows.length && (
                <TableRow>
                  <TableCell colSpan={visibleColumnDefs.length + (selectable ? 1 : 0)} className="h-48 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"><SlidersHorizontal className="size-4" /></div>
                      <p className="font-display font-bold">{emptyTitle}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)}</span> of <span className="font-semibold text-foreground">{filtered.length}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1} aria-label="Previous page"><ChevronLeft /></Button>
            <span className="min-w-20 text-center text-xs font-semibold">Page {currentPage} of {pageCount}</span>
            <Button variant="outline" size="icon-sm" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={currentPage === pageCount} aria-label="Next page"><ChevronRight /></Button>
          </div>
        </div>
      </div>
    </div>
  )
}
