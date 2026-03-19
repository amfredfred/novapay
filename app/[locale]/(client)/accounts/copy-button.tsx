'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={`p-1 hover:bg-white/10 rounded transition-colors ${className ?? ''}`}
      title="Copy to clipboard"
    >
      {copied
        ? <Check className="h-3.5 w-3.5 text-green-400" />
        : <Copy className="h-3.5 w-3.5 text-primary-foreground/70" />
      }
    </button>
  )
}
