'use client'

import { ImagePlus, Lock, Trash2, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { PlanId } from '@/lib/languages'
import {
  STUDIO_CATEGORIES,
  STUDIO_PACKS,
  STUDIO_ROOMS,
  customToStudioRoom,
  planUnlocks,
  type CustomStudioRoom,
  type StudioCategory,
  type StudioPackFilter,
  type StudioRoom,
} from '@/lib/studio-rooms'

type VirtualRoomSelectorProps = {
  open: boolean
  userPlan: PlanId
  isAdmin?: boolean
  activeRoomId: string
  customBackground?: string | null
  customRooms?: CustomStudioRoom[]
  onClose: () => void
  onSelect: (roomId: string) => void
  onAddCustomRoom: (room: CustomStudioRoom) => void
  onDeleteCustomRoom: (roomId: string) => void
  onUpgradeHint?: () => void
}

export default function VirtualRoomSelector({
  open,
  userPlan,
  isAdmin = false,
  activeRoomId,
  customBackground,
  customRooms = [],
  onClose,
  onSelect,
  onAddCustomRoom,
  onDeleteCustomRoom,
  onUpgradeHint,
}: VirtualRoomSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState<StudioCategory>('all')
  const [pack, setPack] = useState<StudioPackFilter>('all')
  const [query, setQuery] = useState('')
  const [roomName, setRoomName] = useState('')

  const effectivePlan: PlanId = isAdmin ? 'podcast' : userPlan

  const catalog = useMemo(() => {
    const customs = customRooms.map(customToStudioRoom)
    const lockedShown = STUDIO_ROOMS.map((room) => ({
      ...room,
      locked: !planUnlocks(effectivePlan, room.plan),
    }))
    return { customs, lockedShown }
  }, [customRooms, effectivePlan])

  const filtered = useMemo(() => {
    type Row = StudioRoom & { locked?: boolean }
    let list: Row[] = []

    if (pack === 'mine' || category === 'mine') {
      list = catalog.customs
    } else {
      list = [
        ...catalog.customs,
        ...catalog.lockedShown.filter((room) => {
          if (pack === 'business') return room.pack === 'business' || room.pack === 'core'
          if (pack === 'podcast') return room.pack === 'podcast' || room.pack === 'core'
          return true
        }),
      ]
    }

    return list.filter((room) => {
      if (category !== 'all' && category !== 'mine' && room.category !== category) {
        return false
      }
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return (
        room.name.toLowerCase().includes(q) ||
        room.description.toLowerCase().includes(q)
      )
    })
  }, [catalog, category, pack, query])

  if (!open) return null

  const canUpload =
    isAdmin || effectivePlan === 'business' || effectivePlan === 'podcast'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d121c] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-white">Виртуални стаи</p>
            <p className="text-xs text-slate-400">
              Business офиси · Podcast студиа · качвай свои
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
            placeholder="Търси офис, boardroom, podcast dark…"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
          />
          <div className="flex flex-wrap gap-1.5">
            {STUDIO_PACKS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPack(p.id)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                  pack === p.id
                    ? 'bg-teal-500 text-black'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
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
              const locked = Boolean(
                'locked' in room && room.locked && !room.custom
              )
              const selected =
                activeRoomId === room.id &&
                (!customBackground || room.custom)
              return (
                <div
                  key={room.id}
                  className={`overflow-hidden rounded-xl border text-left transition ${
                    selected
                      ? 'border-teal-400/50 ring-1 ring-teal-400/30'
                      : 'border-white/10'
                  }`}
                >
                  <button
                    type="button"
                    className="relative w-full"
                    onClick={() => {
                      if (locked) {
                        onUpgradeHint?.()
                        return
                      }
                      onSelect(room.id)
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={room.imageUrl}
                      alt={room.name}
                      className={`h-24 w-full object-cover ${locked ? 'opacity-50' : ''}`}
                    />
                    {locked ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[11px] font-semibold text-white">
                        <Lock className="mr-1 h-3.5 w-3.5" />
                        {room.plan === 'podcast' ? 'Podcast' : 'Business'}
                      </span>
                    ) : null}
                    {room.custom ? (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-teal-500/90 px-1.5 py-0.5 text-[9px] font-bold text-black">
                        Моя
                      </span>
                    ) : (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white/90">
                        {room.pack}
                      </span>
                    )}
                  </button>
                  <div className="flex items-start justify-between gap-1 bg-white/[0.03] px-2.5 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">
                        {room.name}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-snug text-slate-400">
                        {room.description}
                      </p>
                    </div>
                    {room.custom ? (
                      <button
                        type="button"
                        className="shrink-0 rounded p-1 text-rose-300 hover:bg-white/5"
                        title="Изтрий"
                        onClick={() => onDeleteCustomRoom(room.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              Няма стаи за този филтър. Качи своя или смени пакета.
            </p>
          ) : null}
        </div>

        <div className="space-y-2 border-t border-white/10 px-5 py-4">
          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white">Добави своя стая</p>
              <p className="text-[11px] text-slate-400">
                {canUpload
                  ? 'Запазва се в „Моите“ — Business / Podcast'
                  : 'Качване на собствени стаи: Business или Podcast план'}
              </p>
              {canUpload ? (
                <input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Име на стаята (напр. Моят офис)"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none"
                />
              ) : null}
            </div>
            <button
              type="button"
              disabled={!canUpload}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-40"
              onClick={() => {
                if (!canUpload) {
                  onUpgradeHint?.()
                  return
                }
                fileInputRef.current?.click()
              }}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Качи снимка
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 4.5 * 1024 * 1024) {
                  window.alert('Макс. 4.5 MB на снимка')
                  return
                }
                const reader = new FileReader()
                reader.onload = () => {
                  if (typeof reader.result !== 'string') return
                  const room: CustomStudioRoom = {
                    id: `custom_${Date.now()}`,
                    name: roomName.trim() || file.name.replace(/\.[^.]+$/, ''),
                    imageDataUrl: reader.result,
                    createdAt: new Date().toISOString(),
                  }
                  onAddCustomRoom(room)
                  onSelect(room.id)
                  setRoomName('')
                  setPack('mine')
                  setCategory('mine')
                }
                reader.readAsDataURL(file)
                e.target.value = ''
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
