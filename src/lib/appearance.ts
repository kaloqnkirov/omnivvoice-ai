export type ThemeId =
  | 'light'
  | 'dark'
  | 'midnight'
  | 'ocean'
  | 'sunset'
  | 'forest'
  | 'aurora'
  | 'carbon'

export type ThemeOption = {
  id: ThemeId
  label: string
  labelBg: string
  swatch: string
  isDark: boolean
  /** Suggested wallpaper preset when picking this theme */
  wallpaperId?: string
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'light',
    label: 'Light',
    labelBg: 'Светла',
    swatch: 'linear-gradient(135deg,#f4f7f4 40%,#c8ebe0,#0f8f75)',
    isDark: false,
    wallpaperId: 'none',
  },
  {
    id: 'dark',
    label: 'Dark',
    labelBg: 'Тъмна',
    swatch: 'linear-gradient(135deg,#07110e,#1a3d32,#2dd4a8)',
    isDark: true,
    wallpaperId: 'studio-dark',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    labelBg: 'Полунощ',
    swatch: 'linear-gradient(135deg,#0b1020 30%,#1e1b4b,#6366f1,#fbbf24)',
    isDark: true,
    wallpaperId: 'city-night',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    labelBg: 'Океан',
    swatch: 'linear-gradient(160deg,#e0f7fa 10%,#0891b2 45%,#042f4a)',
    isDark: false,
    wallpaperId: 'ocean-wave',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    labelBg: 'Залез',
    swatch: 'linear-gradient(135deg,#fff7ed,#fdba74,#fb7185,#7c2d12)',
    isDark: false,
    wallpaperId: 'warm-abstract',
  },
  {
    id: 'forest',
    label: 'Forest',
    labelBg: 'Гора',
    swatch: 'linear-gradient(160deg,#ecfdf5,#86efac 35%,#166534 70%,#052e16)',
    isDark: false,
    wallpaperId: 'forest-mist',
  },
  {
    id: 'aurora',
    label: 'Aurora',
    labelBg: 'Аврора',
    swatch: 'linear-gradient(120deg,#0f172a,#34d399 35%,#38bdf8 60%,#a78bfa)',
    isDark: true,
    wallpaperId: 'soft-mesh',
  },
  {
    id: 'carbon',
    label: 'Carbon',
    labelBg: 'Карбон',
    swatch: 'linear-gradient(135deg,#0a0a0a,#404040 40%,#d4d4d4,#111)',
    isDark: true,
    wallpaperId: 'studio-dark',
  },
]

export type WallpaperPreset = {
  id: string
  name: string
  imageUrl: string
}

/** Curated wallpapers — Unsplash, high quality */
export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'none',
    name: 'Без тапет',
    imageUrl: '',
  },
  {
    id: 'soft-mesh',
    name: 'Soft mesh',
    imageUrl:
      'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'studio-dark',
    name: 'Studio dark',
    imageUrl:
      'https://images.unsplash.com/photo-1516280440614-6697288d5d38?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'glass-office',
    name: 'Glass office',
    imageUrl:
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'city-night',
    name: 'City night',
    imageUrl:
      'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'ocean-wave',
    name: 'Ocean wave',
    imageUrl:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'forest-mist',
    name: 'Forest mist',
    imageUrl:
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'warm-abstract',
    name: 'Warm abstract',
    imageUrl:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'minimal-desk',
    name: 'Minimal desk',
    imageUrl:
      'https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=1600&q=80',
  },
]

export type AppearanceSettings = {
  theme: ThemeId
  wallpaperId: string
  customWallpaper: string | null
  wallpaperDim: number
  wallpaperBlur: boolean
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: 'dark',
  wallpaperId: 'none',
  customWallpaper: null,
  wallpaperDim: 0.45,
  wallpaperBlur: true,
}

export function getThemeOption(id: ThemeId | string | undefined) {
  return THEME_OPTIONS.find((t) => t.id === id) || THEME_OPTIONS[1]
}

export function resolveWallpaperUrl(appearance: AppearanceSettings) {
  if (appearance.customWallpaper) return appearance.customWallpaper
  const preset = WALLPAPER_PRESETS.find((w) => w.id === appearance.wallpaperId)
  return preset?.imageUrl || ''
}

export function cycleTheme(current: ThemeId): ThemeId {
  const idx = THEME_OPTIONS.findIndex((t) => t.id === current)
  const next = THEME_OPTIONS[(idx + 1) % THEME_OPTIONS.length]
  return next.id
}
