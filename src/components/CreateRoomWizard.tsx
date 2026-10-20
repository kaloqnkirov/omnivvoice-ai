'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  MessageCircle,
  Phone,
  Sparkles,
  Users,
  Video,
  Waves,
  X,
} from 'lucide-react'
import { APP_LANGUAGES, type PlanId } from '@/lib/languages'
import {
  roomsForPlan,
  type CustomStudioRoom,
  type VideoQualityId,
} from '@/lib/studio-rooms'

export type CreateRoomDraft = {
  title: string
  channel: 'chat' | 'call' | 'both'
  isGroup: boolean
  guestLanguage: string
  studioRoomId: string
  videoOnJoin: boolean
  videoQuality: VideoQualityId
  waitingRoom: boolean
  allowGuests: boolean
  copyInvite: boolean
  enterNow: boolean
  saveChat: boolean
  disappearAfter: 'off' | '1h' | '24h' | '7d'
  translationOn: boolean
}

type Props = {
  open: boolean
  userPlan: PlanId
  isAdmin?: boolean
  customRooms?: CustomStudioRoom[]
  defaultLanguage?: string
  busy?: boolean
  onClose: () => void
  onCreate: (draft: CreateRoomDraft) => void
}

const PRESETS: {
  id: string
  label: string
  hint: string
  patch: Partial<CreateRoomDraft>
}[] = [
  {
    id: 'chat',
    label: 'Чат стая',
    hint: 'Само съобщения + превод',
    patch: {
      channel: 'chat',
      videoOnJoin: false,
      title: 'Чат стая',
    },
  },
  {
    id: 'call',
    label: 'Гласово обаждане',
    hint: 'Микрофон, без камера',
    patch: {
      channel: 'call',
      videoOnJoin: false,
      title: 'Гласово обаждане',
    },
  },
  {
    id: 'video',
    label: 'Видео среща',
    hint: 'Камера + чат',
    patch: {
      channel: 'both',
      videoOnJoin: true,
      title: 'Видео среща',
    },
  },
  {
    id: 'group',
    label: 'Групова стая',
    hint: 'За няколко гости',
    patch: {
      channel: 'both',
      isGroup: true,
      title: 'Групова стая',
      allowGuests: true,
    },
  },
]

function makeDefaultDraft(
  defaultLanguage: string,
  studioRoomId: string
): CreateRoomDraft {
  return {
    title: 'Моята стая',
    channel: 'both',
    isGroup: false,
    guestLanguage: defaultLanguage,
    studioRoomId,
    videoOnJoin: true,
    videoQuality: '720p',
    waitingRoom: false,
    allowGuests: true,
    copyInvite: true,
    enterNow: true,
    saveChat: true,
    disappearAfter: 'off',
    translationOn: true,
  }
}

export default function CreateRoomWizard({
  open,
  userPlan,
  isAdmin,
  customRooms = [],
  defaultLanguage = 'bg',
  busy,
  onClose,
  onCreate,
}: Props) {
  const rooms = useMemo(
    () => roomsForPlan(isAdmin ? 'podcast' : userPlan, customRooms).slice(0, 12),
    [userPlan, isAdmin, customRooms]
  )
  const fallbackRoomId = rooms[0]?.id || 'glass-office'

  const [draft, setDraft] = useState<CreateRoomDraft>(() =>
    makeDefaultDraft(defaultLanguage, fallbackRoomId)
  )

  useEffect(() => {
    if (!open) return
    setDraft(makeDefaultDraft(defaultLanguage, fallbackRoomId))
  }, [open, defaultLanguage, fallbackRoomId])

  // Keep studio pick valid if plan changes while open
  useEffect(() => {
    if (!open) return
    if (!rooms.some((r) => r.id === draft.studioRoomId) && rooms[0]) {
      setDraft((d) => ({ ...d, studioRoomId: rooms[0].id }))
    }
  }, [open, rooms, draft.studioRoomId])

  if (!open) return null

  function patch(p: Partial<CreateRoomDraft>) {
    setDraft((d) => ({ ...d, ...p }))
  }

  function submit() {
    const title = draft.title.trim() || 'Моята стая'
    const studioRoomId = rooms.some((r) => r.id === draft.studioRoomId)
      ? draft.studioRoomId
      : fallbackRoomId
    onCreate({ ...draft, title, studioRoomId })
  }

  return (
    <div className="fixed inset-0 z-[78] flex items-end justify-center bg-black/60 px-3 py-3 backdrop-blur-sm sm:items-center">
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Създай стая"
      >
        <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-5 py-4">
          <div>
            <p className="text-sm font-semibold">Създай стая</p>
            <p className="text-[11px] text-[var(--muted)]">
              Избери опциите преди създаването — Normal / Business / Podcast
            </p>
          </div>
          <button
            type="button"
            className="ov-icon-btn"
            onClick={onClose}
            disabled={busy}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Бърз старт
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => patch(preset.patch)}
                  className="rounded-2xl border border-[var(--panel-border)] bg-[var(--chip)] px-3 py-3 text-left hover:ring-1 hover:ring-[var(--accent)]/35"
                >
                  <p className="text-sm font-semibold">{preset.label}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    {preset.hint}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <label className="block text-xs">
              <span className="mb-1 block text-[var(--muted)]">Име на стаята</span>
              <input
                className="ov-field"
                value={draft.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="напр. Демо с Мария"
              />
            </label>

            <div>
              <p className="mb-1.5 text-xs text-[var(--muted)]">Канал</p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['chat', 'Чат', MessageCircle],
                    ['call', 'Обаждане', Phone],
                    ['both', 'Чат + видео', Video],
                  ] as const
                ).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      patch({
                        channel: id,
                        videoOnJoin: id === 'both',
                      })
                    }
                    className={`rounded-xl px-2 py-2 text-[11px] font-semibold ${
                      draft.channel === id
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                        : 'bg-[var(--chip)] text-[var(--muted)]'
                    }`}
                  >
                    <Icon className="mx-auto mb-1 h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="mb-1 block text-[var(--muted)]">
                  Език за гости
                </span>
                <select
                  className="ov-field"
                  value={draft.guestLanguage}
                  onChange={(e) => patch({ guestLanguage: e.target.value })}
                >
                  {APP_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.nativeName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs">
                <span className="mb-1 block text-[var(--muted)]">
                  Видео качество
                </span>
                <select
                  className="ov-field"
                  value={draft.videoQuality}
                  onChange={(e) =>
                    patch({
                      videoQuality: e.target.value as VideoQualityId,
                    })
                  }
                >
                  <option value="auto">Auto HD</option>
                  <option value="360p">360p</option>
                  <option value="720p">720p HD</option>
                  <option value="1080p">1080p</option>
                </select>
              </label>
            </div>
          </section>

          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Фон на стаята
            </p>
            {rooms.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">Няма налични фонове</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => patch({ studioRoomId: room.id })}
                    className={`overflow-hidden rounded-xl border text-left ${
                      draft.studioRoomId === room.id
                        ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/40'
                        : 'border-[var(--panel-border)]'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={room.imageUrl}
                      alt={room.name}
                      className="h-14 w-full object-cover"
                    />
                    <span className="block truncate px-1.5 py-1 text-[10px] font-medium">
                      {room.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="grid gap-2 sm:grid-cols-2">
            <Toggle
              label="Групова стая"
              checked={draft.isGroup}
              onChange={(v) => patch({ isGroup: v })}
              icon={Users}
            />
            <Toggle
              label="Включи камера при вход"
              checked={draft.videoOnJoin}
              onChange={(v) => patch({ videoOnJoin: v })}
              icon={Video}
            />
            <Toggle
              label="Разреши гости с линк"
              checked={draft.allowGuests}
              onChange={(v) =>
                patch({
                  allowGuests: v,
                  copyInvite: v ? draft.copyInvite : false,
                })
              }
              icon={Waves}
            />
            <Toggle
              label="Чакалня (waiting room)"
              checked={draft.waitingRoom}
              onChange={(v) => patch({ waitingRoom: v })}
            />
            <Toggle
              label="Авто превод ON"
              checked={draft.translationOn}
              onChange={(v) => patch({ translationOn: v })}
              icon={Sparkles}
            />
            <Toggle
              label="Запази чата"
              checked={draft.saveChat}
              onChange={(v) => patch({ saveChat: v })}
            />
            <Toggle
              label="Копирай invite линк"
              checked={draft.copyInvite}
              onChange={(v) => patch({ copyInvite: v })}
            />
            <Toggle
              label="Влез веднага след създаване"
              checked={draft.enterNow}
              onChange={(v) => patch({ enterNow: v })}
            />
          </section>

          <label className="block text-xs">
            <span className="mb-1 block text-[var(--muted)]">
              Изчезване на чата
            </span>
            <select
              className="ov-field"
              value={draft.disappearAfter}
              onChange={(e) =>
                patch({
                  disappearAfter: e.target
                    .value as CreateRoomDraft['disappearAfter'],
                })
              }
            >
              <option value="off">Чатът остава</option>
              <option value="1h">След 1 час</option>
              <option value="24h">След 24 часа</option>
              <option value="7d">След 7 дни</option>
            </select>
          </label>
        </div>

        <div className="flex gap-2 border-t border-[var(--panel-border)] p-4">
          <button
            type="button"
            className="ov-btn-ghost flex-1 justify-center"
            onClick={onClose}
            disabled={busy}
          >
            Отказ
          </button>
          <button
            type="button"
            className="ov-btn-primary flex-1 justify-center"
            disabled={busy}
            onClick={submit}
          >
            {busy ? 'Създаване…' : 'Създай стая'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
  icon: Icon,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  icon?: typeof Video
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl bg-[var(--chip)] px-3 py-2 text-xs">
      <span className="inline-flex items-center gap-1.5">
        {Icon ? <Icon className="h-3.5 w-3.5 text-[var(--muted)]" /> : null}
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  )
}
