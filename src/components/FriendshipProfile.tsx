'use client'

import {
  MessageCircle,
  Phone,
  Sparkles,
  StickyNote,
  Video,
  X,
} from 'lucide-react'
import MoodAvatar from '@/components/MoodAvatar'
import { CHARMS, type FriendshipStats } from '@/lib/snap-plus'
import { getLanguage } from '@/lib/languages'
import { presenceLabel } from '@/lib/smart-replies'
import type { PresenceStatus } from '@/lib/user-store'

type Props = {
  open: boolean
  name: string
  language: string
  presence: PresenceStatus
  avatarUrl?: string
  stats: FriendshipStats
  onClose: () => void
  onMessage: () => void
  onCall: () => void
  onVideo: () => void
  onNoteChange: (note: string) => void
}

export default function FriendshipProfile({
  open,
  name,
  language,
  presence,
  avatarUrl,
  stats,
  onClose,
  onMessage,
  onCall,
  onVideo,
  onNoteChange,
}: Props) {
  if (!open) return null
  const lang = getLanguage(language)
  const charms = CHARMS.filter((c) => stats.charmIds.includes(c.id))

  return (
    <div className="fixed inset-0 z-[72] flex items-end justify-center bg-black/60 px-3 py-3 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] shadow-2xl">
        <div className="relative bg-gradient-to-br from-teal-700/50 via-slate-900 to-fuchsia-900 px-5 pb-5 pt-4 text-white">
          <button
            type="button"
            className="absolute right-3 top-3 rounded-full bg-white/10 p-1.5"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <MoodAvatar
              moodId={
                presence === 'offline'
                  ? 'offline_mood'
                  : presence === 'in_studio'
                    ? 'creative'
                    : 'focused'
              }
              name={name}
              imageUrl={avatarUrl}
              size="xl"
              ring
            />
            <div>
              <p className="font-[family-name:var(--font-display)] text-xl font-semibold">
                {name}
              </p>
              <p className="text-xs text-white/75">
                {lang.flag} {lang.nativeName} · {presenceLabel(presence)}
              </p>
              {stats.bestFriendRank ? (
                <p className="mt-1 text-[11px] text-amber-200">
                  ⭐ Best friend #{stats.bestFriendRank}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Съобщения" value={String(stats.messagesExchanged)} />
            <Stat label="Обаждания" value={String(stats.callsTogether)} />
            <Stat label="Streak" value={`${stats.streakDays}д`} />
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              <Sparkles className="h-3 w-3" />
              Charms · по-умно от Snapchat
            </p>
            <div className="grid grid-cols-2 gap-2">
              {charms.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl bg-[var(--chip)] px-2.5 py-2"
                >
                  <p className="text-sm font-semibold">
                    {c.emoji} {c.titleBg}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                    {c.description}
                  </p>
                </div>
              ))}
              {!charms.length ? (
                <p className="col-span-2 text-xs text-[var(--muted)]">
                  Още няма charms — говорете повече.
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Езици заедно
            </p>
            <div className="flex flex-wrap gap-1.5">
              {stats.languagesUsed.map((code) => (
                <span
                  key={code}
                  className="rounded-full bg-[var(--chip)] px-2 py-0.5 text-[11px]"
                >
                  {getLanguage(code).flag} {getLanguage(code).nativeName}
                </span>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 flex items-center gap-1 text-[11px] text-[var(--muted)]">
              <StickyNote className="h-3 w-3" />
              Лична бележка (само ти виждаш)
            </span>
            <textarea
              className="ov-field min-h-[64px] text-sm"
              value={stats.note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="напр. предпочита формален тон…"
            />
          </label>

          <div className="grid grid-cols-3 gap-2">
            <button type="button" className="ov-btn-ghost justify-center !py-2 text-xs" onClick={onMessage}>
              <MessageCircle className="h-3.5 w-3.5" />
              Чат
            </button>
            <button type="button" className="ov-btn-ghost justify-center !py-2 text-xs" onClick={onCall}>
              <Phone className="h-3.5 w-3.5" />
              Call
            </button>
            <button type="button" className="ov-btn-primary justify-center !py-2 text-xs" onClick={onVideo}>
              <Video className="h-3.5 w-3.5" />
              Video
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--chip)] px-2 py-2">
      <p className="text-base font-semibold">{value}</p>
      <p className="text-[10px] text-[var(--muted)]">{label}</p>
    </div>
  )
}
