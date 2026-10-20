'use client'

import { Heart, Languages, X } from 'lucide-react'
import type { SpotlightItem } from '@/lib/snap-plus'

type Props = {
  open: boolean
  items: SpotlightItem[]
  onClose: () => void
  onToggleLike: (id: string) => void
  onPublishMine: () => void
}

export default function SpotlightFeed({
  open,
  items,
  onClose,
  onToggleLike,
  onPublishMine,
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[72] flex items-end justify-center bg-black/70 px-3 py-3 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b1020] text-white shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Spotlight+</p>
            <p className="text-[11px] text-white/60">
              Creator лента с двуезични captions — Snapchat Spotlight × превод
            </p>
          </div>
          <button type="button" className="rounded-full p-1.5 hover:bg-white/10" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-3 pb-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
            >
              <div className="aspect-[9/14] bg-gradient-to-br from-teal-600/40 via-indigo-900 to-fuchsia-900 p-4">
                <p className="text-[10px] uppercase tracking-wider text-white/60">
                  {item.kind} · {item.language.toUpperCase()}
                </p>
                <p className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold leading-snug">
                  {item.title}
                </p>
                <p className="mt-3 text-sm text-white/90">{item.caption}</p>
                {item.captionTranslated ? (
                  <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-black/30 px-2.5 py-2 text-xs text-teal-100">
                    <Languages className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {item.captionTranslated}
                  </p>
                ) : null}
                <p className="mt-auto pt-6 text-xs text-white/60">
                  {item.authorName}
                </p>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                    item.likedByMe ? 'text-rose-400' : 'text-white/70'
                  }`}
                  onClick={() => onToggleLike(item.id)}
                >
                  <Heart
                    className={`h-4 w-4 ${item.likedByMe ? 'fill-current' : ''}`}
                  />
                  {item.likes}
                </button>
                <span className="text-[10px] text-white/40">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
            </article>
          ))}
        </div>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            className="ov-btn-primary w-full !py-2 text-xs"
            onClick={onPublishMine}
          >
            Публикувай мой highlight
          </button>
        </div>
      </div>
    </div>
  )
}
