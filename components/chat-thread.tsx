'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id:          string
  sender_id:   string
  receiver_id: string
  body:        string
  read:        boolean
  created_at:  string
}

interface Props {
  currentUserId: string
  otherUser:     { id: string; name: string }
  initialMessages: Message[]
  onSend:        (body: string) => Promise<{ success: boolean; error?: string }>
  onMarkRead?:   () => Promise<void>
  placeholder?:  string
}

export function ChatThread({ currentUserId, otherUser, initialMessages, onSend, onMarkRead, placeholder }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [body, setBody]         = useState('')
  const [isPending, start]      = useTransition()
  const bottomRef               = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    onMarkRead?.()
    // Subscribe to realtime
    const supabase = createClient()
    const channel  = supabase
      .channel(`thread-${currentUserId}-${otherUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${currentUserId}`,
      }, payload => {
        const msg = payload.new as Message
        if (msg.sender_id === otherUser.id) {
          setMessages(prev => [...prev, msg])
          onMarkRead?.()
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentUserId, otherUser.id])

  function handleSend() {
    const trimmed = body.trim()
    if (!trimmed) return
    const optimistic: Message = {
      id: crypto.randomUUID(), sender_id: currentUserId,
      receiver_id: otherUser.id, body: trimmed,
      read: false, created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    setBody('')
    start(async () => {
      const result = await onSend(trimmed)
      if (!result.success) {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
        setBody(trimmed)
      }
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            No messages yet. Start the conversation.
          </div>
        ) : messages.map(msg => {
          const isMine = msg.sender_id === currentUserId
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                isMine
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted text-foreground rounded-bl-sm'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
                <p className={`text-[10px] mt-1 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                  {formatDateTime(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 flex gap-2 items-end shrink-0">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder={placeholder ?? `Message ${otherUser.name}…`}
          rows={2}
          className="flex-1 resize-none px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={isPending || !body.trim()}
          className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
