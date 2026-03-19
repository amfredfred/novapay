// hooks/use-supabase-realtime.ts
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Options<T extends Record<string, unknown>> {
  table:   string
  schema?: string
  event?:  'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?: string
  onData:  (payload: { new: T; old: Partial<T>; eventType: string }) => void
}

/**
 * Subscribe to Supabase Realtime postgres_changes.
 * Auto-unsubscribes on component unmount.
 */
export function useSupabaseRealtime<T extends Record<string, unknown>>({
  table,
  schema = 'public',
  event  = '*',
  filter,
  onData,
}: Options<T>) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const onDataRef  = useRef(onData)
  onDataRef.current = onData

  useEffect(() => {
    const supabase = createClient()

    // Build the channel with postgres_changes subscription
    // Using channel().on() with 'postgres_changes' event type
    const channel = supabase.channel(`realtime:${schema}:${table}:${event}`)

    // The Supabase Realtime JS client accepts postgres_changes as a string literal
    // We use a type assertion here because the TypeScript types are overly strict
    ;(channel as unknown as {
      on: (
        type: string,
        filter: Record<string, string>,
        callback: (payload: unknown) => void,
      ) => typeof channel
    }).on(
      'postgres_changes',
      { event, schema, table, ...(filter ? { filter } : {}) },
      (payload: unknown) => {
        const p = payload as { new: T; old: Partial<T>; eventType: string }
        onDataRef.current(p)
      },
    )

    channel.subscribe()
    channelRef.current = channel

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [table, schema, event, filter])
}

/**
 * useAuditLogStream — subscribes to audit_log INSERT events in real time.
 */
export function useAuditLogStream(
  onEntry: (entry: Record<string, unknown>) => void,
) {
  useSupabaseRealtime({
    table:  'audit_log',
    event:  'INSERT',
    onData: (payload) => {
      if (payload.new) onEntry(payload.new as Record<string, unknown>)
    },
  })
}
