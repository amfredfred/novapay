// components/data-table.tsx
'use client'

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type OnChangeFn,
} from '@tanstack/react-table'
import { useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface DataTableProps<TData, TValue> {
  columns:        ColumnDef<TData, TValue>[]
  data:           TData[]
  isLoading?:     boolean
  emptyMessage?:  string
  onRowClick?:    (row: TData) => void
  rowSelection?:  RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  // Server-side sort
  sortBy?:        string
  sortDir?:       'asc' | 'desc'
  onSortChange?:  (col: string, dir: 'asc' | 'desc') => void
  className?:     string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  emptyMessage = 'No results.',
  onRowClick,
  rowSelection,
  onRowSelectionChange,
  sortBy,
  sortDir,
  onSortChange,
  className,
}: DataTableProps<TData, TValue>) {
  const [localSorting, setLocalSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting:      localSorting,
      rowSelection: rowSelection ?? {},
    },
    enableRowSelection:     !!onRowSelectionChange,
    onSortingChange:        setLocalSorting,
    onRowSelectionChange,
    getCoreRowModel:        getCoreRowModel(),
    getSortedRowModel:      getSortedRowModel(),
    manualSorting:          !!onSortChange,
  } as Parameters<typeof useReactTable<TData>>[0])

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="bg-muted/50 px-4 py-3">
          <Skeleton className="h-4 w-48" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-4 py-3.5 border-t border-border flex gap-4">
            <Skeleton className="h-4 w-[60px]" />
            <Skeleton className="h-4 w-[160px]" />
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-4 w-[80px]" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border border-border overflow-hidden', className)}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="bg-muted/50 hover:bg-muted/50">
              {hg.headers.map((header) => {
                const canSort  = header.column.getCanSort()
                const isSorted = header.column.getIsSorted()

                return (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    className={cn(
                      'text-[11px] uppercase tracking-wider font-medium text-muted-foreground whitespace-nowrap py-3',
                      canSort && 'cursor-pointer select-none hover:text-foreground transition-colors',
                    )}
                    onClick={
                      canSort
                        ? () => {
                            if (onSortChange) {
                              const col = header.column.id
                              const newDir = sortBy === col && sortDir === 'asc' ? 'desc' : 'asc'
                              onSortChange(col, newDir)
                            } else {
                              header.column.toggleSorting()
                            }
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort && (
                        <span className="text-muted-foreground/50">
                          {isSorted === 'asc'  ? <ArrowUp className="h-3 w-3" /> :
                           isSorted === 'desc' ? <ArrowDown className="h-3 w-3" /> :
                                                 <ArrowUpDown className="h-3 w-3" />}
                        </span>
                      )}
                    </div>
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? 'selected' : undefined}
                className={cn(
                  'border-border',
                  onRowClick && 'cursor-pointer',
                )}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-32 text-center text-muted-foreground text-sm"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
