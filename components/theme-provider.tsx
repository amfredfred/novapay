// components/theme-provider.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme:     Theme
  setTheme:  (t: Theme) => void
  resolved:  'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system', setTheme: () => {}, resolved: 'light',
})

export function useTheme() { return useContext(ThemeContext) }

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'novapay-theme',
}: {
  children:      React.ReactNode
  defaultTheme?: Theme
  storageKey?:   string
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [resolved, setResolved] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const stored = localStorage.getItem(storageKey) as Theme | null
    if (stored) setThemeState(stored)
  }, [storageKey])

  useEffect(() => {
    const getResolved = (t: Theme): 'light' | 'dark' => {
      if (t !== 'system') return t
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    setResolved(getResolved(theme))

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => {
        setResolved(e.matches ? 'dark' : 'light')
      }
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(resolved)
  }, [resolved])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem(storageKey, t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  )
}
