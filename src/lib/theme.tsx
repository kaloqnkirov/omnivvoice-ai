'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  cycleTheme,
  getThemeOption,
  resolveWallpaperUrl,
  type AppearanceSettings,
  type ThemeId,
} from '@/lib/appearance'
import { loadPreferences, savePreferences, type AppPreferences } from '@/lib/user-store'

type ThemeContextValue = {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
  toggleTheme: () => void
  appearance: AppearanceSettings
  setAppearance: (patch: Partial<AppearanceSettings>) => void
  prefs: AppPreferences
  updatePrefs: (patch: Partial<AppPreferences>) => void
  hydrated: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyDocumentTheme(theme: ThemeId, appearance: AppearanceSettings) {
  const root = document.documentElement
  const option = getThemeOption(theme)
  root.dataset.theme = theme
  root.classList.toggle('dark', option.isDark)
  root.classList.toggle('light', !option.isDark)

  const wallpaper = resolveWallpaperUrl(appearance)
  const body = document.body
  if (wallpaper) {
    body.style.setProperty('--wallpaper-image', `url("${wallpaper}")`)
    body.classList.add('has-wallpaper')
  } else {
    body.style.setProperty('--wallpaper-image', 'none')
    body.classList.remove('has-wallpaper')
  }
  body.style.setProperty('--wallpaper-dim', String(appearance.wallpaperDim))
  body.style.setProperty(
    '--wallpaper-blur',
    appearance.wallpaperBlur ? '3px' : '0px'
  )
}

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
    const appearance = {
      ...prefs.appearance,
      theme: prefs.theme,
    }
    applyDocumentTheme(prefs.theme, appearance)
    savePreferences({ ...prefs, appearance })
  }, [prefs, hydrated])

  const updatePrefs = useCallback((patch: Partial<AppPreferences>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch }
      if (patch.theme && !patch.appearance) {
        next.appearance = { ...current.appearance, theme: patch.theme }
      }
      if (patch.appearance?.theme && !patch.theme) {
        next.theme = patch.appearance.theme
      }
      return next
    })
  }, [])

  const setTheme = useCallback(
    (theme: ThemeId) => {
      updatePrefs({
        theme,
        appearance: { ...prefs.appearance, theme },
      })
    },
    [prefs.appearance, updatePrefs]
  )

  const setAppearance = useCallback(
    (patch: Partial<AppearanceSettings>) => {
      setPrefs((current) => {
        let appearance = { ...current.appearance, ...patch }
        // When switching theme, auto-pick a matching wallpaper if user has none
        if (
          patch.theme &&
          patch.theme !== current.appearance.theme &&
          !patch.wallpaperId &&
          !patch.customWallpaper &&
          (appearance.wallpaperId === 'none' || !appearance.wallpaperId) &&
          !appearance.customWallpaper
        ) {
          const suggested = getThemeOption(patch.theme).wallpaperId
          if (suggested) {
            appearance = { ...appearance, wallpaperId: suggested }
          }
        }
        const next = {
          ...current,
          appearance,
          theme: appearance.theme,
        }
        return next
      })
    },
    []
  )

  const toggleTheme = useCallback(() => {
    setPrefs((current) => {
      const theme = cycleTheme(current.theme)
      return {
        ...current,
        theme,
        appearance: { ...current.appearance, theme },
      }
    })
  }, [])

  const value = useMemo(
    () => ({
      theme: prefs.theme,
      setTheme,
      toggleTheme,
      appearance: prefs.appearance,
      setAppearance,
      prefs,
      updatePrefs,
      hydrated,
    }),
    [
      prefs,
      setTheme,
      toggleTheme,
      setAppearance,
      updatePrefs,
      hydrated,
    ]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
