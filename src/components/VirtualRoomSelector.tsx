'use client'

import { ImagePlus, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import {
  STUDIO_CATEGORIES,
  STUDIO_ROOMS,
  type StudioCategory,
  type StudioRoom,
} from '@/lib/studio-rooms'

type VirtualRoomSelectorProps = {
  open: boolean
  rooms?: StudioRoom[]
  activeRoomId: string
  customBackground?: string | null
  onClose: () => void
  onSelect: (roomId: string) => void
  onCustomUpload: (dataUrl: string) => void
}

export default function VirtualRoomSelector({
  open,
  rooms = STUDIO_ROOMS,
  activeRoomId,
  customBackground,
  onClose,
  onSelect,
  onCustomUpload,
}: VirtualRoomSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState<StudioCategory>('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    return rooms.filter((room) => {
      if (category !== 'all' && room.category !== category) return false
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return (
        room.name.toLowerCase().includes(q) ||
        room.description.toLowerCase().includes(q)
      )
    })
  }, [rooms, category, query])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d121c] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-white">Фон на стаята</p>
            <p className="text-xs text-slate-400">
              Офиси, lounge, outdoor — филтрирай и избери
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 border-b border-white/10 px-5 py-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Търси офис, lounge, rooftop…"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
          />
          <div className="flex flex-wrap gap-1.5">
            {STUDIO_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                  category === cat.id
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {filtered.map((room) => {
              const selected = activeRoomId === room.id && !customBackground
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => onSelect(room.id)}
                  className={`overflow-hidden rounded-xl border text-left transition ${
                    selected
                      ? 'border-indigo-400/50 ring-1 ring-indigo-400/30'
                      : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={room.imageUrl}
                    alt={room.name}
                    className="h-24 w-full object-cover"
                  />
                  <div className="bg-white/[0.03] px-2.5 py-2">
                    <p className="text-xs font-semibold text-white">{room.name}</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-slate-400">
                      {room.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              Няма резултати за този филтър.
            </p>
          ) : null}
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3">
            <div>
              <p className="text-xs font-medium text-white">Собствен фон</p>
              <p className="text-[11px] text-slate-400">Качи JPG / PNG / WebP</p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => {
                  if (typeof reader.result === 'string') onCustomUpload(reader.result)
                }
                reader.readAsDataURL(file)
              }}
            />
          </div>
          {customBackground ? (
            <p className="mt-2 text-[11px] text-emerald-300">
              Активен е качен персонален фон.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
