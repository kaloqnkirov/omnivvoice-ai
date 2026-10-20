'use client'

import { useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'
import {
  THEME_OPTIONS,
  WALLPAPER_PRESETS,
  type AppearanceSettings,
  type ThemeId,
} from '@/lib/appearance'

type Props = {
  open: boolean
  appearance: AppearanceSettings
  onClose: () => void
  onChange: (patch: Partial<AppearanceSettings>) => void
}

export default function AppearancePanel({
  open,
  appearance,
  onClose,
  onChange,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[76] flex items-end justify-center bg-black/55 px-3 py-3 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Изглед · теми и тапети</p>
            <p className="text-[11px] text-[var(--muted)]">
              8 режима + готови и собствени снимки
            </p>
          </div>
          <button type="button" className="ov-icon-btn" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Тема
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {THEME_OPTIONS.map((theme) => {
                const active = appearance.theme === theme.id
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => onChange({ theme: theme.id as ThemeId })}
                    className={`overflow-hidden rounded-2xl border text-left ${
                      active
                        ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/40'
                        : 'border-[var(--panel-border)]'
                    }`}
                  >
                    <span
                      className="block h-12 w-full"
                      style={{ background: theme.swatch }}
                    />
                    <span className="block px-2 py-1.5 text-[11px] font-semibold">
                      {theme.labelBg}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Тапет
            </p>
            <div className="grid grid-cols-3 gap-2">
              {WALLPAPER_PRESETS.map((paper) => {
                const active =
                  !appearance.customWallpaper &&
                  appearance.wallpaperId === paper.id
                return (
                  <button
                    key={paper.id}
                    type="button"
                    onClick={() =>
                      onChange({
                        wallpaperId: paper.id,
                        customWallpaper: null,
                      })
                    }
                    className={`overflow-hidden rounded-xl border text-left ${
                      active
                        ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/40'
                        : 'border-[var(--panel-border)]'
                    }`}
                  >
                    {paper.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={paper.imageUrl}
                        alt={paper.name}
                        className="h-16 w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-16 items-center justify-center bg-[var(--chip)] text-[10px] text-[var(--muted)]">
                        None
                      </span>
                    )}
                    <span className="block truncate px-1.5 py-1 text-[10px]">
                      {paper.name}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--chip)] p-3">
              <div>
                <p className="text-xs font-semibold">Собствен тапет</p>
                <p className="text-[11px] text-[var(--muted)]">
                  JPG / PNG / WebP от твоя компютър
                </p>
              </div>
              <button
                type="button"
                className="ov-btn-ghost !px-3 !py-1.5 text-xs"
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Качи
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  if (file.size > 4.5 * 1024 * 1024) {
                    window.alert('Макс. 4.5 MB за тапет')
                    return
                  }
                  const reader = new FileReader()
                  reader.onload = () => {
                    if (typeof reader.result === 'string') {
                      onChange({
                        customWallpaper: reader.result,
                        wallpaperId: 'custom',
                      })
                    }
                  }
                  reader.readAsDataURL(file)
                  e.target.value = ''
                }}
              />
            </div>
            {appearance.customWallpaper ? (
              <button
                type="button"
                className="mt-2 text-[11px] text-rose-500"
                onClick={() =>
                  onChange({ customWallpaper: null, wallpaperId: 'none' })
                }
              >
                Премахни собствения тапет
              </button>
            ) : null}
          </section>

          <section className="space-y-3">
            <label className="block text-xs">
              <span className="mb-1 flex justify-between text-[var(--muted)]">
                <span>Затъмняване върху тапета</span>
                <span>{Math.round(appearance.wallpaperDim * 100)}%</span>
              </span>
              <input
                type="range"
                min={0.15}
                max={0.85}
                step={0.05}
                className="w-full"
                value={appearance.wallpaperDim}
                onChange={(e) =>
                  onChange({ wallpaperDim: Number(e.target.value) })
                }
              />
            </label>
            <label className="flex items-center justify-between rounded-xl bg-[var(--chip)] px-3 py-2 text-xs">
              <span>Лек blur на тапета</span>
              <input
                type="checkbox"
                checked={appearance.wallpaperBlur}
                onChange={(e) =>
                  onChange({ wallpaperBlur: e.target.checked })
                }
              />
            </label>
          </section>
        </div>
      </div>
    </div>
  )
}
