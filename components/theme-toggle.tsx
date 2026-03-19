// components/theme-toggle.tsx
'use client'

import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from './theme-provider'

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme()

  const options = [
    { value: 'light',  Icon: Sun,     label: 'Light' },
    { value: 'dark',   Icon: Moon,    label: 'Dark' },
    { value: 'system', Icon: Monitor, label: 'System' },
  ] as const

  if (compact) {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    const current = options.find(o => o.value === theme)!
    const Icon = current.Icon
    return (
      <button
        onClick={() => setTheme(next)}
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title={`Theme: ${current.label}`}
      >
        <Icon className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
      {options.map(({ value, Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
            theme === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}
