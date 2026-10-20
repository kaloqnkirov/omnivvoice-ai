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
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'light',
    label: 'Light',
    labelBg: 'Светла',
    swatch: 'linear-gradient(135deg,#f4f7f4,#0f8f75)',
    isDark: false,
  },
  {
    id: 'dark',
    label: 'Dark',
    labelBg: 'Тъмна',
    swatch: 'linear-gradient(135deg,#07110e,#2dd4a8)',
    isDark: true,
  },
  {
    id: 'midnight',
    label: 'Midnight',
    labelBg: 'Полунощ',
    swatch: 'linear-gradient(135deg,#0b1020,#6366f1)',
    isDark: true,
  },
  {
    id: 'ocean',
    label: 'Ocean',
    labelBg: 'Океан',
    swatch: 'linear-gradient(135deg,#06263a,#22d3ee)',
    isDark: true,
  },
  {
    id: 'sunset',
    label: 'Sunset',
    labelBg: 'Залез',
    swatch: 'linear-gradient(135deg,#2a1210,#fb923c)',
    isDark: true,
  },
  {
    id: 'forest',
    label: 'Forest',
    labelBg: 'Гора',
    swatch: 'linear-gradient(135deg,#102417,#86efac)',
    isDark: true,
  },
  {
    id: 'aurora',
    label: 'Aurora',
    labelBg: 'Аврора',
    swatch: 'linear-gradient(135deg,#0f172a,#34d399 40%,#38bdf8)',
    isDark: true,
  },
  {
    id: 'carbon',
    label: 'Carbon',
    labelBg: 'Карбон',
    swatch: 'linear-gradient(135deg,#111111,#a3a3a3)',
    isDark: true,
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
  wallpaperDim: 0.55,
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
