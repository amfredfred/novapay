'use client'

import { useState } from 'react'
import { MessageCircle, Shield } from 'lucide-react'
import { ChatThread } from '@/components/chat-thread'
import { sendMessageAsSuperadmin } from '@/actions/messages'
import { formatDateTime } from '@/lib/utils'

interface UserInfo { id: string; name: string; email: string; role: string }
interface Thread   { key: string; userA: UserInfo; userB: UserInfo; messages: any[]; lastAt: string }

const ROLE_COLOR: Record<string, string> = {
  admin: 'text-primary', superadmin: 'text-amber-500', client: 'text-muted-foreground',
}

export function SuperadminMessagesClient({
  superadminId, threads,
}: { superadminId: string; threads: Thread[] }) {
  const [selected, setSelected] = useState<Thread | null>(threads[0] ?? null)
  // For superadmin: pick which participant to reply as (composing to the other)
  const [replyTo, setReplyTo]   = useState<UserInfo | null>(null)

  function selectThread(t: Thread) {
    setSelected(t)
    // Default reply to the client (non-admin) side
    const target = t.userA.role === 'client' ? t.userA : t.userB
    setReplyTo(target)
  }

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Thread list */}
      <div className="w-80 shrink-0 border-r border-border flex flex-col">
        <div className="px-4 py-4 border-b border-border">
          <h1 className="font-semibold text-foreground">All Messages</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{threads.length} conversation{threads.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No messages in the system yet</p>
            </div>
          ) : threads.map(t => (
            <button key={t.key} onClick={() => selectThread(t)}
              className={`w-full px-4 py-3.5 text-left hover:bg-muted/40 transition-colors ${selected?.key === t.key ? 'bg-muted/60' : ''}`}>
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0 mt-0.5">
                  {t.userA.name.slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">{t.userA.name}</p>
                    <span className="text-muted-foreground text-xs">↔</span>
                    <p className="text-sm font-medium text-foreground truncate">{t.userB.name}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-semibold capitalize ${ROLE_COLOR[t.userA.role]}`}>{t.userA.role}</span>
                    <span className="text-muted-foreground text-[10px]">↔</span>
                    <span className={`text-[10px] font-semibold capitalize ${ROLE_COLOR[t.userB.role]}`}>{t.userB.role}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {t.messages[t.messages.length - 1]?.body ?? ''}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat view */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Shield className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">Select a conversation to monitor</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {selected.userA.name} ↔ {selected.userB.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{selected.messages.length} messages</p>
                </div>
              </div>
              {/* Reply as superadmin: pick recipient */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Reply to:</span>
                <button onClick={() => setReplyTo(selected.userA)}
                  className={`px-2 py-1 rounded-lg border transition-colors ${replyTo?.id === selected.userA.id ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}>
                  {selected.userA.name}
                </button>
                <button onClick={() => setReplyTo(selected.userB)}
                  className={`px-2 py-1 rounded-lg border transition-colors ${replyTo?.id === selected.userB.id ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}>
                  {selected.userB.name}
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ChatThread
                currentUserId={superadminId}
                otherUser={replyTo ?? selected.userA}
                initialMessages={selected.messages}
                onSend={body => sendMessageAsSuperadmin({ receiverId: (replyTo ?? selected.userA).id, body })}
                placeholder={replyTo ? `Message ${replyTo.name}…` : 'Select a recipient above'}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
