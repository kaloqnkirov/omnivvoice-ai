'use client'

import { ImagePlus, X } from 'lucide-react'
import { useRef } from 'react'

export type StudioRoom = {
  id: string
  name: string
  description: string
  gradient: string
  imageUrl?: string
}

export const DEFAULT_STUDIO_ROOMS: StudioRoom[] = [
  {
    id: 'modern-office',
    name: 'Modern Office',
    description: 'Glass desks, soft daylight, enterprise presence',
    gradient: 'linear-gradient(135deg, #1e293b 0%, #334155 45%, #0f172a 100%)',
  },
  {
    id: 'penthouse',
    name: 'Penthouse',
    description: 'Skyline glow with warm evening ambience',
    gradient: 'linear-gradient(135deg, #3b1d4a 0%, #1e3a5f 50%, #0b1220 100%)',
  },
  {
    id: 'podcast-studio',
    name: 'Podcast Studio',
    description: 'Acoustic panels, broadcast lighting, mic boom',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
  },
]

type VirtualRoomSelectorProps = {
  open: boolean
  rooms: StudioRoom[]
  activeRoomId: string
  customBackground?: string | null
  onClose: () => void
  onSelect: (roomId: string) => void
  onCustomUpload: (dataUrl: string) => void
}

export default function VirtualRoomSelector({
  open,
  rooms,
  activeRoomId,
  customBackground,
  onClose,
  onSelect,
  onCustomUpload,
}: VirtualRoomSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d121c] p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Virtual Studio Rooms</p>
            <p className="text-xs text-slate-400">
              Choose a 3D background or upload your own studio plate
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Close room selector"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {rooms.map((room) => {
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
                <div
                  className="h-20 w-full"
                  style={{
                    backgroundImage: room.imageUrl
                      ? `url(${room.imageUrl})`
                      : room.gradient,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
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

        <div className="mt-4 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-white">Custom background</p>
              <p className="text-[11px] text-slate-400">
                Upload a JPG/PNG/WebP studio image
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/15"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Upload
            </button>
          </div>
          {customBackground && (
            <div
              className="mt-3 h-24 rounded-lg border border-indigo-400/30 bg-cover bg-center"
              style={{ backgroundImage: `url(${customBackground})` }}
            />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = () => {
                if (typeof reader.result === 'string') {
                  onCustomUpload(reader.result)
                }
              }
              reader.readAsDataURL(file)
            }}
          />
        </div>
      </div>
    </div>
  )
}
