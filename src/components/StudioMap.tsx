'use client'

import { MapPin, Radio, X } from 'lucide-react'
import MoodAvatar from '@/components/MoodAvatar'
import type { MapNode } from '@/lib/snap-plus'
import { presenceLabel } from '@/lib/smart-replies'

type Props = {
  open: boolean
  nodes: MapNode[]
  onClose: () => void
  onSelect: (nodeId: string) => void
}

export default function StudioMap({ open, nodes, onClose, onSelect }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[72] flex items-end justify-center bg-black/60 px-3 py-3 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Studio Map</p>
            <p className="text-[11px] text-[var(--muted)]">
              Без GPS — само vibe: кой е online / в студио / на call
            </p>
          </div>
          <button type="button" className="ov-icon-btn" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative m-4 h-72 overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[radial-gradient(circle_at_30%_20%,rgba(45,212,191,0.18),transparent_45%),radial-gradient(circle_at_70%_70%,rgba(99,102,241,0.22),transparent_50%),linear-gradient(160deg,#0f172a,#111827)]">
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px]" />
          {nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
              onClick={() => onSelect(node.id)}
              title={`${node.name} · ${presenceLabel(node.presence)}`}
            >
              <MoodAvatar
                moodId={node.moodId}
                name={node.name}
                size="md"
                ring={node.presence !== 'offline'}
              />
              <span className="mt-1 block max-w-[72px] truncate rounded-full bg-black/50 px-1.5 py-0.5 text-[9px] text-white">
                {node.isMe ? 'Ти' : node.name.split(' ')[0]}
              </span>
            </button>
          ))}
          <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] text-teal-100">
            <Radio className="h-3 w-3" />
            Live presence
          </div>
        </div>

        <ul className="max-h-40 space-y-1 overflow-y-auto px-4 pb-4">
          {nodes.map((node) => (
            <li key={`list-${node.id}`}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-[var(--chip)]"
                onClick={() => onSelect(node.id)}
              >
                <MapPin className="h-3.5 w-3.5 text-[var(--muted)]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold">
                    {node.name}
                    {node.isMe ? ' (ти)' : ''}
                  </span>
                  <span className="block truncate text-[10px] text-[var(--muted)]">
                    {presenceLabel(node.presence)} · {node.locationLabel}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
