'use client'

import { useState } from 'react'
import { MessageCircle, Users } from 'lucide-react'
import { ChatThread } from '@/components/chat-thread'
import { sendMessageAsAdmin, markThreadReadAsAdmin } from '@/actions/messages'
import { formatDateTime } from '@/lib/utils'

interface Thread {
  userId:   string
  name:     string
  email:    string
  messages: any[]
  unread:   number
}

export function AdminMessagesClient({ adminId, threads }: { adminId: string; threads: Thread[] }) {
  const [selected, setSelected] = useState<Thread | null>(threads[0] ?? null)

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Thread list */}
      <div className="w-72 shrink-0 border-r border-border flex flex-col">
        <div className="px-4 py-4 border-b border-border">
          <h1 className="font-semibold text-foreground">Messages</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{threads.length} conversation{threads.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No messages yet</p>
            </div>
          ) : threads.map(t => (
            <button key={t.userId} onClick={() => setSelected(t)}
              className={`w-full px-4 py-3.5 flex items-start gap-3 text-left hover:bg-muted/40 transition-colors ${selected?.userId === t.userId ? 'bg-muted/60' : ''}`}>
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0 mt-0.5">
                {t.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                  {t.unread > 0 && (
                    <span className="text-[10px] font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full shrink-0">{t.unread}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {t.messages[t.messages.length - 1]?.body ?? ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <MessageCircle className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">Select a conversation</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border shrink-0">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                {selected.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{selected.name}</p>
                <p className="text-xs text-muted-foreground">{selected.email}</p>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ChatThread
                currentUserId={adminId}
                otherUser={{ id: selected.userId, name: selected.name }}
                initialMessages={selected.messages}
                onSend={body => sendMessageAsAdmin({ receiverId: selected.userId, body })}
                onMarkRead={() => markThreadReadAsAdmin(selected.userId)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
