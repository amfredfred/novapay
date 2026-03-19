'use client'

import { useState, useEffect, useTransition } from 'react'
import { Bell, X, CheckCheck, MessageCircle, ShieldCheck, AlertTriangle, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils'

interface Notification {
  id: string; title: string; body: string; type: string; read: boolean; created_at: string; link: string | null
}

const TYPE_ICON: Record<string, React.ElementType> = {
  transaction: MessageCircle,
  success:     CheckCheck,
  warning:     AlertTriangle,
  error:       AlertTriangle,
  info:        Info,
}

const TYPE_COLOR: Record<string, string> = {
  transaction: 'text-primary',
  success:     'text-green-600',
  warning:     'text-amber-600',
  error:       'text-destructive',
  info:        'text-muted-foreground',
}

export function NotificationsBell({ userId }: { userId: string }) {
  const [open, setOpen]         = useState(false)
  const [notifs, setNotifs]     = useState<Notification[]>([])
  const [, start]               = useTransition()

  useEffect(() => {
    const supabase = createClient()
    // Initial load
    supabase.from('notifications' as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setNotifs((data as any[]) ?? []))

    // Realtime subscription
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, payload => {
        setNotifs(prev => [payload.new as Notification, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const unread = notifs.filter(n => !n.read).length

  async function markAllRead() {
    const supabase = createClient()
    await (supabase as any).from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function markRead(id: string) {
    const supabase = createClient()
    await (supabase as any).from('notifications').update({ read: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-foreground">Notifications</p>
                {unread > 0 && (
                  <span className="text-[10px] font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">{unread}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:text-primary/80 transition-colors">Mark all read</button>
                )}
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {notifs.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet</div>
              ) : notifs.map(n => {
                const Icon = TYPE_ICON[n.type] ?? Info
                return (
                  <div
                    key={n.id}
                    onClick={() => { markRead(n.id); if (n.link) window.location.href = n.link }}
                    className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                  >
                    <div className={`mt-0.5 shrink-0 ${TYPE_COLOR[n.type] ?? 'text-muted-foreground'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{formatDateTime(n.created_at)}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
