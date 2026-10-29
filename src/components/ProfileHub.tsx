'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Camera,
  Globe2,
  MapPin,
  Pencil,
  Settings2,
  Share2,
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
import AvatarStudio from '@/components/AvatarStudio'

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

type SectionId = 'about' | 'details' | 'mood' | null

function SectionHead({
  title,
  onEdit,
}: {
  title: string
  onEdit?: () => void
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="text-[15px] font-bold text-[var(--text)]">{title}</h3>
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--chip)] text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
          title="Редакция"
          aria-label={`Редактирай ${title}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
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
  const storyRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState<SectionId>(null)
  const [avatarStudioOpen, setAvatarStudioOpen] = useState(false)
  const [storyText, setStoryText] = useState('')
  const [viewing, setViewing] = useState<UserStory | null>(null)
  const [nameDraft, setNameDraft] = useState(user.displayName)
  const [fullDraft, setFullDraft] = useState(user.fullName)
  const [bioDraft, setBioDraft] = useState(social.bio)
  const [locDraft, setLocDraft] = useState(social.locationLabel)
  const [companyDraft, setCompanyDraft] = useState(user.company || '')

  const [liveStories, setLiveStories] = useState(social.stories || [])
  useEffect(() => {
    setLiveStories(activeStories(social.stories || []))
  }, [social.stories])

  useEffect(() => {
    if (!open) return
    setNameDraft(user.displayName)
    setFullDraft(user.fullName)
    setBioDraft(social.bio)
    setLocDraft(social.locationLabel)
    setCompanyDraft(user.company || '')
    setEditing(null)
  }, [open, user.displayName, user.fullName, user.company, social.bio, social.locationLabel])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editing) setEditing(null)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, editing, onClose])

  const mood = getMood(social.moodId)

  if (!open) return null

  function saveAbout() {
    onUpdateUser({
      displayName: nameDraft.trim() || user.displayName,
      fullName: fullDraft.trim() || user.fullName,
    })
    onUpdateSocial({ bio: bioDraft.trim() })
    setEditing(null)
  }

  function saveDetails() {
    onUpdateSocial({ locationLabel: locDraft.trim() })
    onUpdateUser({ company: companyDraft.trim() })
    setEditing(null)
  }

  function addTextStory() {
    const text = storyText.trim()
    if (!text) return
    const story = createStory({ type: 'text', text })
    onUpdateSocial({ stories: [story, ...liveStories] })
    setStoryText('')
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
      await navigator.clipboard.writeText(url).catch(() => undefined)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 px-0 py-0 backdrop-blur-[2px] sm:items-center sm:px-3 sm:py-3"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div
        className="flex max-h-[min(96vh,96dvh)] w-full max-w-xl min-h-0 flex-col overflow-hidden rounded-t-2xl border border-[var(--panel-border)] bg-[var(--panel)] shadow-2xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Профил"
      >
        {/* Cover — Facebook-like */}
        <div className="relative shrink-0">
          <div className="h-36 bg-gradient-to-br from-sky-600 via-indigo-700 to-slate-900 sm:h-44" />
          <button
            type="button"
            className="absolute right-3 top-3 rounded-full bg-black/45 p-2 text-white hover:bg-black/60"
            onClick={onClose}
            aria-label="Затвори"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute -bottom-12 left-4 flex items-end gap-3 sm:left-5">
            <button
              type="button"
              className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-[var(--panel)] bg-[var(--chip)] shadow-lg"
              onClick={() => setAvatarStudioOpen(true)}
              title="Смени снимката"
            >
              {user.avatarDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarDataUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-[var(--muted)]">
                  {user.displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="absolute bottom-1 right-1 rounded-full bg-[var(--panel)] p-1.5 shadow">
                <Camera className="h-3.5 w-3.5 text-[var(--text)]" />
              </span>
            </button>
          </div>
        </div>

        <div className="ov-scroll min-h-0 flex-1 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-14 sm:px-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold leading-tight text-[var(--text)]">
                {user.displayName}
              </h1>
              {user.fullName && user.fullName !== user.displayName ? (
                <p className="truncate text-sm text-[var(--muted)]">
                  {user.fullName}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-[var(--muted)]">
                {mood.emoji} {mood.labelBg}
                {social.locationLabel ? ` · ${social.locationLabel}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-[var(--chip)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:brightness-95"
                onClick={() => setEditing(editing === 'about' ? null : 'about')}
              >
                Редактирай профила
              </button>
              <button
                type="button"
                className="rounded-lg bg-[var(--chip)] p-2 text-[var(--muted)] hover:text-[var(--text)]"
                onClick={() => void shareProfile()}
                title="Сподели"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* About */}
          <section className="mb-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-3">
            <SectionHead
              title="За мен"
              onEdit={() => setEditing(editing === 'about' ? null : 'about')}
            />
            {editing === 'about' ? (
              <div className="space-y-2">
                <input
                  className="ov-field text-sm"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="Показвано име"
                />
                <input
                  className="ov-field text-sm"
                  value={fullDraft}
                  onChange={(e) => setFullDraft(e.target.value)}
                  placeholder="Пълно име"
                />
                <textarea
                  className="ov-field min-h-[72px] text-sm"
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value)}
                  placeholder="Биография"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="ov-btn-primary flex-1 !py-2 text-xs"
                    onClick={saveAbout}
                  >
                    Запази
                  </button>
                  <button
                    type="button"
                    className="ov-btn-ghost !py-2 text-xs"
                    onClick={() => setEditing(null)}
                  >
                    Отказ
                  </button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm text-[var(--text)]">
                {social.bio || 'Добави кратко описание за себе си.'}
              </p>
            )}
          </section>

          {/* Details */}
          <section className="mb-4 rounded-xl border border-[var(--panel-border)] p-3">
            <SectionHead
              title="Данни"
              onEdit={() =>
                setEditing(editing === 'details' ? null : 'details')
              }
            />
            {editing === 'details' ? (
              <div className="space-y-2">
                <label className="block text-xs">
                  <span className="mb-1 flex items-center gap-1 text-[var(--muted)]">
                    <MapPin className="h-3 w-3" /> Локация
                  </span>
                  <input
                    className="ov-field"
                    value={locDraft}
                    onChange={(e) => setLocDraft(e.target.value)}
                  />
                </label>
                <label className="block text-xs">
                  <span className="mb-1 block text-[var(--muted)]">Компания</span>
                  <input
                    className="ov-field"
                    value={companyDraft}
                    onChange={(e) => setCompanyDraft(e.target.value)}
                  />
                </label>
                <label className="block text-xs">
                  <span className="mb-1 flex items-center gap-1 text-[var(--muted)]">
                    <Globe2 className="h-3 w-3" /> Език
                  </span>
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
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="ov-btn-primary flex-1 !py-2 text-xs"
                    onClick={saveDetails}
                  >
                    Запази
                  </button>
                  <button
                    type="button"
                    className="ov-btn-ghost !py-2 text-xs"
                    onClick={() => setEditing(null)}
                  >
                    Отказ
                  </button>
                </div>
              </div>
            ) : (
              <ul className="space-y-1.5 text-sm text-[var(--text)]">
                <li className="flex items-center gap-2 text-[var(--muted)]">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {social.locationLabel || 'Няма локация'}
                </li>
                <li className="flex items-center gap-2 text-[var(--muted)]">
                  <Globe2 className="h-3.5 w-3.5 shrink-0" />
                  {
                    APP_LANGUAGES.find((l) => l.code === user.nativeLanguage)
                      ?.nativeName
                  }
                </li>
                {user.company ? (
                  <li className="text-[var(--muted)]">{user.company}</li>
                ) : null}
              </ul>
            )}
          </section>

          {/* Mood */}
          <section className="mb-4 rounded-xl border border-[var(--panel-border)] p-3">
            <SectionHead
              title="Настроение"
              onEdit={() => setEditing(editing === 'mood' ? null : 'mood')}
            />
            {editing === 'mood' ? (
              <div className="grid grid-cols-4 gap-2">
                {PROFILE_MOODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onUpdateSocial({ moodId: m.id })
                      setEditing(null)
                    }}
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
            ) : (
              <p className="text-sm">
                {mood.emoji} {mood.labelBg}
              </p>
            )}
          </section>

          {/* Stories */}
          <section className="mb-4 rounded-xl border border-[var(--panel-border)] p-3">
            <SectionHead title="Stories" />
            <div className="ov-scroll-x mb-2 flex gap-2 pb-1">
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
                  className="relative h-20 w-16 shrink-0 overflow-hidden rounded-2xl ring-2 ring-sky-400/40"
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
                    <span className="flex h-full items-center justify-center bg-gradient-to-br from-sky-500 to-indigo-700 px-1 text-center text-[9px] text-white">
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
            <div className="flex gap-2">
              <input
                className="ov-field flex-1 text-sm"
                placeholder="Текстова story…"
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
              />
              <button
                type="button"
                className="ov-btn-primary shrink-0 !px-3 !py-2 text-xs"
                onClick={addTextStory}
              >
                Публикувай
              </button>
            </div>
            {viewing ? (
              <div className="mt-2 space-y-2 rounded-xl bg-[var(--chip)] p-3">
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
                    className="max-h-40 w-full rounded-lg object-cover"
                  />
                ) : (
                  <p className="text-sm">{viewing.text}</p>
                )}
              </div>
            ) : null}
          </section>

          {/* Privacy + app settings */}
          <section className="mb-2 space-y-2 rounded-xl border border-[var(--panel-border)] p-3">
            <SectionHead title="Поверителност" />
            <label className="flex items-center justify-between text-sm">
              <span>Публичен профил</span>
              <input
                type="checkbox"
                checked={social.publicProfile}
                onChange={(e) =>
                  onUpdateSocial({ publicProfile: e.target.checked })
                }
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Покажи на картата</span>
              <input
                type="checkbox"
                checked={social.showOnMap}
                onChange={(e) =>
                  onUpdateSocial({ showOnMap: e.target.checked })
                }
              />
            </label>
            <div>
              <p className="mb-1.5 text-xs text-[var(--muted)]">Статус</p>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['online', 'Онлайн'],
                    ['writing', 'Пиша'],
                    ['in_call', 'В разговор'],
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
            <button
              type="button"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--chip)] py-2.5 text-sm font-semibold text-[var(--text)]"
              onClick={() => onOpenSettings()}
            >
              <Settings2 className="h-4 w-4" />
              Настройки на приложението
            </button>
          </section>
        </div>
      </div>

      <AvatarStudio
        open={avatarStudioOpen}
        currentAvatar={user.avatarDataUrl}
        onClose={() => setAvatarStudioOpen(false)}
        onApply={(dataUrl, gallery) => {
          onUpdateUser({
            avatarDataUrl: dataUrl,
            avatarGallery: gallery,
          })
        }}
      />
    </div>
  )
}
