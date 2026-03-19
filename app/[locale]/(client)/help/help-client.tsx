'use client'

import { useState } from 'react'
import { MessageCircle, ChevronDown, ChevronUp, FileText, Shield, CreditCard, ArrowLeftRight, HelpCircle } from 'lucide-react'
import { ChatThread } from '@/components/chat-thread'
import { sendMessage, markThreadRead } from '@/actions/messages'

const FAQ = [
  { q: 'How do I send money?', a: 'Go to Send money → choose a method (SEPA, NovaPay, PayPal, Crypto) → enter details and confirm with your transaction PIN.' },
  { q: 'How do I freeze my card?', a: 'Cards → find your card → tap "Freeze card". Unfreeze the same way.' },
  { q: 'Why is my KYC taking longer?', a: 'We aim to review within 24 hours. Check your email for any requests for additional documents.' },
  { q: 'How do I exchange currencies?', a: 'Exchange → select from/to account → enter amount → confirm. You need accounts in both currencies.' },
  { q: 'What currencies can I hold?', a: 'EUR, USD, GBP, CHF, NGN, JPY, CAD, and AUD. Open separate accounts per currency from the Accounts page.' },
  { q: 'How do I set a transaction PIN?', a: 'Settings → Security → Transaction PIN → Set PIN. You\'ll need this to confirm every transfer.' },
  { q: 'Is my money protected?', a: 'Yes. Your funds are held in segregated safeguarding accounts and never lent out.' },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border last:border-0">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors">
        <p className="text-sm font-medium text-foreground pr-4">{q}</p>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {open && <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>}
    </div>
  )
}

interface Props {
  userId:         string
  accountManager: { id: string; name: string; email: string } | null
  initialThread:  any[]
}

export function HelpClient({ userId, accountManager, initialThread }: Props) {
  const [tab, setTab] = useState<'faq' | 'chat'>('faq')

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Help & Support</h1>
        <p className="text-sm text-muted-foreground mt-0.5">FAQs and direct messaging with your account manager</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        {(['faq', 'chat'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {t === 'faq' ? 'FAQs' : 'Message account manager'}
          </button>
        ))}
      </div>

      {tab === 'faq' && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {FAQ.map(item => <FaqItem key={item.q} {...item} />)}
        </div>
      )}

      {tab === 'chat' && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ height: 520 }}>
          {!accountManager ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground mb-1">No account manager assigned yet</p>
              <p className="text-sm text-muted-foreground">Once a manager is assigned to your account you'll be able to chat with them directly here.</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                  {accountManager.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{accountManager.name}</p>
                  <p className="text-xs text-muted-foreground">Your account manager</p>
                </div>
              </div>
              <div style={{ height: 'calc(100% - 57px)' }}>
                <ChatThread
                  currentUserId={userId}
                  otherUser={accountManager}
                  initialMessages={initialThread}
                  onSend={body => sendMessage({ receiverId: accountManager.id, body })}
                  onMarkRead={() => markThreadRead(accountManager.id)}
                  placeholder={`Message ${accountManager.name}…`}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
