// app/[locale]/(superadmin)/system/_components/realtime-log-feed.tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Circle, Trash2, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogLine {
  id:        string
  ts:        string
  level:     'INFO' | 'WARN' | 'ERROR'
  service:   string
  message:   string
}

const LEVEL_STYLES: Record<LogLine['level'], string> = {
  INFO:  'text-emerald-600 dark:text-emerald-400',
  WARN:  'text-amber-600 dark:text-amber-400',
  ERROR: 'text-destructive',
}

const MAX_LINES = 200

export function RealtimeLogFeed() {
  const [lines, setLines]     = useState<LogLine[]>([])
  const [paused, setPaused]   = useState(false)
  const [connected, setConnected] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  const addLine = useCallback((line: LogLine) => {
    if (pausedRef.current) return
    setLines((prev) => {
      const next = [...prev, line]
      return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next
    })
  }, [])

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to audit_log inserts as a proxy for system events
    const channel = supabase
      .channel('system-logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_log' },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          addLine({
            id:      String(row['id']),
            ts:      new Date().toLocaleTimeString('en-GB', { hour12: false }),
            level:   'INFO',
            service: 'audit.service',
            message: `${row['action']} · actor=${row['actor_email']} target=${row['target_id']}`,
          })
        },
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => { void supabase.removeChannel(channel) }
  }, [addLine])

  // Auto-scroll to bottom
  useEffect(() => {
    if (!paused) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [lines, paused])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">Realtime system logs</CardTitle>
            <Badge variant="secondary" className="gap-1.5 text-xs">
              <Circle className={cn(
                'h-2 w-2',
                connected
                  ? 'fill-emerald-500 text-emerald-500'
                  : 'fill-muted-foreground text-muted-foreground',
              )} />
              {connected ? 'Live' : 'Connecting…'}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setPaused((v) => !v)}
            >
              {paused
                ? <><Play className="h-3 w-3" /> Resume</>
                : <><Pause className="h-3 w-3" /> Pause</>}
            </Button>
            <Button
              variant="outline" size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setLines([])}
            >
              <Trash2 className="h-3 w-3" /> Clear
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Supabase Realtime · audit_log INSERT stream · max {MAX_LINES} lines
        </p>
      </CardHeader>

      <CardContent className="p-0">
        <div className="bg-[#0f1117] rounded-b-lg overflow-hidden">
          <div className="h-64 overflow-y-auto px-4 py-3 space-y-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
            {lines.length === 0 ? (
              <p className="text-[#5a6478] text-sm font-mono">
                Waiting for events… perform an action to see live logs.
              </p>
            ) : (
              lines.map((line) => (
                <div key={line.id} className="flex items-start gap-3 font-mono text-xs leading-relaxed">
                  <span className="text-[#3d4557] shrink-0">{line.ts}</span>
                  <span className={cn('shrink-0 font-medium', LEVEL_STYLES[line.level])}>
                    [{line.level}]
                  </span>
                  <span className="text-[#7c8fa6] shrink-0">{line.service}</span>
                  <span className="text-[#c8d3e8] break-all">{line.message}</span>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
