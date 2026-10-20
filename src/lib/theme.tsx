'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { loadPreferences, savePreferences, type AppPreferences } from '@/lib/user-store'

type Theme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  prefs: AppPreferences
  updatePrefs: (patch: Partial<AppPreferences>) => void
  hydrated: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<AppPreferences>(() => loadPreferences())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const loaded = loadPreferences()
    setPrefs(loaded)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    document.documentElement.dataset.theme = prefs.theme
    document.documentElement.classList.toggle('dark', prefs.theme === 'dark')
    document.documentElement.classList.toggle('light', prefs.theme === 'light')
    savePreferences(prefs)
  }, [prefs, hydrated])

  const updatePrefs = useCallback((patch: Partial<AppPreferences>) => {
    setPrefs((current) => ({ ...current, ...patch }))
  }, [])

  const setTheme = useCallback(
    (theme: Theme) => {
      updatePrefs({ theme })
    },
    [updatePrefs]
  )

  const toggleTheme = useCallback(() => {
    setPrefs((current) => ({
      ...current,
      theme: current.theme === 'dark' ? 'light' : 'dark',
    }))
  }, [])

  const value = useMemo(
    () => ({
      theme: prefs.theme,
      setTheme,
      toggleTheme,
      prefs,
      updatePrefs,
      hydrated,
    }),
    [prefs, setTheme, toggleTheme, updatePrefs, hydrated]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
