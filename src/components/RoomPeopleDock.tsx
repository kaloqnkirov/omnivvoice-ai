'use client'

import { useState, type DragEvent } from 'react'
import { Check, DoorOpen, UserPlus, X } from 'lucide-react'
import type { JoinRequest } from '@/lib/auth-types'
import type { Subscriber } from '@/lib/user-store'
import { presenceLabel } from '@/lib/smart-replies'

type Props = {
  subscribers: Subscriber[]
  memberIds: string[]
  joinRequests: JoinRequest[]
  dropActive: boolean
  onDropSubscriber: (subscriberId: string) => void
  onAdmit: (requestId: string) => void
  onDecline: (requestId: string) => void
  onCopyInvite?: (requestId: string) => void
  onDragActiveChange?: (active: boolean) => void
}

export default function RoomPeopleDock({
  subscribers,
  memberIds,
  joinRequests,
  dropActive,
  onDropSubscriber,
  onAdmit,
  onDecline,
  onCopyInvite,
  onDragActiveChange,
}: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const inRoom = new Set(memberIds)
  const pendingInvites = joinRequests.filter(
    (r) => r.status === 'pending' && r.kind === 'invite'
  )
  const knocks = joinRequests.filter(
    (r) => r.status === 'pending' && r.kind === 'knock'
  )
  const available = subscribers.filter(
    (s) =>
      s.status !== 'blocked' &&
      !inRoom.has(s.id) &&
      !pendingInvites.some((r) => r.subscriberId === s.id) &&
      !knocks.some((r) => r.subscriberId === s.id)
  )

  function dragStart(subId: string, e: DragEvent) {
    setDraggingId(subId)
    onDragActiveChange?.(true)
    e.dataTransfer.setData('text/omnivvoice-subscriber', subId)
    e.dataTransfer.effectAllowed = 'copy'
  }

  function dragEnd() {
    setDraggingId(null)
    onDragActiveChange?.(false)
  }

  return (
    <aside className="flex w-full max-w-xs flex-col gap-3 rounded-2xl border border-white/15 bg-black/45 p-3 text-white backdrop-blur">
      <div>
        <p className="text-xs font-semibold">Абонати → стая</p>
        <p className="mt-0.5 text-[10px] text-white/60">
          Плъзни върху сцената за покана, или приеми ако искат да влязат
        </p>
      </div>

      {knocks.length > 0 ? (
        <section className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200">
            Искат да влязат
          </p>
          {knocks.map((req) => (
            <div
              key={req.id}
              className="flex items-center gap-2 rounded-xl bg-amber-400/15 px-2.5 py-2 ring-1 ring-amber-300/30"
            >
              <DoorOpen className="h-3.5 w-3.5 shrink-0 text-amber-200" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{req.name}</p>
                <p className="text-[10px] text-amber-100/80">почуква на вратата</p>
              </div>
              <button
                type="button"
                className="rounded-lg bg-emerald-500/90 p-1.5"
                title="Приеми"
                onClick={() => onAdmit(req.id)}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="rounded-lg bg-white/10 p-1.5"
                title="Откажи"
                onClick={() => onDecline(req.id)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </section>
      ) : null}

      {pendingInvites.length > 0 ? (
        <section className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-200">
            Поканени · чакат да влязат
          </p>
          {pendingInvites.map((req) => (
            <div
              key={req.id}
              className="flex items-center gap-2 rounded-xl bg-sky-400/10 px-2.5 py-2 ring-1 ring-sky-300/25"
            >
              <UserPlus className="h-3.5 w-3.5 shrink-0 text-sky-200" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{req.name}</p>
                <p className="text-[10px] text-white/55">чака абонатът да влезе</p>
              </div>
              {onCopyInvite ? (
                <button
                  type="button"
                  className="rounded-lg bg-white/10 px-2 py-1 text-[10px]"
                  onClick={() => onCopyInvite(req.id)}
                >
                  Линк
                </button>
              ) : null}
              <button
                type="button"
                className="rounded-lg bg-emerald-500/80 px-2 py-1 text-[10px] font-semibold"
                title="Маркирай че е влязъл"
                onClick={() => onAdmit(req.id)}
              >
                Влязъл
              </button>
            </div>
          ))}
        </section>
      ) : null}

      <section className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">
          Плъзни към сцената
        </p>
        {available.length === 0 ? (
          <p className="rounded-xl bg-white/5 px-2.5 py-3 text-[11px] text-white/50">
            Няма свободни абонати за покана
          </p>
        ) : (
          available.map((sub) => (
            <div
              key={sub.id}
              draggable
              onDragStart={(e) => dragStart(sub.id, e)}
              onDragEnd={dragEnd}
              className={`flex cursor-grab items-center gap-2 rounded-xl px-2.5 py-2 active:cursor-grabbing ${
                draggingId === sub.id
                  ? 'bg-[var(--accent)]/40 opacity-60'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
              title="Плъзни върху сцената"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-700 text-xs font-bold">
                {sub.name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold">
                  {sub.name}
                </span>
                <span className="block truncate text-[10px] text-white/50">
                  {presenceLabel(sub.presence || 'offline')} · плъзни
                </span>
              </span>
            </div>
          ))
        )}
      </section>

      {dropActive ? (
        <p className="rounded-xl border border-dashed border-[var(--accent)]/50 bg-[var(--accent)]/15 px-2 py-2 text-center text-[11px] text-[var(--accent)]">
          Пусни върху сцената за покана
        </p>
      ) : null}
    </aside>
  )
}
