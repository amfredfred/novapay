// components/table-pagination.tsx
'use client'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Props {
  page:          number
  pageCount:     number
  pageSize:      number
  count:         number
  onPageChange:  (page: number) => void
  onSizeChange?: (size: number) => void
  pageSizes?:    number[]
}

export function TablePagination({
  page,
  pageCount,
  pageSize,
  count,
  onPageChange,
  onSizeChange,
  pageSizes = [10, 20, 50, 100],
}: Props) {
  const from = Math.min((page - 1) * pageSize + 1, count)
  const to   = Math.min(page * pageSize, count)

  return (
    <div className="flex items-center justify-between px-1 py-3">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from}–{to}</span> of{' '}
        <span className="font-medium text-foreground">{count.toLocaleString()}</span> results
      </p>

      <div className="flex items-center gap-4">
        {onSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onSizeChange(Number(v))}
            >
              <SelectTrigger className="h-8 w-[70px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizes.map((s) => (
                  <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="outline" size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline" size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1 mx-1">
            {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
              let p: number
              if (pageCount <= 5)             p = i + 1
              else if (page <= 3)             p = i + 1
              else if (page >= pageCount - 2) p = pageCount - 4 + i
              else                            p = page - 2 + i

              return (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8 text-sm"
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline" size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline" size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(pageCount)}
            disabled={page >= pageCount}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
