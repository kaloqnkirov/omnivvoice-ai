'use client'

import { useMemo, useRef, useState } from 'react'
import {
  Camera,
  Globe2,
  MapPin,
  Pencil,
  Share2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import {
  PROFILE_MOODS,
  activeStories,
  createStory,
  getMood,
  type ProfileSocial,
  type UserStory,
} from '@/lib/profile-social'
import type { OmniUser, PresenceStatus } from '@/lib/user-store'
import { APP_LANGUAGES } from '@/lib/languages'

type Props = {
  open: boolean
  user: OmniUser
  social: ProfileSocial
  presence: PresenceStatus
  onClose: () => void
  onUpdateUser: (patch: Partial<OmniUser>) => void
  onUpdateSocial: (patch: Partial<ProfileSocial>) => void
  onPresenceChange: (presence: PresenceStatus) => void
  onOpenSettings: () => void
}

export default function ProfileHub({
  open,
  user,
  social,
  presence,
  onClose,
  onUpdateUser,
  onUpdateSocial,
  onPresenceChange,
  onOpenSettings,
}: Props) {
  const avatarRef = useRef<HTMLInputElement>(null)
  const storyRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<'me' | 'story' | 'edit'>('me')
  const [storyText, setStoryText] = useState('')
  const [viewing, setViewing] = useState<UserStory | null>(null)
  const [nameDraft, setNameDraft] = useState(user.displayName)
  const [fullDraft, setFullDraft] = useState(user.fullName)
  const [bioDraft, setBioDraft] = useState(social.bio)
  const [locDraft, setLocDraft] = useState(social.locationLabel)

  const liveStories = useMemo(
    () => activeStories(social.stories || []),
    [social.stories]
  )
  const mood = getMood(social.moodId)

  if (!open) return null

  function saveNames() {
    onUpdateUser({
      displayName: nameDraft.trim() || user.displayName,
      fullName: fullDraft.trim() || user.fullName,
    })
    onUpdateSocial({
      bio: bioDraft.trim(),
      locationLabel: locDraft.trim(),
    })
    setTab('me')
  }

  function addTextStory() {
    const text = storyText.trim()
    if (!text) return
    const story = createStory({ type: 'text', text })
    onUpdateSocial({ stories: [story, ...liveStories] })
    setStoryText('')
    setTab('story')
  }

  function removeStory(id: string) {
    onUpdateSocial({
      stories: (social.stories || []).filter((s) => s.id !== id),
    })
    if (viewing?.id === id) setViewing(null)
  }

  async function shareProfile() {
    const url = `${window.location.origin}/join?name=${encodeURIComponent(user.displayName)}`
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${user.displayName} · OmniVoice`,
          text: social.bio || 'Говори с мен на всеки език',
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        window.alert('Профил линкът е копиран')
      }
    } catch {
      await navigator.clipboard.writeText(url)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 px-3 py-3 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] shadow-2xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-teal-600/40 via-slate-900 to-indigo-900 px-5 pb-6 pt-4 text-white">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
              My Account
            </p>
            <button
              type="button"
              className="rounded-full bg-white/10 p-1.5 hover:bg-white/20"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              className="relative h-20 w-20 overflow-hidden rounded-full ring-2 ring-white/40"
              onClick={() => avatarRef.current?.click()}
              title="Смени снимка"
            >
              {user.avatarDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarDataUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-white/10 text-2xl font-bold">
                  {user.displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
              {liveStories.length ? (
                <span className="absolute inset-0 rounded-full ring-2 ring-amber-300 ring-offset-2 ring-offset-transparent" />
              ) : null}
              <span className="absolute inset-x-0 bottom-0 bg-black/50 py-0.5 text-center text-[9px]">
                <Camera className="mx-auto h-3 w-3" />
              </span>
            </button>
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => {
                  if (typeof reader.result === 'string') {
                    onUpdateUser({ avatarDataUrl: reader.result })
                  }
                }
                reader.readAsDataURL(file)
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-[family-name:var(--font-display)] text-xl font-semibold">
                {user.displayName}
              </p>
              <p className="truncate text-xs text-white/70">{user.fullName}</p>
              <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px]">
                {mood.emoji} {mood.labelBg}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/80">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
              <Sparkles className="h-3 w-3" />
              Streak {social.streakDays}д
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
              <MapPin className="h-3 w-3" />
              {social.locationLabel || 'Без локация'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
              <Globe2 className="h-3 w-3" />
              {social.publicProfile ? 'Public' : 'Private'}
            </span>
          </div>
        </div>

        <div className="flex gap-1 border-b border-[var(--panel-border)] px-3 py-2">
          {(
            [
              ['me', 'Профил'],
              ['story', 'Stories'],
              ['edit', 'Редакция'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 rounded-full px-2 py-1.5 text-[11px] font-semibold ${
                tab === id
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                  : 'text-[var(--muted)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {tab === 'me' ? (
            <>
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Как се чувствам
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {PROFILE_MOODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onUpdateSocial({ moodId: m.id })}
                      className={`rounded-xl px-1 py-2 text-center ${
                        social.moodId === m.id
                          ? 'bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/40'
                          : 'bg-[var(--chip)]'
                      }`}
                    >
                      <span className="text-lg">{m.emoji}</span>
                      <span className="mt-0.5 block text-[10px] text-[var(--muted)]">
                        {m.labelBg}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  About
                </p>
                <p className="text-sm">{social.bio || '—'}</p>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Presence
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ['online', 'Онлайн'],
                      ['writing', 'Пиша'],
                      ['in_call', 'В разговор'],
                      ['in_studio', 'В студио'],
                      ['offline', 'Офлайн'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onPresenceChange(id)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        presence === id
                          ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                          : 'bg-[var(--chip)] text-[var(--muted)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  className="ov-btn-ghost justify-center !py-2 text-xs"
                  onClick={() => void shareProfile()}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Сподели профил
                </button>
                <button
                  type="button"
                  className="ov-btn-ghost justify-center !py-2 text-xs"
                  onClick={() => {
                    onOpenSettings()
                    onClose()
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Всички настройки
                </button>
              </div>

              <label className="flex items-center justify-between rounded-xl bg-[var(--chip)] px-3 py-2 text-xs">
                <span>Public profile (като Snapchat)</span>
                <input
                  type="checkbox"
                  checked={social.publicProfile}
                  onChange={(e) =>
                    onUpdateSocial({ publicProfile: e.target.checked })
                  }
                />
              </label>
              <label className="flex items-center justify-between rounded-xl bg-[var(--chip)] px-3 py-2 text-xs">
                <span>Покажи studio vibe на „картата“</span>
                <input
                  type="checkbox"
                  checked={social.showOnMap}
                  onChange={(e) =>
                    onUpdateSocial({ showOnMap: e.target.checked })
                  }
                />
              </label>
            </>
          ) : null}

          {tab === 'story' ? (
            <>
              <p className="text-xs text-[var(--muted)]">
                Stories изчезват след 24ч — като Snapchat, плюс двуезичен caption
                в чата.
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  className="flex h-20 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--chip)] text-[11px]"
                  onClick={() => storyRef.current?.click()}
                >
                  <Camera className="mb-1 h-4 w-4" />
                  Снимка
                </button>
                {liveStories.map((story) => (
                  <button
                    key={story.id}
                    type="button"
                    className="relative h-20 w-16 shrink-0 overflow-hidden rounded-2xl ring-2 ring-amber-400/50"
                    onClick={() => setViewing(story)}
                  >
                    {story.type === 'image' && story.imageDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={story.imageDataUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center bg-gradient-to-br from-teal-500 to-indigo-700 px-1 text-center text-[9px] text-white">
                        {story.text?.slice(0, 24)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <input
                ref={storyRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => {
                    if (typeof reader.result === 'string') {
                      const story = createStory({
                        type: 'image',
                        imageDataUrl: reader.result,
                        text: storyText.trim() || undefined,
                      })
                      onUpdateSocial({ stories: [story, ...liveStories] })
                      setStoryText('')
                    }
                  }
                  reader.readAsDataURL(file)
                  e.target.value = ''
                }}
              />
              <textarea
                className="ov-field min-h-[72px] text-sm"
                placeholder="Текстова story…"
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
              />
              <button
                type="button"
                className="ov-btn-primary w-full !py-2 text-xs"
                onClick={addTextStory}
              >
                Публикувай Story
              </button>

              {viewing ? (
                <div className="space-y-2 rounded-2xl border border-[var(--panel-border)] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">Преглед</p>
                    <button
                      type="button"
                      className="text-rose-500"
                      onClick={() => removeStory(viewing.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {viewing.type === 'image' && viewing.imageDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={viewing.imageDataUrl}
                      alt=""
                      className="max-h-48 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <p className="rounded-xl bg-[var(--chip)] p-3 text-sm">
                      {viewing.text}
                    </p>
                  )}
                  <p className="text-[10px] text-[var(--muted)]">
                    Изтича {new Date(viewing.expiresAt).toLocaleString()}
                  </p>
                </div>
              ) : null}
            </>
          ) : null}

          {tab === 'edit' ? (
            <div className="space-y-3">
              <label className="block text-xs">
                <span className="mb-1 block text-[var(--muted)]">
                  Показвано име
                </span>
                <input
                  className="ov-field"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block text-[var(--muted)]">Пълно име</span>
                <input
                  className="ov-field"
                  value={fullDraft}
                  onChange={(e) => setFullDraft(e.target.value)}
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block text-[var(--muted)]">Bio</span>
                <textarea
                  className="ov-field min-h-[70px]"
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value)}
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block text-[var(--muted)]">
                  Локация / studio vibe
                </span>
                <input
                  className="ov-field"
                  value={locDraft}
                  onChange={(e) => setLocDraft(e.target.value)}
                  placeholder="напр. София · Rooftop"
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block text-[var(--muted)]">Език</span>
                <select
                  className="ov-field"
                  value={user.nativeLanguage}
                  onChange={(e) =>
                    onUpdateUser({ nativeLanguage: e.target.value })
                  }
                >
                  {APP_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.nativeName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs">
                <span className="mb-1 block text-[var(--muted)]">Компания</span>
                <input
                  className="ov-field"
                  value={user.company}
                  onChange={(e) => onUpdateUser({ company: e.target.value })}
                />
              </label>
              <button
                type="button"
                className="ov-btn-primary w-full !py-2 text-xs"
                onClick={saveNames}
              >
                Запази промените
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
