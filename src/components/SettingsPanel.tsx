'use client'

import { startTransition, useEffect, useMemo, useState } from 'react'
import {
  Bell,
  BookOpen,
  Clapperboard,
  Copy,
  Globe2,
  Headphones,
  Link2,
  MessageCircle,
  Moon,
  Music2,
  Phone,
  Radio,
  Settings2,
  Shield,
  Sparkles,
  Sun,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { APP_LANGUAGES, PLANS, planAllowsSecretary } from '@/lib/languages'
import { settingsTabsForPlan } from '@/lib/plan-modes'
import { tracksForPlan, type MusicTrack } from '@/lib/music'
import { STREAM_PLATFORMS, type StreamPlatformId } from '@/lib/platforms'
import {
  CAPTION_STYLES,
  CHAT_MODES,
  LATENCY_MODES,
  PIP_CORNERS,
  STREAM_SCENES,
  STREAMING_OPTION_GROUPS,
  contentHintForScene,
  type CaptionStyleId,
  type LatencyMode,
  type PipCorner,
  type StreamChatMode,
  type StreamSceneId,
  type StreamingSettings,
} from '@/lib/streaming'
import {
  BUSINESS_ROOM_PRESETS,
  CONTRACT_COMPOSE_FROM,
  DEFAULT_BUSINESS_ROOM,
  type ContractComposeFrom,
} from '@/lib/business-presets'
import {
  AD_FORMATS,
  AD_PLACEMENTS,
  DEFAULT_ADS,
  newCreativeId,
  type AdFormat,
  type AdPlacement,
  type AdsSettings,
} from '@/lib/ads'
import { BUSINESS_INTEL_OPTIONS } from '@/lib/business-intel'
import {
  parseSpotifyUrl,
  spotifySearchUrl,
  SPOTIFY_QUICK_PICKS,
} from '@/lib/spotify'
import type {
  AppPreferences,
  ChatSettings,
  ExperienceSettings,
  MusicSettings,
  NotificationSettings,
  Phrase,
  PodcastSettings,
  RoomSettings,
  Subscriber,
  VoiceSettings,
  WebsiteChannel,
  WebsiteConnection,
} from '@/lib/user-store'
import {
  buildIframeSnippet,
  buildScriptSnippet,
  createSiteKey,
} from '@/lib/website-embed'
import {
  THEME_OPTIONS,
  type AppearanceSettings,
  type ThemeId,
} from '@/lib/appearance'
import { isClientBackendEnabled, signOutBackend } from '@/lib/auth-client'
import { guestInviteUrl } from '@/lib/invite-url'
import { createServerGuestInvite } from '@/lib/create-guest-invite'
import {
  VOICE_PRESETS,
  resolveVoicePreset,
  type VoicePresetId,
} from '@/lib/voice-presets'
import {
  speakVoicePresetSample,
  unlockSpeechSynthesis,
} from '@/lib/translation'
import { enableAllCoachmarks } from '@/lib/coachmarks'
import { useTheme } from '@/lib/theme'
import { isAdminUser } from '@/lib/access'
import AdminPlanGrantsPanel from '@/components/AdminPlanGrantsPanel'
import ShareGrowPanel from '@/components/ShareGrowPanel'

type Tab =
  | 'account'
  | 'websites'
  | 'room'
  | 'chat'
  | 'podcast'
  | 'platforms'
  | 'guests'
  | 'voice'
  | 'music'
  | 'privacy'
  | 'notifications'
  | 'phrasebook'
  | 'subscribers'
  | 'secretary'
  | 'experience'

type SettingsScope = 'room' | 'full'

const ROOM_SCOPE_TABS: Array<{ id: Tab; label: string }> = [
  { id: 'room', label: 'Стая / A/V' },
  { id: 'guests', label: 'Guest линк' },
  { id: 'voice', label: 'Микрофон / език' },
]

type SettingsPanelProps = {
  open: boolean
  onClose: () => void
  onOpenRegister: () => void
  /** Open on a specific tab (e.g. room vs full fine-tuning) */
  initialTab?: Tab
  /** room = само жива стая; full = всички фини настройки */
  scope?: SettingsScope
}

export default function SettingsPanel({
  open,
  onClose,
  onOpenRegister,
  initialTab = 'account',
  scope = 'full',
}: SettingsPanelProps) {
  const { theme, toggleTheme, prefs, updatePrefs, setAppearance, appearance } =
    useTheme()
  const [tab, setTab] = useState<Tab>(initialTab)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [newSubName, setNewSubName] = useState('')
  const [newSubContact, setNewSubContact] = useState('')
  const [newPhrase, setNewPhrase] = useState('')
  const [copied, setCopied] = useState(false)
  const [copiedEmbedId, setCopiedEmbedId] = useState<string | null>(null)
  const [siteName, setSiteName] = useState('Моят сайт')
  const [siteDomain, setSiteDomain] = useState('mysite.bg')
  const [siteChannel, setSiteChannel] = useState<WebsiteChannel>('both')
  const [platformFilter, setPlatformFilter] = useState<
    'all' | 'video' | 'social' | 'audio' | 'community' | 'watch'
  >('all')

  const [mediaDevices, setMediaDevices] = useState<{
    audioIn: MediaDeviceInfo[]
    videoIn: MediaDeviceInfo[]
    audioOut: MediaDeviceInfo[]
  }>({ audioIn: [], videoIn: [], audioOut: [] })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const load = () => setVoices(window.speechSynthesis.getVoices())
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [])

  useEffect(() => {
    if (!open || typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return
    }
    void navigator.mediaDevices
      .enumerateDevices()
      .then((list) => {
        setMediaDevices({
          audioIn: list.filter((d) => d.kind === 'audioinput'),
          videoIn: list.filter((d) => d.kind === 'videoinput'),
          audioOut: list.filter((d) => d.kind === 'audiooutput'),
        })
      })
      .catch(() => undefined)
  }, [open])

  const plan = prefs.user?.plan || 'free'
  const musicTracks = useMemo(() => tracksForPlan(plan), [plan])
  const visibleTabs = useMemo(() => {
    if (scope === 'room') return ROOM_SCOPE_TABS
    return settingsTabsForPlan(plan) as Array<{ id: Tab; label: string }>
  }, [plan, scope])

  useEffect(() => {
    if (!open) return
    if (scope === 'room') {
      setTab(
        ROOM_SCOPE_TABS.some((t) => t.id === initialTab)
          ? initialTab
          : 'room'
      )
      return
    }
    setTab(initialTab)
  }, [open, initialTab, scope])

  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === tab)) {
      setTab(visibleTabs[0]?.id || 'account')
    }
  }, [visibleTabs, tab])

  // Voice others hear you with — pick a voice in the language they listen in
  const speakAsLangCode = prefs.voice.targetLanguage || 'en'
  const filteredVoices = useMemo(() => {
    const target = APP_LANGUAGES.find((lang) => lang.code === speakAsLangCode)
    if (!target) return voices
    const matched = voices.filter((voice) =>
      voice.lang.toLowerCase().startsWith(target.code)
    )
    return matched.length ? matched : voices
  }, [voices, speakAsLangCode])

  const platforms = useMemo(() => {
    if (platformFilter === 'all') return STREAM_PLATFORMS
    return STREAM_PLATFORMS.filter((p) => p.category === platformFilter)
  }, [platformFilter])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const user = prefs.user
  const canSecretary = user ? planAllowsSecretary(user.plan) : false
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'
  const latestInvite = (prefs.invites || []).find((i) => i.active !== false)
  const guestUrl = latestInvite
    ? `${origin}/join?invite=${encodeURIComponent(latestInvite.code)}&conv=${encodeURIComponent(latestInvite.conversationId)}&channel=${latestInvite.channel || 'both'}`
    : isClientBackendEnabled()
      ? 'Натисни „Копирай invite линк“ за нова покана'
      : `${origin}/join?invite=${encodeURIComponent(prefs.room.guestLinkCode)}&conv=&channel=both`
  const siteGuestHint = prefs.websites[0]
    ? `${origin}/join?site=${encodeURIComponent(prefs.websites[0].siteKey)}&channel=both`
    : guestUrl
  const connectedCount = Object.values(prefs.podcast.platforms).filter(
    (p) => p.connected
  ).length

  function patchRoom(patch: Partial<RoomSettings>) {
    startTransition(() => updatePrefs((current) => ({ room: patch })))
  }
  function patchChat(patch: Partial<ChatSettings>) {
    startTransition(() => updatePrefs((current) => ({ chat: patch })))
  }
  function patchPodcast(patch: Partial<PodcastSettings>) {
    startTransition(() =>
      updatePrefs((current) => ({
        podcast: { ...current.podcast, ...patch },
      }))
    )
  }
  function patchStreaming(patch: Partial<StreamingSettings>) {
    startTransition(() =>
      updatePrefs((current) => ({
        podcast: {
          ...current.podcast,
          streaming: { ...current.podcast.streaming, ...patch },
        },
      }))
    )
  }
  function patchPlatform(
    id: StreamPlatformId,
    patch: Partial<PodcastSettings['platforms'][StreamPlatformId]>
  ) {
    startTransition(() =>
      updatePrefs((current) => ({
        podcast: {
          ...current.podcast,
          platforms: {
            ...current.podcast.platforms,
            [id]: { ...current.podcast.platforms[id], ...patch },
          },
        },
      }))
    )
  }
  function patchNotifications(patch: Partial<NotificationSettings>) {
    startTransition(() =>
      updatePrefs((current) => ({ notifications: patch }))
    )
  }
  function patchVoice(patch: Partial<VoiceSettings>) {
    startTransition(() => updatePrefs((current) => ({ voice: patch })))
  }
  function patchMusic(patch: Partial<MusicSettings>) {
    startTransition(() => updatePrefs((current) => ({ music: patch })))
  }
  function patchExperience(patch: Partial<ExperienceSettings>) {
    startTransition(() =>
      updatePrefs((current) => ({
        experience: { ...current.experience, ...patch },
      }))
    )
  }
  function patchAds(patch: Partial<AdsSettings>) {
    startTransition(() =>
      updatePrefs((current) => ({
        ads: {
          ...(current.ads || DEFAULT_ADS),
          ...patch,
        },
      }))
    )
  }
  function patchUser(patch: Partial<NonNullable<AppPreferences['user']>>) {
    updatePrefs((current) => {
      if (!current.user) return {}
      return { user: { ...current.user, ...patch } }
    })
  }

  function addSubscriber() {
    if (!newSubName.trim()) return
    const subscriber: Subscriber = {
      id: `sub_${Date.now()}`,
      name: newSubName.trim(),
      email: newSubContact.includes('@') ? newSubContact.trim() : '',
      phone: newSubContact.includes('@') ? '' : newSubContact.trim(),
      language: prefs.user?.nativeLanguage || 'bg',
      status: 'invited',
      plan: 'free',
      presence: 'offline',
    }
    updatePrefs((current) => ({
      subscribers: [subscriber, ...current.subscribers],
    }))
    setNewSubName('')
    setNewSubContact('')
  }

  function addPhrase() {
    if (!newPhrase.trim()) return
    const phrase: Phrase = {
      id: `ph_${Date.now()}`,
      category: 'general',
      text: newPhrase.trim(),
      language: prefs.user?.nativeLanguage || 'bg',
    }
    updatePrefs((current) => ({
      experience: {
        ...current.experience,
        phrasebook: [phrase, ...current.experience.phrasebook],
      },
    }))
    setNewPhrase('')
  }

  async function copyGuestLink() {
    try {
      const activeConv = prefs.conversations.find((c) => c.sessionOpen !== false)
      const result = await createServerGuestInvite({
        roomId: activeConv?.id,
        roomTitle: activeConv?.title || prefs.room.name || 'Guest room',
        label: 'Guest invite',
        channel: 'both',
      })
      if (!result.ok) {
        window.alert(result.error)
        return
      }
      updatePrefs((current) => {
        const hasConv = current.conversations.some(
          (c) => c.id === result.roomId || c.id === result.migratedFrom
        )
        return {
          invites: [
            {
              id: result.inviteId,
              code: result.code,
              conversationId: result.roomId,
              label: result.label,
              channel: 'both' as const,
              createdAt: new Date().toISOString(),
              active: true,
            },
            ...(current.invites || []),
          ],
          room: { ...current.room, allowGuests: true },
          conversations: hasConv
            ? current.conversations.map((c) =>
                c.id === result.roomId || c.id === result.migratedFrom
                  ? {
                      ...c,
                      id: result.roomId,
                      sessionOpen: true,
                      space: 'room' as const,
                    }
                  : c
              )
            : [
                {
                  id: result.roomId,
                  title: activeConv?.title || prefs.room.name || 'Guest room',
                  isGroup: true,
                  space: 'room' as const,
                  members: activeConv?.members || [],
                  lastMessage: 'Сървърна стая готова за гости',
                  updatedAt: new Date().toISOString(),
                  unread: 0,
                  pinned: false,
                  muted: false,
                  messages: activeConv?.messages || [],
                  saveChat: true,
                  disappearAfter: 'off' as const,
                  sessionOpen: true,
                  activeGuestIds: [],
                  joinRequests: [],
                },
                ...current.conversations,
              ],
        }
      })
      await navigator.clipboard.writeText(result.url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch (err) {
      setCopied(false)
      window.alert(
        err instanceof Error ? err.message : 'Копирането не успя'
      )
    }
  }

  function addWebsite() {
    const domain = siteDomain.trim().replace(/^https?:\/\//, '')
    if (!domain) return
    const site: WebsiteConnection = {
      id: `web_${Date.now()}`,
      name: siteName.trim() || domain,
      domain,
      siteKey: createSiteKey(domain),
      enabled: true,
      channel: siteChannel,
      welcomeMessage: 'Здравей! Пиши или звънни — превеждаме на живо.',
      hostLanguage: prefs.user?.nativeLanguage || 'bg',
      visitorDefaultLanguage: 'en',
      position: 'bottom-right',
      showBranding: true,
      onlineLabel: 'Онлайн сега',
      createdAt: new Date().toISOString(),
    }
    updatePrefs({ websites: [site, ...prefs.websites] })
  }

  function patchWebsite(
    id: string,
    patch: Partial<WebsiteConnection>
  ) {
    updatePrefs({
      websites: prefs.websites.map((site) =>
        site.id === id ? { ...site, ...patch } : site
      ),
    })
  }

  async function copyEmbed(site: WebsiteConnection, kind: 'script' | 'iframe') {
    const text =
      kind === 'script'
        ? buildScriptSnippet(origin, site)
        : buildIframeSnippet(origin, site)
    try {
      await navigator.clipboard.writeText(text)
      setCopiedEmbedId(`${site.id}-${kind}`)
      window.setTimeout(() => setCopiedEmbedId(null), 1600)
    } catch {
      setCopiedEmbedId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex justify-end overflow-hidden bg-black/45 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="presentation"
    >
      <aside
        className="ov-panel flex h-full min-h-0 w-full max-w-xl flex-col overflow-hidden border-l border-[var(--panel-border)] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Настройки"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--panel-border)] px-5 py-4">
          <div>
            <p className="ov-kicker">
              {scope === 'room'
                ? 'Room setup'
                : initialTab === 'music'
                  ? 'Audio'
                  : 'Control center'}
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              {scope === 'room'
                ? 'Настройки на стая'
                : initialTab === 'music' && scope === 'full'
                  ? 'Звук и музика'
                  : 'Настройки на приложението'}
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {scope === 'room'
                ? 'Камера · микрофон · guest линк · качество'
                : initialTab === 'music'
                  ? 'Амбиент писти и аудио предпочитания'
                  : `Акаунт · чат · теми · ${connectedCount} платформи`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {scope === 'full' ? (
              <button type="button" onClick={toggleTheme} className="ov-icon-btn">
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="ov-icon-btn"
              aria-label="Затвори настройките"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="ov-scroll-x flex shrink-0 gap-1 border-b border-[var(--panel-border)] px-3 py-2">
          {visibleTabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                tab === id
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                  : 'text-[var(--muted)] hover:bg-[var(--chip)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ov-scroll min-h-0 flex-1 px-5 py-4 pb-10">
          {tab === 'account' && (
            <div className="space-y-4">
              {user ? (
                <>
                  <InfoRow label="Име" value={user.fullName} />
                  <InfoRow label="Display" value={user.displayName} />
                  <InfoRow
                    label="Контакт"
                    value={
                      user.contactMethod === 'email'
                        ? user.email || '—'
                        : user.phone || '—'
                    }
                  />
                  <Field label="Твоят език">
                    <select
                      className="ov-field"
                      value={user.nativeLanguage}
                      onChange={(e) =>
                        patchUser({ nativeLanguage: e.target.value })
                      }
                    >
                      {APP_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.flag} · {lang.nativeName}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <InfoRow label="План" value={PLANS[user.plan].label} />
                  {isAdminUser(user) ? (
                    <AdminPlanGrantsPanel
                      grants={prefs.adminPlanGrants || []}
                      currentUser={user}
                      subscribers={prefs.subscribers}
                      onChangeGrants={(next) =>
                        updatePrefs(() => ({ adminPlanGrants: next }))
                      }
                      onUserUpdated={(nextUser) =>
                        updatePrefs(() => ({ user: nextUser }))
                      }
                    />
                  ) : null}
                  <ShareGrowPanel
                    hostId={user.id}
                    hostName={user.displayName || user.fullName}
                  />
                  <div className="rounded-2xl border border-sky-500/25 bg-sky-500/5 p-3 text-[11px] text-[var(--muted)]">
                    Бонус Cloud превод:{' '}
                    <strong className="text-[var(--foreground)]">
                      {(prefs.translateBonusChars || 0).toLocaleString('bg-BG')}{' '}
                      символа
                    </strong>
                    {' '}
                    (~$
                    {(
                      ((prefs.translateBonusChars || 0) / 1_000_000) *
                      20
                    ).toFixed(0)}
                    )
                    {(prefs.referralInvitesClaimed || 0) > 0
                      ? ` · от ${prefs.referralInvitesClaimed} покани`
                      : ' · покана +200k · инсталация +150k (еднократно) · таван ~2M'}
                    . Към Business/Podcast квотата; на Normal отключва Cloud
                    докато има бонус.
                  </div>
                  <div className="rounded-2xl border border-amber-400/25 bg-amber-500/5 p-3 space-y-2">
                    <p className="text-xs font-semibold">Обучение</p>
                    <p className="text-[10px] text-[var(--muted)]">
                      Стартово обучение при инсталация + балончета „Как се ползва“
                      при клик на опции.
                    </p>
                    <button
                      type="button"
                      className="ov-btn-primary w-full !py-2 text-xs"
                      onClick={() => {
                        enableAllCoachmarks()
                        window.dispatchEvent(
                          new Event('omnivvoice:onboarding')
                        )
                      }}
                    >
                      Покажи стартовото обучение отново
                    </button>
                  </div>
                  <div className="rounded-2xl border border-rose-400/25 bg-rose-500/5 p-3 space-y-2">
                    <p className="text-xs font-semibold">Случайни запознанства</p>
                    <p className="text-[10px] text-[var(--muted)]">
                      По подразбиране е изключено. Ако го пуснеш, се появява бутон
                      за мачване — възраст, откъде си, занимание, мъж/жена/и двете.
                      Само хора с включена опция. ♥ = покана за чат · ✕ = следващ.
                    </p>
                    <ToggleRow
                      label="Включи случайни запознанства"
                      checked={Boolean(prefs.meetMatch?.enabled)}
                      onChange={(v) =>
                        updatePrefs((current) => ({
                          meetMatch: {
                            ...(current.meetMatch || {
                              enabled: false,
                              profile: null,
                              passedIds: [],
                              likedIds: [],
                              matchedIds: [],
                              rejectedIds: [],
                            }),
                            enabled: v,
                          },
                        }))
                      }
                    />
                  </div>
                  <Field label="Компания">
                    <input
                      className="ov-field"
                      value={user.company}
                      onChange={(e) => patchUser({ company: e.target.value })}
                    />
                  </Field>
                  <button
                    type="button"
                    className="ov-btn-ghost w-full"
                    onClick={() => {
                      void signOutBackend().finally(() => {
                        updatePrefs({ user: null })
                        onClose()
                        window.location.assign('/login')
                      })
                    }}
                  >
                    Изход
                  </button>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--panel-border)] p-4 text-center">
                  <Settings2 className="mx-auto h-6 w-6 text-[var(--accent)]" />
                  <p className="mt-2 text-sm">Нямаш акаунт още</p>
                  <button
                    type="button"
                    className="ov-btn-primary mt-4 w-full"
                    onClick={() => {
                      onClose()
                      onOpenRegister()
                    }}
                  >
                    Регистрация
                  </button>
                </div>
              )}
              <ThemeBlock
                theme={theme}
                appearance={appearance}
                onSelectTheme={(id) => setAppearance({ theme: id })}
                onAppearance={(patch) => setAppearance(patch)}
              />
            </div>
          )}

          {tab === 'websites' && (
            <div className="space-y-3">
              <SectionTitle icon={Globe2} title="Връзка към сайтове" />
              <p className="text-xs text-[var(--muted)]">
                Добави своя сайт и сложи OmniVoice като канал за комуникация —
                чат и/или обаждане с превод (като Intercom / Tawk, но с AI translate).
              </p>

              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--chip)] p-3 space-y-2">
                <Field label="Име на сайта">
                  <input
                    className="ov-field"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="Моят бранд"
                  />
                </Field>
                <Field label="Домейн">
                  <input
                    className="ov-field"
                    value={siteDomain}
                    onChange={(e) => setSiteDomain(e.target.value)}
                    placeholder="mysite.bg"
                  />
                </Field>
                <Field label="Канал на виджета">
                  <select
                    className="ov-field"
                    value={siteChannel}
                    onChange={(e) =>
                      setSiteChannel(e.target.value as WebsiteChannel)
                    }
                  >
                    <option value="both">Chat + Call</option>
                    <option value="chat">Само Chat</option>
                    <option value="call">Само Call</option>
                  </select>
                </Field>
                <button
                  type="button"
                  className="ov-btn-primary w-full"
                  onClick={addWebsite}
                >
                  Добави сайт
                </button>
              </div>

              {prefs.websites.map((site) => (
                <div
                  key={site.id}
                  className="rounded-2xl border border-[var(--panel-border)] bg-[var(--chip)] p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{site.name}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {site.domain} · {site.siteKey}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="ov-icon-btn"
                      title="Изтрий"
                      onClick={() =>
                        updatePrefs({
                          websites: prefs.websites.filter(
                            (item) => item.id !== site.id
                          ),
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <ToggleRow
                    label="Активен на сайта"
                    checked={site.enabled}
                    onChange={(checked) =>
                      patchWebsite(site.id, { enabled: checked })
                    }
                  />
                  <Field label="Welcome съобщение">
                    <input
                      className="ov-field"
                      value={site.welcomeMessage}
                      onChange={(e) =>
                        patchWebsite(site.id, {
                          welcomeMessage: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Твой език">
                      <select
                        className="ov-field"
                        value={site.hostLanguage}
                        onChange={(e) =>
                          patchWebsite(site.id, {
                            hostLanguage: e.target.value,
                          })
                        }
                      >
                        {APP_LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.flag} {lang.nativeName}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Език на посетителя">
                      <select
                        className="ov-field"
                        value={site.visitorDefaultLanguage}
                        onChange={(e) =>
                          patchWebsite(site.id, {
                            visitorDefaultLanguage: e.target.value,
                          })
                        }
                      >
                        {APP_LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.flag} {lang.nativeName}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Канал">
                      <select
                        className="ov-field"
                        value={site.channel}
                        onChange={(e) =>
                          patchWebsite(site.id, {
                            channel: e.target.value as WebsiteChannel,
                          })
                        }
                      >
                        <option value="both">Chat + Call</option>
                        <option value="chat">Chat</option>
                        <option value="call">Call</option>
                      </select>
                    </Field>
                    <Field label="Позиция">
                      <select
                        className="ov-field"
                        value={site.position}
                        onChange={(e) =>
                          patchWebsite(site.id, {
                            position: e.target
                              .value as WebsiteConnection['position'],
                          })
                        }
                      >
                        <option value="bottom-right">Долу вдясно</option>
                        <option value="bottom-left">Долу вляво</option>
                      </select>
                    </Field>
                  </div>
                  <ToggleRow
                    label="OmniVoice branding"
                    checked={site.showBranding}
                    onChange={(checked) =>
                      patchWebsite(site.id, { showBranding: checked })
                    }
                  />

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      className="ov-btn-primary"
                      disabled={!site.enabled}
                      onClick={() => void copyEmbed(site, 'script')}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copiedEmbedId === `${site.id}-script`
                        ? 'Копирано'
                        : 'Копирай script'}
                    </button>
                    <button
                      type="button"
                      className="ov-btn-ghost"
                      disabled={!site.enabled}
                      onClick={() => void copyEmbed(site, 'iframe')}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copiedEmbedId === `${site.id}-iframe`
                        ? 'Копирано'
                        : 'Копирай iframe'}
                    </button>
                  </div>
                  <a
                    className="block text-center text-xs text-[var(--accent)] underline"
                    href={`/embed?key=${encodeURIComponent(site.siteKey)}&name=${encodeURIComponent(site.name)}&domain=${encodeURIComponent(site.domain)}&channel=${site.channel}&welcome=${encodeURIComponent(site.welcomeMessage)}&hostLang=${site.hostLanguage}&visitorLang=${site.visitorDefaultLanguage}&branding=${site.showBranding ? '1' : '0'}&online=${encodeURIComponent(site.onlineLabel)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Прегледай виджета
                  </a>
                </div>
              ))}
            </div>
          )}

          {tab === 'room' && (
            <div className="space-y-3">
              <SectionTitle icon={Headphones} title="Настройки на стая" />
              <p className="text-xs text-[var(--muted)]">
                Име, камера, звук, качество и правила за гости в живата стая.
                За акаунт, чат, подкаст и теми ползвай „Всички фини настройки“.
              </p>
              <Field label="Име на стаята">
                <input
                  className="ov-field"
                  value={prefs.room.name}
                  onChange={(e) => patchRoom({ name: e.target.value })}
                />
              </Field>
              <Field label="Room ID">
                <input
                  className="ov-field"
                  value={prefs.room.roomId}
                  onChange={(e) => patchRoom({ roomId: e.target.value })}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Осветление">
                  <select
                    className="ov-field"
                    value={prefs.room.lighting}
                    onChange={(e) =>
                      patchRoom({
                        lighting: e.target.value as RoomSettings['lighting'],
                      })
                    }
                  >
                    <option value="soft">Soft</option>
                    <option value="studio">Studio</option>
                    <option value="neon">Neon</option>
                    <option value="cinematic">Cinematic</option>
                    <option value="daylight">Daylight</option>
                  </select>
                </Field>
                <Field label="Camera preset">
                  <select
                    className="ov-field"
                    value={prefs.room.cameraPreset}
                    onChange={(e) =>
                      patchRoom({
                        cameraPreset: e.target
                          .value as RoomSettings['cameraPreset'],
                      })
                    }
                  >
                    <option value="close">Close-up</option>
                    <option value="medium">Medium</option>
                    <option value="wide">Wide</option>
                    <option value="presenter">Presenter</option>
                  </select>
                </Field>
                <Field label="Frame rate">
                  <select
                    className="ov-field"
                    value={prefs.room.frameRate}
                    onChange={(e) =>
                      patchRoom({
                        frameRate: Number(
                          e.target.value
                        ) as RoomSettings['frameRate'],
                      })
                    }
                  >
                    <option value={24}>24 fps</option>
                    <option value={30}>30 fps</option>
                    <option value={60}>60 fps</option>
                  </select>
                </Field>
                <Field label="Live video quality">
                  <select
                    className="ov-field"
                    value={prefs.room.videoQuality || '1080p'}
                    onChange={(e) =>
                      patchRoom({
                        videoQuality: e.target
                          .value as RoomSettings['videoQuality'],
                      })
                    }
                  >
                    <option value="auto">Auto HD</option>
                    <option value="360p">360p · пести трафик</option>
                    <option value="720p">720p HD</option>
                    <option value="1080p">1080p Full HD</option>
                  </select>
                </Field>
                <Field label="Video filter">
                  <select
                    className="ov-field"
                    value={prefs.room.videoFilter || 'none'}
                    onChange={(e) =>
                      patchRoom({
                        videoFilter: e.target
                          .value as RoomSettings['videoFilter'],
                      })
                    }
                  >
                    <option value="none">Без филтър</option>
                    <option value="cinema">Cinema</option>
                    <option value="warm">Топъл</option>
                    <option value="cool">Студен</option>
                    <option value="soft">Мек</option>
                    <option value="vivid">Ярък</option>
                    <option value="noir">Noir</option>
                  </select>
                </Field>
                <Field label="Recording quality">
                  <select
                    className="ov-field"
                    value={prefs.room.recordingQuality}
                    onChange={(e) =>
                      patchRoom({
                        recordingQuality: e.target
                          .value as RoomSettings['recordingQuality'],
                      })
                    }
                  >
                    <option value="720p">720p</option>
                    <option value="1080p">1080p</option>
                    <option value="4k">4K</option>
                  </select>
                </Field>
                <Field label="Screen share">
                  <select
                    className="ov-field"
                    value={prefs.room.screenShareQuality}
                    onChange={(e) =>
                      patchRoom({
                        screenShareQuality: e.target
                          .value as RoomSettings['screenShareQuality'],
                      })
                    }
                  >
                    <option value="auto">Auto</option>
                    <option value="sharp">Sharp text</option>
                    <option value="smooth">Smooth motion</option>
                  </select>
                </Field>
                <Field label="Subtitle size">
                  <select
                    className="ov-field"
                    value={prefs.room.subtitleSize}
                    onChange={(e) =>
                      patchRoom({
                        subtitleSize: e.target
                          .value as RoomSettings['subtitleSize'],
                      })
                    }
                  >
                    <option value="s">Small</option>
                    <option value="m">Medium</option>
                    <option value="l">Large</option>
                  </select>
                </Field>
                <Field label="Макс. участници">
                  <input
                    className="ov-field"
                    type="number"
                    min={2}
                    max={100}
                    value={prefs.room.maxParticipants}
                    onChange={(e) =>
                      patchRoom({
                        maxParticipants: Number(e.target.value) || 8,
                      })
                    }
                  />
                </Field>
                <Field label="Микрофон">
                  <select
                    className="ov-field"
                    value={prefs.room.micDevice}
                    onChange={(e) => patchRoom({ micDevice: e.target.value })}
                  >
                    <option value="default">Системен по подразбиране</option>
                    {mediaDevices.audioIn.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Микрофон ${d.deviceId.slice(0, 6)}`}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Камера">
                  <select
                    className="ov-field"
                    value={prefs.room.cameraDevice}
                    onChange={(e) =>
                      patchRoom({ cameraDevice: e.target.value })
                    }
                  >
                    <option value="default">Системна по подразбиране</option>
                    {mediaDevices.videoIn.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Камера ${d.deviceId.slice(0, 6)}`}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Спийкъри">
                  <select
                    className="ov-field"
                    value={prefs.room.speakerDevice}
                    onChange={(e) =>
                      patchRoom({ speakerDevice: e.target.value })
                    }
                  >
                    <option value="default">Системни по подразбиране</option>
                    {mediaDevices.audioOut.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Изход ${d.deviceId.slice(0, 6)}`}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <ToggleRow label="HD video" checked={prefs.room.hdVideo} onChange={(v) => patchRoom({ hdVideo: v })} />
              <ToggleRow label="Background blur" checked={prefs.room.backgroundBlur} onChange={(v) => patchRoom({ backgroundBlur: v })} />
              <ToggleRow
                label="MyFace (polish на лицето)"
                checked={Boolean(prefs.room.myFaceEnabled)}
                onChange={(v) => patchRoom({ myFaceEnabled: v })}
              />
              {prefs.room.myFaceEnabled ? (
                <Field label="MyFace look">
                  <select
                    className="ov-field"
                    value={prefs.room.myFaceLook || 'soft_glow'}
                    onChange={(e) =>
                      patchRoom({
                        myFaceLook: e.target
                          .value as RoomSettings['myFaceLook'],
                      })
                    }
                  >
                    {(
                      [
                        ['natural', 'Естествен'],
                        ['soft_glow', 'Мек glow'],
                        ['studio', 'Студио'],
                        ['ring', 'Ринг лампа'],
                        ['warm_skin', 'Топъл тон'],
                        ['clear', 'Ясен'],
                        ['cinema_face', 'Кино'],
                        ['fresh', 'Свеж'],
                      ] as const
                    ).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <div className="space-y-1.5 px-1">
                <p className="text-[11px] font-semibold">Изглед на камерата</p>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ['contour', 'Изрязан по контур'],
                      ['blur', 'Замъглен фон'],
                      ['oval', 'Овал'],
                      ['real', 'Истинска стая'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        patchRoom({
                          cutoutMode: id,
                          virtualBackground: id !== 'real',
                          backgroundBlur: id === 'blur',
                        })
                      }
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        (prefs.room.cutoutMode || 'contour') === id
                          ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                          : 'bg-[var(--chip)] text-[var(--foreground)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--muted)]">
                  Изрязан по контур = тялото върху виртуалния тапет (като Riverside /
                  StreamYard). Истинска = реалната стая от камерата.
                </p>
              </div>
              <ToggleRow label="Mirror video" checked={prefs.room.mirrorVideo} onChange={(v) => patchRoom({ mirrorVideo: v })} />
              <ToggleRow label="Noise suppression" checked={prefs.room.noiseSuppression} onChange={(v) => patchRoom({ noiseSuppression: v })} />
              <ToggleRow label="Echo cancellation" checked={prefs.room.echoCancellation} onChange={(v) => patchRoom({ echoCancellation: v })} />
              <ToggleRow label="Auto gain control" checked={prefs.room.autoGainControl} onChange={(v) => patchRoom({ autoGainControl: v })} />
              <ToggleRow label="Auto subtitles" checked={prefs.room.autoSubtitles} onChange={(v) => patchRoom({ autoSubtitles: v })} />
              <ToggleRow label="Waiting room" checked={prefs.room.waitingRoom} onChange={(v) => patchRoom({ waitingRoom: v })} />
              <ToggleRow label="Knock to enter" checked={prefs.room.knockToEnter} onChange={(v) => patchRoom({ knockToEnter: v })} />
              <ToggleRow label="Lock room" checked={prefs.room.lockRoom} onChange={(v) => patchRoom({ lockRoom: v })} />
              <ToggleRow label="Dual-track recording" checked={prefs.room.dualTrackRecording} onChange={(v) => patchRoom({ dualTrackRecording: v })} />
              <ToggleRow label="Lobby music" checked={prefs.room.lobbyMusic} onChange={(v) => patchRoom({ lobbyMusic: v })} />
            </div>
          )}

          {tab === 'chat' && (
            <div className="space-y-3">
              <SectionTitle icon={MessageCircle} title="Чат — messenger настройки" />
              <p className="text-xs text-[var(--muted)]">
                Опции като WhatsApp / Messenger / Telegram — плюс превод.
              </p>
              <ToggleRow label="Read receipts" checked={prefs.chat.readReceipts} onChange={(v) => patchChat({ readReceipts: v })} />
              <ToggleRow label="Typing indicators" checked={prefs.chat.typingIndicators} onChange={(v) => patchChat({ typingIndicators: v })} />
              <ToggleRow label="Link previews" checked={prefs.chat.linkPreviews} onChange={(v) => patchChat({ linkPreviews: v })} />
              <ToggleRow label="Media compression" checked={prefs.chat.mediaCompression} onChange={(v) => patchChat({ mediaCompression: v })} />
              <ToggleRow label="Enter to send" checked={prefs.chat.enterToSend} onChange={(v) => patchChat({ enterToSend: v })} />
              <ToggleRow label="Spellcheck" checked={prefs.chat.spellcheck} onChange={(v) => patchChat({ spellcheck: v })} />
              <ToggleRow label="Voice messages" checked={prefs.chat.voiceMessages} onChange={(v) => patchChat({ voiceMessages: v })} />
              <ToggleRow label="Reactions" checked={prefs.chat.reactions} onChange={(v) => patchChat({ reactions: v })} />
              <ToggleRow label="Reply threads" checked={prefs.chat.replyThreads} onChange={(v) => patchChat({ replyThreads: v })} />
              <ToggleRow label="Pin chats" checked={prefs.chat.pinChats} onChange={(v) => patchChat({ pinChats: v })} />
              <ToggleRow label="Archive chats" checked={prefs.chat.archiveChats} onChange={(v) => patchChat({ archiveChats: v })} />
              <ToggleRow label="Mention alerts" checked={prefs.chat.mentionAlerts} onChange={(v) => patchChat({ mentionAlerts: v })} />
              <ToggleRow label="Translation preview" checked={prefs.chat.translationPreview} onChange={(v) => patchChat({ translationPreview: v })} />
              <ToggleRow label="Media auto-download" checked={prefs.chat.mediaAutoDownload} onChange={(v) => patchChat({ mediaAutoDownload: v })} />
              <ToggleRow label="Save media to gallery" checked={prefs.chat.saveToGallery} onChange={(v) => patchChat({ saveToGallery: v })} />
              <ToggleRow label="Group chats" checked={prefs.chat.groupChatEnabled} onChange={(v) => patchChat({ groupChatEnabled: v })} />
              <ToggleRow label="Mute notifications" checked={prefs.chat.muteNotifications} onChange={(v) => patchChat({ muteNotifications: v })} />
              <ToggleRow label="E2E-style at-rest lock (local)" checked={prefs.chat.blockedAtRest} onChange={(v) => patchChat({ blockedAtRest: v })} />
              <Field label="Disappearing messages">
                <select
                  className="ov-field"
                  value={prefs.chat.disappearingMessages}
                  onChange={(e) =>
                    patchChat({
                      disappearingMessages: e.target
                        .value as ChatSettings['disappearingMessages'],
                    })
                  }
                >
                  <option value="off">Off</option>
                  <option value="24h">24 hours</option>
                  <option value="7d">7 days</option>
                  <option value="after_seen">After seen</option>
                </select>
              </Field>
              <Field label={`Max attachment (MB) — ${prefs.chat.maxAttachmentMb}`}>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={prefs.chat.maxAttachmentMb}
                  onChange={(e) =>
                    patchChat({ maxAttachmentMb: Number(e.target.value) })
                  }
                  className="w-full"
                />
              </Field>
            </div>
          )}

          {tab === 'podcast' && (
            <div className="space-y-3">
              <SectionTitle icon={Clapperboard} title="Подкаст & Streaming studio" />
              <p className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-[11px] text-[var(--muted)]">
                Пълен streaming пакет (Twitch · YouTube Live · Kick · Streamlabs ·
                Restream) + OmniVoice иновации — наличен във{' '}
                <span className="font-semibold text-[var(--fg)]">всички планове</span>.
                Multistream RTMP ключове → таб Platforms.
              </p>

              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-3">
                <div>
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-100">
                    Реклами (Podcast · по желание)
                  </p>
                  <p className="text-[10px] text-[var(--muted)]">
                    Ти решаваш кога — бутон „Реклама“ в стаята + къде/как да се
                    показва.
                  </p>
                </div>
                <ToggleRow
                  label="Включи спонсорски реклами"
                  checked={Boolean((prefs.ads || DEFAULT_ADS).podcast.enabled)}
                  onChange={(v) =>
                    patchAds({
                      podcast: {
                        ...(prefs.ads || DEFAULT_ADS).podcast,
                        enabled: v,
                      },
                    })
                  }
                />
                {(prefs.ads || DEFAULT_ADS).podcast.enabled ? (
                  <>
                    <ToggleRow
                      label="Ръчен старт (хостът натиска „Реклама“)"
                      checked={
                        (prefs.ads || DEFAULT_ADS).podcast.manualTrigger !==
                        false
                      }
                      onChange={(v) =>
                        patchAds({
                          podcast: {
                            ...(prefs.ads || DEFAULT_ADS).podcast,
                            manualTrigger: v,
                          },
                        })
                      }
                    />
                    <Field label="Къде да се показва">
                      <select
                        className="ov-field"
                        value={(prefs.ads || DEFAULT_ADS).podcast.placement}
                        onChange={(e) =>
                          patchAds({
                            podcast: {
                              ...(prefs.ads || DEFAULT_ADS).podcast,
                              placement: e.target.value as AdPlacement,
                            },
                          })
                        }
                      >
                        {AD_PLACEMENTS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.labelBg} — {p.hint}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Как да се показва (формат)">
                      <select
                        className="ov-field"
                        value={(prefs.ads || DEFAULT_ADS).podcast.format}
                        onChange={(e) =>
                          patchAds({
                            podcast: {
                              ...(prefs.ads || DEFAULT_ADS).podcast,
                              format: e.target.value as AdFormat,
                              creatives: (
                                prefs.ads || DEFAULT_ADS
                              ).podcast.creatives.map((c, i) =>
                                i === 0
                                  ? { ...c, format: e.target.value as AdFormat }
                                  : c
                              ),
                            },
                          })
                        }
                      >
                        {AD_FORMATS.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.labelBg}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <ToggleRow
                      label="Countdown върху рекламата"
                      checked={
                        (prefs.ads || DEFAULT_ADS).podcast.showCountdown !==
                        false
                      }
                      onChange={(v) =>
                        patchAds({
                          podcast: {
                            ...(prefs.ads || DEFAULT_ADS).podcast,
                            showCountdown: v,
                          },
                        })
                      }
                    />
                    <ToggleRow
                      label="Заглуши mic докато върви рекламата"
                      checked={
                        (prefs.ads || DEFAULT_ADS).podcast.duckMicDuringAd !==
                        false
                      }
                      onChange={(v) =>
                        patchAds({
                          podcast: {
                            ...(prefs.ads || DEFAULT_ADS).podcast,
                            duckMicDuringAd: v,
                          },
                        })
                      }
                    />
                    {((prefs.ads || DEFAULT_ADS).podcast.creatives[0]
                      ? [(prefs.ads || DEFAULT_ADS).podcast.creatives[0]]
                      : [
                          {
                            id: newCreativeId('pod'),
                            title: '',
                            body: '',
                            mediaUrl: '',
                            clickUrl: '',
                            format: 'image' as AdFormat,
                            durationSec: 15,
                          },
                        ]
                    ).map((c) => (
                      <div key={c.id} className="grid gap-2">
                        <Field label="Заглавие">
                          <input
                            className="ov-field"
                            value={c.title}
                            onChange={(e) => {
                              const creatives = [
                                ...(prefs.ads || DEFAULT_ADS).podcast.creatives,
                              ]
                              if (!creatives[0]) creatives[0] = { ...c }
                              creatives[0] = {
                                ...creatives[0],
                                title: e.target.value,
                              }
                              patchAds({
                                podcast: {
                                  ...(prefs.ads || DEFAULT_ADS).podcast,
                                  creatives,
                                },
                              })
                            }}
                          />
                        </Field>
                        <Field label="Текст / read">
                          <textarea
                            className="ov-field min-h-[60px]"
                            value={c.body}
                            onChange={(e) => {
                              const creatives = [
                                ...(prefs.ads || DEFAULT_ADS).podcast.creatives,
                              ]
                              if (!creatives[0]) creatives[0] = { ...c }
                              creatives[0] = {
                                ...creatives[0],
                                body: e.target.value,
                              }
                              patchAds({
                                podcast: {
                                  ...(prefs.ads || DEFAULT_ADS).podcast,
                                  creatives,
                                },
                              })
                            }}
                          />
                        </Field>
                        <Field label="Медия / видео URL">
                          <input
                            className="ov-field"
                            placeholder="https://…/ad.mp4 или .jpg"
                            value={c.mediaUrl}
                            onChange={(e) => {
                              const creatives = [
                                ...(prefs.ads || DEFAULT_ADS).podcast.creatives,
                              ]
                              if (!creatives[0]) creatives[0] = { ...c }
                              creatives[0] = {
                                ...creatives[0],
                                mediaUrl: e.target.value,
                              }
                              patchAds({
                                podcast: {
                                  ...(prefs.ads || DEFAULT_ADS).podcast,
                                  creatives,
                                },
                              })
                            }}
                          />
                        </Field>
                        <Field label="Линк при клик">
                          <input
                            className="ov-field"
                            value={c.clickUrl}
                            onChange={(e) => {
                              const creatives = [
                                ...(prefs.ads || DEFAULT_ADS).podcast.creatives,
                              ]
                              if (!creatives[0]) creatives[0] = { ...c }
                              creatives[0] = {
                                ...creatives[0],
                                clickUrl: e.target.value,
                              }
                              patchAds({
                                podcast: {
                                  ...(prefs.ads || DEFAULT_ADS).podcast,
                                  creatives,
                                },
                              })
                            }}
                          />
                        </Field>
                        <Field label={`Продължителност (${c.durationSec}s)`}>
                          <input
                            type="range"
                            min={5}
                            max={60}
                            step={1}
                            value={c.durationSec}
                            onChange={(e) => {
                              const creatives = [
                                ...(prefs.ads || DEFAULT_ADS).podcast.creatives,
                              ]
                              if (!creatives[0]) creatives[0] = { ...c }
                              creatives[0] = {
                                ...creatives[0],
                                durationSec: Number(e.target.value),
                              }
                              patchAds({
                                podcast: {
                                  ...(prefs.ads || DEFAULT_ADS).podcast,
                                  creatives,
                                },
                              })
                            }}
                            className="w-full"
                          />
                        </Field>
                      </div>
                    ))}
                  </>
                ) : null}
              </div>

              <div className="rounded-2xl border border-violet-500/25 bg-violet-500/5 p-3 space-y-3">
                <p className="text-xs font-semibold text-violet-700 dark:text-violet-200">
                  Режим на стаята
                </p>
                <div className="inline-flex rounded-full bg-black/5 p-0.5 dark:bg-white/10">
                  <button
                    type="button"
                    onClick={() => patchPodcast({ sessionMode: 'podcast' })}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                      prefs.podcast.sessionMode !== 'streaming'
                        ? 'bg-rose-500 text-white'
                        : 'text-[var(--muted)]'
                    }`}
                  >
                    Podcast room
                  </button>
                  <button
                    type="button"
                    onClick={() => patchPodcast({ sessionMode: 'streaming' })}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                      prefs.podcast.sessionMode === 'streaming'
                        ? 'bg-violet-500 text-white'
                        : 'text-[var(--muted)]'
                    }`}
                  >
                    Streaming
                  </button>
                </div>

                <Field label="Сцена (Twitch / YT / Kick / Kick collab…)">
                  <select
                    className="ov-field"
                    value={prefs.podcast.streaming.scene}
                    onChange={(e) => {
                      const scene = e.target.value as StreamSceneId
                      patchStreaming({
                        scene,
                        contentHint: contentHintForScene(scene),
                      })
                    }}
                  >
                    {STREAM_SCENES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.labelBg} — {s.hint}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Host PiP ъгъл (cutout върху сериал/филм/игра)">
                  <select
                    className="ov-field"
                    value={prefs.podcast.streaming.pipCorner}
                    onChange={(e) =>
                      patchStreaming({
                        pipCorner: e.target.value as PipCorner,
                      })
                    }
                  >
                    {PIP_CORNERS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Стил на интерактивни субтитри">
                  <select
                    className="ov-field"
                    value={prefs.podcast.streaming.captionStyle}
                    onChange={(e) =>
                      patchStreaming({
                        captionStyle: e.target.value as CaptionStyleId,
                      })
                    }
                  >
                    {CAPTION_STYLES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.labelBg}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Чат режим">
                  <select
                    className="ov-field"
                    value={prefs.podcast.streaming.chatMode}
                    onChange={(e) =>
                      patchStreaming({
                        chatMode: e.target.value as StreamChatMode,
                      })
                    }
                  >
                    {CHAT_MODES.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Latency">
                  <select
                    className="ov-field"
                    value={prefs.podcast.streaming.latencyMode || 'low'}
                    onChange={(e) =>
                      patchStreaming({
                        latencyMode: e.target.value as LatencyMode,
                      })
                    }
                  >
                    {LATENCY_MODES.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.labelBg} — {m.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Бързи пакети
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        {
                          id: 'chat',
                          label: 'Just Chatting',
                          patch: {
                            scene: 'just_chatting' as StreamSceneId,
                            contentHint: 'screenshare' as const,
                            interactiveCaptions: true,
                            reactionWaves: true,
                          },
                        },
                        {
                          id: 'game',
                          label: 'Gaming',
                          patch: {
                            scene: 'gaming' as StreamSceneId,
                            contentHint: 'game' as const,
                            contentAudioDuck: true,
                            streamHealthMeter: true,
                          },
                        },
                        {
                          id: 'watch',
                          label: 'Watch party',
                          patch: {
                            scene: 'watch_party' as StreamSceneId,
                            contentHint: 'series' as const,
                            watchPartySync: true,
                            dualLangCaptions: true,
                            viewerLangPicker: true,
                          },
                        },
                        {
                          id: 'pro',
                          label: 'Pro live',
                          patch: {
                            alertsFollows: true,
                            alertsSubs: true,
                            hypeTrain: true,
                            polls: true,
                            predictions: true,
                            channelPoints: true,
                            autoClips916: true,
                            aiMoments: true,
                          },
                        },
                      ] as const
                    ).map((pack) => (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() =>
                          patchStreaming({
                            ...pack.patch,
                            contentHint:
                              'contentHint' in pack.patch
                                ? pack.patch.contentHint
                                : contentHintForScene(
                                    ('scene' in pack.patch
                                      ? pack.patch.scene
                                      : prefs.podcast.streaming.scene) as StreamSceneId
                                  ),
                          })
                        }
                        className="rounded-full bg-[var(--accent)]/20 px-3 py-1 text-[10px] font-bold text-[var(--fg)] ring-1 ring-[var(--accent)]/30"
                      >
                        {pack.label}
                      </button>
                    ))}
                  </div>
                </div>

                <details className="rounded-xl border border-[var(--panel-border)] bg-[var(--chip)]/20 open:bg-[var(--chip)]/35">
                  <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-semibold">
                    Разширени опции ({STREAMING_OPTION_GROUPS.reduce((n, g) => n + g.options.length, 0)}) — по групи
                  </summary>
                  <div className="space-y-2 border-t border-[var(--panel-border)] p-2.5">
                    {STREAMING_OPTION_GROUPS.map((group) => (
                      <details
                        key={group.id}
                        className="rounded-lg border border-[var(--panel-border)] bg-black/5"
                      >
                        <summary className="cursor-pointer px-2.5 py-1.5 text-[11px] font-bold">
                          {group.titleBg}
                          <span className="ml-1 font-normal text-[var(--muted)]">
                            · {group.options.length}
                          </span>
                        </summary>
                        <div className="space-y-1 border-t border-[var(--panel-border)] p-2">
                          <p className="text-[9px] text-[var(--muted)]">
                            {group.inspiredBy}
                          </p>
                          {group.options.map((opt) => (
                            <ToggleRow
                              key={opt.key}
                              label={opt.labelBg}
                              checked={Boolean(
                                prefs.podcast.streaming[opt.key]
                              )}
                              onChange={(v) =>
                                patchStreaming({ [opt.key]: v })
                              }
                            />
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </details>
              </div>

              <Field label="Show title">
                <input
                  className="ov-field"
                  value={prefs.podcast.showTitle}
                  onChange={(e) => patchPodcast({ showTitle: e.target.value })}
                />
              </Field>
              <Field label="Episode title">
                <input
                  className="ov-field"
                  value={prefs.podcast.episodeTitle}
                  onChange={(e) =>
                    patchPodcast({ episodeTitle: e.target.value })
                  }
                />
              </Field>
              <Field label="Description">
                <textarea
                  className="ov-field min-h-[72px]"
                  value={prefs.podcast.description}
                  onChange={(e) =>
                    patchPodcast({ description: e.target.value })
                  }
                />
              </Field>
              <Field label="Tags">
                <input
                  className="ov-field"
                  value={prefs.podcast.tags}
                  onChange={(e) => patchPodcast({ tags: e.target.value })}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Layout">
                  <select
                    className="ov-field"
                    value={prefs.podcast.layout}
                    onChange={(e) =>
                      patchPodcast({
                        layout: e.target.value as PodcastSettings['layout'],
                      })
                    }
                  >
                    <option value="grid">Grid</option>
                    <option value="spotlight">Spotlight</option>
                    <option value="cinema">Cinema</option>
                    <option value="vertical">Vertical 9:16</option>
                  </select>
                </Field>
                <Field label="Resolution">
                  <select
                    className="ov-field"
                    value={prefs.podcast.resolution}
                    onChange={(e) =>
                      patchPodcast({
                        resolution: e.target
                          .value as PodcastSettings['resolution'],
                      })
                    }
                  >
                    <option value="720p">720p</option>
                    <option value="1080p">1080p</option>
                    <option value="1440p">1440p</option>
                    <option value="4k">4K</option>
                  </select>
                </Field>
                <Field label="FPS">
                  <select
                    className="ov-field"
                    value={prefs.podcast.fps}
                    onChange={(e) =>
                      patchPodcast({
                        fps: Number(e.target.value) as PodcastSettings['fps'],
                      })
                    }
                  >
                    <option value={24}>24</option>
                    <option value={30}>30</option>
                    <option value={60}>60</option>
                  </select>
                </Field>
                <Field label="Video bitrate (kbps)">
                  <input
                    className="ov-field"
                    type="number"
                    min={1500}
                    max={12000}
                    value={prefs.podcast.bitrateKbps}
                    onChange={(e) =>
                      patchPodcast({
                        bitrateKbps: Number(e.target.value) || 4500,
                      })
                    }
                  />
                </Field>
                <Field label="Audio bitrate">
                  <select
                    className="ov-field"
                    value={prefs.podcast.audioBitrateKbps}
                    onChange={(e) =>
                      patchPodcast({
                        audioBitrateKbps: Number(
                          e.target.value
                        ) as PodcastSettings['audioBitrateKbps'],
                      })
                    }
                  >
                    <option value={128}>128</option>
                    <option value={192}>192</option>
                    <option value={256}>256</option>
                    <option value={320}>320</option>
                  </select>
                </Field>
                <Field label="OBS scene">
                  <input
                    className="ov-field"
                    value={prefs.podcast.obsScene}
                    onChange={(e) => patchPodcast({ obsScene: e.target.value })}
                  />
                </Field>
                <Field label="Slow mode (sec)">
                  <input
                    className="ov-field"
                    type="number"
                    min={0}
                    max={120}
                    value={prefs.podcast.slowModeSeconds}
                    onChange={(e) =>
                      patchPodcast({
                        slowModeSeconds: Number(e.target.value) || 0,
                      })
                    }
                  />
                </Field>
                <Field label="RSS feed URL">
                  <input
                    className="ov-field"
                    value={prefs.podcast.rssFeedUrl}
                    onChange={(e) =>
                      patchPodcast({ rssFeedUrl: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </Field>
              </div>
              <ToggleRow label="OBS output" checked={prefs.podcast.obsEnabled} onChange={(v) => patchPodcast({ obsEnabled: v })} />
              <ToggleRow label="Multistream" checked={prefs.podcast.multistream} onChange={(v) => patchPodcast({ multistream: v })} />
              <ToggleRow label="Lower thirds" checked={prefs.podcast.lowerThirds} onChange={(v) => patchPodcast({ lowerThirds: v })} />
              <ToggleRow label="Countdown" checked={prefs.podcast.countdown} onChange={(v) => patchPodcast({ countdown: v })} />
              <ToggleRow label="Auto 9:16 clips" checked={prefs.podcast.autoClips916} onChange={(v) => patchPodcast({ autoClips916: v })} />
              <ToggleRow label="Auto chapters" checked={prefs.podcast.autoChapters} onChange={(v) => patchPodcast({ autoChapters: v })} />
              <ToggleRow label="Live chat moderation" checked={prefs.podcast.liveChatModeration} onChange={(v) => patchPodcast({ liveChatModeration: v })} />
              <ToggleRow label="Subscriber-only chat" checked={prefs.podcast.subscriberOnlyChat} onChange={(v) => patchPodcast({ subscriberOnlyChat: v })} />
              <ToggleRow label="Donate / superchat alerts" checked={prefs.podcast.donateAlerts} onChange={(v) => patchPodcast({ donateAlerts: v })} />
              <ToggleRow label="Brand logo" checked={prefs.podcast.brandLogo} onChange={(v) => patchPodcast({ brandLogo: v })} />
              <ToggleRow label="Watermark" checked={prefs.podcast.watermark} onChange={(v) => patchPodcast({ watermark: v })} />
              <ToggleRow label="End screen" checked={prefs.podcast.endScreen} onChange={(v) => patchPodcast({ endScreen: v })} />
              <ToggleRow label="Save VOD" checked={prefs.podcast.vodSave} onChange={(v) => patchPodcast({ vodSave: v })} />
            </div>
          )}

          {tab === 'platforms' && (
            <div className="space-y-3">
              <SectionTitle icon={Radio} title="Свързване с платформи" />
              <p className="text-xs text-[var(--muted)]">
                Live (YouTube, Twitch…) + гледане (Max/HBO, Netflix, Disney+,
                PlayStation, Xbox, Smart TV) — вържи акаунт и сподели екрана в
                Streaming.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    'all',
                    'video',
                    'social',
                    'audio',
                    'community',
                    'watch',
                  ] as const
                ).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setPlatformFilter(filter)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      platformFilter === filter
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                        : 'bg-[var(--chip)] text-[var(--muted)]'
                    }`}
                  >
                    {filter === 'watch' ? 'TV / игри' : filter}
                  </button>
                ))}
              </div>
              {platforms.map((platform) => {
                const conn = prefs.podcast.platforms[platform.id] || {
                  connected: false,
                  account: '',
                  streamKey: '',
                  rtmpUrl: '',
                  autoPublish: false,
                }
                return (
                  <div
                    key={platform.id}
                    className="rounded-2xl border border-[var(--panel-border)] bg-[var(--chip)] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{platform.label}</p>
                        <p className="text-[11px] text-[var(--muted)]">
                          {platform.hint}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {platform.connectUrl ? (
                          <a
                            href={platform.connectUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full bg-[var(--panel)] px-2.5 py-1 text-[10px] font-semibold text-[var(--accent)] ring-1 ring-[var(--panel-border)]"
                          >
                            Отвори ↗
                          </a>
                        ) : null}
                        <label className="flex items-center gap-2 text-xs">
                          <span>{conn.connected ? 'On' : 'Off'}</span>
                          <input
                            type="checkbox"
                            checked={conn.connected}
                            onChange={(e) =>
                              patchPlatform(platform.id, {
                                connected: e.target.checked,
                              })
                            }
                          />
                        </label>
                      </div>
                    </div>
                    {conn.connected ? (
                      <div className="mt-3 grid gap-2">
                        <input
                          className="ov-field"
                          placeholder={
                            platform.category === 'watch'
                              ? 'Имейл / gamertag / абонамент'
                              : 'Account / channel'
                          }
                          value={conn.account}
                          onChange={(e) =>
                            patchPlatform(platform.id, {
                              account: e.target.value,
                            })
                          }
                        />
                        {platform.category !== 'watch' ? (
                          <>
                            <input
                              className="ov-field"
                              placeholder="RTMP URL"
                              value={conn.rtmpUrl}
                              onChange={(e) =>
                                patchPlatform(platform.id, {
                                  rtmpUrl: e.target.value,
                                })
                              }
                            />
                            <input
                              className="ov-field"
                              placeholder="Stream key"
                              type="password"
                              value={conn.streamKey}
                              onChange={(e) =>
                                patchPlatform(platform.id, {
                                  streamKey: e.target.value,
                                })
                              }
                            />
                            <ToggleRow
                              label="Auto-publish when LIVE"
                              checked={conn.autoPublish}
                              onChange={(v) =>
                                patchPlatform(platform.id, {
                                  autoPublish: v,
                                })
                              }
                            />
                          </>
                        ) : (
                          <p className="text-[11px] text-[var(--muted)]">
                            В Streaming режим натисни Share — съдържанието отива
                            fullscreen, ти си cutout.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                )
              })}

              <SectionTitle icon={Radio} title="Платено съдържание" />
              <p className="text-xs text-[var(--muted)]">
                Като YouTube Memberships / Super Thanks / Twitch Subs / PPV —
                настрой модела; плащанията се връзват през Stripe в Checkout.
              </p>
              <ToggleRow
                label="Включи платено съдържание"
                checked={prefs.podcast.streaming.paidContent?.enabled || false}
                onChange={(v) =>
                  patchStreaming({
                    paidContent: {
                      ...prefs.podcast.streaming.paidContent,
                      enabled: v,
                    },
                  })
                }
              />
              {prefs.podcast.streaming.paidContent?.enabled ? (
                <div className="space-y-2 rounded-2xl border border-[var(--panel-border)] bg-[var(--chip)] p-3">
                  <Field label="Модел">
                    <select
                      className="ov-field"
                      value={prefs.podcast.streaming.paidContent.model}
                      onChange={(e) =>
                        patchStreaming({
                          paidContent: {
                            ...prefs.podcast.streaming.paidContent,
                            model: e.target
                              .value as typeof prefs.podcast.streaming.paidContent.model,
                          },
                        })
                      }
                    >
                      <option value="free">Безплатно</option>
                      <option value="one_time">Еднократно</option>
                      <option value="fans">Super Thanks / tips</option>
                      <option value="subscription">Абонамент</option>
                      <option value="ppv">Pay-per-view</option>
                    </select>
                  </Field>
                  <Field label="Цена (EUR)">
                    <input
                      className="ov-field"
                      type="number"
                      min={0}
                      step={0.5}
                      value={prefs.podcast.streaming.paidContent.priceEur}
                      onChange={(e) =>
                        patchStreaming({
                          paidContent: {
                            ...prefs.podcast.streaming.paidContent,
                            priceEur: Number(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </Field>
                  <Field label="Заглавие">
                    <input
                      className="ov-field"
                      value={prefs.podcast.streaming.paidContent.title}
                      onChange={(e) =>
                        patchStreaming({
                          paidContent: {
                            ...prefs.podcast.streaming.paidContent,
                            title: e.target.value,
                          },
                        })
                      }
                    />
                  </Field>
                  <ToggleRow
                    label="Super Thanks реакции"
                    checked={prefs.podcast.streaming.paidContent.superThanks}
                    onChange={(v) =>
                      patchStreaming({
                        paidContent: {
                          ...prefs.podcast.streaming.paidContent,
                          superThanks: v,
                        },
                      })
                    }
                  />
                  <ToggleRow
                    label="Чат само за членове"
                    checked={
                      prefs.podcast.streaming.paidContent.membersOnlyChat
                    }
                    onChange={(v) =>
                      patchStreaming({
                        paidContent: {
                          ...prefs.podcast.streaming.paidContent,
                          membersOnlyChat: v,
                        },
                      })
                    }
                  />
                  <ToggleRow
                    label="Възрастова защита (18+)"
                    checked={prefs.podcast.streaming.paidContent.ageGate}
                    onChange={(v) =>
                      patchStreaming({
                        paidContent: {
                          ...prefs.podcast.streaming.paidContent,
                          ageGate: v,
                        },
                      })
                    }
                  />
                  <button
                    type="button"
                    className="ov-btn-primary w-full !py-2 text-xs"
                    onClick={() => {
                      const pc = prefs.podcast.streaming.paidContent
                      void (async () => {
                        try {
                          const res = await fetch('/api/stripe/paid-content', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                              model: pc.model,
                              title: pc.title,
                              description: pc.description,
                              priceEur: pc.priceEur,
                              currency: pc.currency,
                              contentId: `show_${prefs.podcast.showTitle || 'live'}`,
                              successPath: '/dashboard?paid=success',
                            }),
                          })
                          const data = (await res.json()) as {
                            url?: string
                            demo?: boolean
                            unlocked?: boolean
                            contentId?: string
                            error?: string
                            message?: string
                          }
                          if (data.url) {
                            window.location.href = data.url
                            return
                          }
                          if (data.demo && data.unlocked && data.contentId) {
                            updatePrefs((current) => ({
                              paidUnlocks: [
                                data.contentId!,
                                ...(current.paidUnlocks || []).filter(
                                  (id) => id !== data.contentId
                                ),
                              ],
                            }))
                            window.alert(
                              data.message ||
                                'Демо unlock — съдържанието е отключено.'
                            )
                            return
                          }
                          window.alert(data.error || 'Checkout не успя')
                        } catch {
                          window.alert('Няма връзка със сървъра')
                        }
                      })()
                    }}
                  >
                    Плати / отключи чрез Stripe · €
                    {prefs.podcast.streaming.paidContent.priceEur.toFixed(2)}
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {tab === 'guests' && (
            <div className="space-y-3">
              <SectionTitle icon={Link2} title="Guest / покани без абонамент" />
              <p className="text-xs text-[var(--muted)]">
                Ако си абониран (или админ) и си вързал сайт — клиентите влизат
                само в чат/обаждане без собствен план. Преди вход попълват име и
                език. Когато приключиш разговора — се изхвърлят.
              </p>
              <ToggleRow
                label="Разреши guest вход"
                checked={prefs.room.allowGuests}
                onChange={(checked) => patchRoom({ allowGuests: checked })}
              />
              <Field label="Guest код">
                <input
                  className="ov-field"
                  value={prefs.room.guestLinkCode}
                  onChange={(e) => patchRoom({ guestLinkCode: e.target.value })}
                  disabled={!prefs.room.allowGuests}
                />
              </Field>
              <Field label="Валидност (минути)">
                <input
                  className="ov-field"
                  type="number"
                  min={5}
                  max={240}
                  value={prefs.room.guestExpiresMinutes}
                  onChange={(e) =>
                    patchRoom({
                      guestExpiresMinutes: Number(e.target.value) || 30,
                    })
                  }
                  disabled={!prefs.room.allowGuests}
                />
              </Field>
              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--chip)] p-3">
                <p className="text-[11px] font-semibold text-[var(--foreground)]">
                  Invite линк (email / chat)
                </p>
                <p className="mt-1 break-all text-[11px] text-[var(--muted)]">
                  {guestUrl}
                </p>
                <button
                  type="button"
                  className="ov-btn-primary mt-3 w-full"
                  onClick={() => void copyGuestLink()}
                  disabled={!prefs.room.allowGuests}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? 'Копирано' : 'Копирай invite линк'}
                </button>
              </div>
              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--chip)] p-3">
                <p className="text-[11px] font-semibold text-[var(--foreground)]">
                  Website guest линк
                </p>
                <p className="mt-1 break-all text-[11px] text-[var(--muted)]">
                  {siteGuestHint}
                </p>
              </div>
              {prefs.invites.length ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[var(--muted)]">
                    Последни покани
                  </p>
                  {prefs.invites.slice(0, 5).map((invite) => (
                    <div
                      key={invite.id}
                      className="rounded-xl bg-[var(--chip)] px-3 py-2 text-xs"
                    >
                      <p className="font-semibold">{invite.label}</p>
                      <p className="text-[var(--muted)]">
                        {invite.code} · {invite.active ? 'active' : 'off'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {tab === 'voice' && (
            <div className="space-y-3">
              <SectionTitle icon={Sparkles} title="Глас и превод" />
              <p className="text-xs text-[var(--muted)]">
                Избраният глас отива при отсрещния — той те чува с твоя глас, ти
                чуваш с неговия. Избери глас на езика, на който те слушат.
              </p>
              <Field label="Език на гласа (езикът на отсрещния)">
                <select
                  className="ov-field"
                  value={prefs.voice.targetLanguage}
                  onChange={(e) => {
                    const targetLanguage = e.target.value
                    const presetId = (prefs.voice.voicePreset ||
                      '') as VoicePresetId | ''
                    const resolved = presetId
                      ? resolveVoicePreset(presetId, targetLanguage, voices)
                      : null
                    patchVoice({
                      targetLanguage,
                      voiceURI: resolved?.voiceURI || '',
                      pitch: resolved?.pitch ?? prefs.voice.pitch,
                      rate: resolved?.rate ?? prefs.voice.rate,
                    })
                  }}
                >
                  {APP_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} · {lang.nativeName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label={`Твой глас — 3 женски / 3 мъжки / 2 детски (${
                  APP_LANGUAGES.find((l) => l.code === speakAsLangCode)
                    ?.nativeName || speakAsLangCode
                })`}
              >
                <select
                  className="ov-field"
                  value={prefs.voice.voicePreset || ''}
                  onChange={(e) => {
                    const presetId = e.target.value as VoicePresetId | ''
                    const resolved = presetId
                      ? resolveVoicePreset(
                          presetId,
                          speakAsLangCode,
                          voices.length ? voices : filteredVoices
                        )
                      : null
                    patchVoice({
                      voicePreset: presetId,
                      voiceURI: resolved?.voiceURI || '',
                      pitch: resolved?.pitch ?? 1,
                      rate: resolved?.rate ?? 1,
                    })
                    unlockSpeechSynthesis()
                    const sampleLang =
                      APP_LANGUAGES.find((l) => l.code === speakAsLangCode)
                        ?.speechCode || 'en-US'
                    const sample =
                      speakAsLangCode === 'bg'
                        ? 'Здравей, това е избраният глас.'
                        : 'Hello, this is the selected voice.'
                    if (presetId) {
                      speakVoicePresetSample(presetId, sample, sampleLang)
                    }
                  }}
                >
                  <option value="">Авто (системен)</option>
                  <optgroup label="Женски">
                    {VOICE_PRESETS.filter((p) => p.gender === 'female').map(
                      (p) => (
                        <option key={p.id} value={p.id}>
                          {p.labelBg}
                        </option>
                      )
                    )}
                  </optgroup>
                  <optgroup label="Мъжки">
                    {VOICE_PRESETS.filter((p) => p.gender === 'male').map(
                      (p) => (
                        <option key={p.id} value={p.id}>
                          {p.labelBg}
                        </option>
                      )
                    )}
                  </optgroup>
                  <optgroup label="Детски">
                    {VOICE_PRESETS.filter((p) => p.gender === 'child').map(
                      (p) => (
                        <option key={p.id} value={p.id}>
                          {p.labelBg}
                        </option>
                      )
                    )}
                  </optgroup>
                </select>
              </Field>
              <Field label={`Скорост (${prefs.voice.rate.toFixed(1)})`}>
                <input
                  type="range"
                  min={0.7}
                  max={1.4}
                  step={0.05}
                  value={prefs.voice.rate}
                  onChange={(e) =>
                    patchVoice({
                      rate: Number(e.target.value),
                      voicePreset: prefs.voice.voicePreset,
                    })
                  }
                  className="w-full"
                />
              </Field>
              <Field label={`Височина (${prefs.voice.pitch.toFixed(1)})`}>
                <input
                  type="range"
                  min={0.7}
                  max={1.6}
                  step={0.05}
                  value={prefs.voice.pitch}
                  onChange={(e) =>
                    patchVoice({
                      pitch: Number(e.target.value),
                      voicePreset: prefs.voice.voicePreset,
                    })
                  }
                  className="w-full"
                />
              </Field>
              <Field label="Тон на превода">
                <select
                  className="ov-field"
                  value={prefs.voice.tone}
                  onChange={(e) =>
                    patchVoice({
                      tone: e.target.value as VoiceSettings['tone'],
                    })
                  }
                >
                  <option value="natural">Natural</option>
                  <option value="formal">Formal</option>
                  <option value="casual">Casual</option>
                </select>
              </Field>
              <ToggleRow
                label="Emotion-safe mode"
                checked={prefs.voice.emotionSafe}
                onChange={(checked) => patchVoice({ emotionSafe: checked })}
              />
            </div>
          )}

          {tab === 'music' && (
            <div className="space-y-3">
              <SectionTitle icon={Music2} title="Ambient музика" />
              <p className="text-xs text-[var(--muted)]">
                Spotify плейлист/трак или вградена библиотека · план{' '}
                {PLANS[plan].label}
              </p>

              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['spotify', 'Spotify'],
                    ['library', 'Вградена библиотека'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      patchMusic({
                        source: id,
                        enabled: true,
                      })
                    }
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                      (prefs.music.source || 'library') === id
                        ? 'bg-[#1DB954] text-black'
                        : 'bg-[var(--chip)] text-[var(--muted)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <ToggleRow
                label="Пусни музика"
                checked={prefs.music.enabled}
                onChange={(checked) => patchMusic({ enabled: checked })}
              />

              {(prefs.music.source || 'library') === 'spotify' ? (
                <div className="space-y-3 rounded-2xl border border-[#1DB954]/25 bg-[#1DB954]/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-[#1DB954]">
                      Spotify
                    </p>
                    <a
                      href={spotifySearchUrl('lofi chill')}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-medium text-[#1DB954] underline-offset-2 hover:underline"
                    >
                      Търси в Spotify ↗
                    </a>
                  </div>
                  <Field label="Постави линк към track / playlist / album">
                    <input
                      className="ov-field text-xs"
                      placeholder="https://open.spotify.com/playlist/…"
                      value={prefs.music.spotifyUrl || ''}
                      onChange={(e) =>
                        patchMusic({
                          spotifyUrl: e.target.value,
                          source: 'spotify',
                          enabled: true,
                        })
                      }
                    />
                  </Field>
                  <div className="flex flex-wrap gap-1.5">
                    {SPOTIFY_QUICK_PICKS.map((pick) => {
                      const active =
                        prefs.music.spotifyUrl === pick.url ||
                        parseSpotifyUrl(prefs.music.spotifyUrl || '')?.openUrl ===
                          pick.url
                      return (
                        <button
                          key={pick.url}
                          type="button"
                          title={pick.hint}
                          onClick={() =>
                            patchMusic({
                              spotifyUrl: pick.url,
                              source: 'spotify',
                              enabled: true,
                            })
                          }
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            active
                              ? 'bg-[#1DB954] text-black'
                              : 'bg-black/20 text-[var(--foreground)] ring-1 ring-[#1DB954]/30'
                          }`}
                        >
                          {pick.label}
                        </button>
                      )
                    })}
                  </div>
                  {(() => {
                    const ref = parseSpotifyUrl(prefs.music.spotifyUrl || '')
                    if (!prefs.music.enabled) {
                      return (
                        <p className="text-[11px] text-[var(--muted)]">
                          Включи „Пусни музика“, за да се зареди плеърът.
                        </p>
                      )
                    }
                    if (!ref) {
                      return (
                        <p className="text-[11px] text-amber-500">
                          Невалиден Spotify линк — копирай от приложението Share
                          → Copy link.
                        </p>
                      )
                    }
                    return (
                      <div className="overflow-hidden rounded-xl border border-[#1DB954]/20">
                        <iframe
                          title="Spotify player"
                          src={ref.embedUrl}
                          width="100%"
                          height="152"
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                          loading="lazy"
                          className="block w-full bg-black"
                        />
                        <a
                          href={ref.openUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block bg-black/40 px-3 py-1.5 text-center text-[10px] text-[#1DB954]"
                        >
                          Отвори в Spotify ↗
                        </a>
                      </div>
                    )
                  })()}
                  <p className="text-[10px] leading-relaxed text-[var(--muted)]">
                    Spotify се пуска в embed (трябва логнат Spotify акаунт в
                    браузъра). За правата на авторите — ползвай личен Premium /
                    лицензиран плейлист.
                  </p>
                </div>
              ) : (
                <>
                  <ToggleRow
                    label="Duck volume докато говориш"
                    checked={prefs.music.duckDuringSpeech}
                    onChange={(checked) =>
                      patchMusic({ duckDuringSpeech: checked })
                    }
                  />
                  <Field
                    label={`Сила (${Math.round(prefs.music.volume * 100)}%)`}
                  >
                    <input
                      type="range"
                      min={0.05}
                      max={0.8}
                      step={0.01}
                      value={prefs.music.volume}
                      onChange={(e) =>
                        patchMusic({ volume: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </Field>
                  <p className="text-xs text-[var(--muted)]">
                    {musicTracks.length} вградени писти
                  </p>
                  {musicTracks.map((track) => (
                    <MusicRow
                      key={track.id}
                      track={track}
                      active={prefs.music.trackId === track.id}
                      onSelect={() =>
                        patchMusic({
                          trackId: track.id,
                          source: 'library',
                          enabled: true,
                        })
                      }
                    />
                  ))}
                </>
              )}
            </div>
          )}

          {tab === 'privacy' && (
            <div className="space-y-3">
              <SectionTitle icon={Shield} title="Privacy" />
              <ToggleRow
                label="Ephemeral room (чистене на история)"
                checked={prefs.room.privacyEphemeral}
                onChange={(checked) => patchRoom({ privacyEphemeral: checked })}
              />
              <ToggleRow
                label="Lock room"
                checked={prefs.room.lockRoom}
                onChange={(checked) => patchRoom({ lockRoom: checked })}
              />
              <ToggleRow
                label="Chat at-rest lock"
                checked={prefs.chat.blockedAtRest}
                onChange={(checked) => patchChat({ blockedAtRest: checked })}
              />
            </div>
          )}

          {tab === 'notifications' && (
            <div className="space-y-3">
              <SectionTitle icon={Bell} title="Известия" />
              <ToggleRow
                label="Desktop push"
                checked={prefs.notifications.desktopPush}
                onChange={(v) => patchNotifications({ desktopPush: v })}
              />
              <ToggleRow
                label="Sounds"
                checked={prefs.notifications.soundEnabled}
                onChange={(v) => patchNotifications({ soundEnabled: v })}
              />
              <ToggleRow
                label="Call ringtone"
                checked={prefs.notifications.callRingtone}
                onChange={(v) => patchNotifications({ callRingtone: v })}
              />
              <ToggleRow
                label="Message preview"
                checked={prefs.notifications.messagePreview}
                onChange={(v) => patchNotifications({ messagePreview: v })}
              />
              <ToggleRow
                label="Email digest"
                checked={prefs.notifications.emailDigest}
                onChange={(v) => patchNotifications({ emailDigest: v })}
              />
              <ToggleRow
                label="Quiet hours"
                checked={prefs.notifications.quietHours}
                onChange={(v) => patchNotifications({ quietHours: v })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Quiet from">
                  <input
                    className="ov-field"
                    type="time"
                    value={prefs.notifications.quietFrom}
                    onChange={(e) =>
                      patchNotifications({ quietFrom: e.target.value })
                    }
                    disabled={!prefs.notifications.quietHours}
                  />
                </Field>
                <Field label="Quiet to">
                  <input
                    className="ov-field"
                    type="time"
                    value={prefs.notifications.quietTo}
                    onChange={(e) =>
                      patchNotifications({ quietTo: e.target.value })
                    }
                    disabled={!prefs.notifications.quietHours}
                  />
                </Field>
              </div>
            </div>
          )}

          {tab === 'phrasebook' && (
            <div className="space-y-3">
              <SectionTitle icon={BookOpen} title="Phrasebook" />
              <div className="grid gap-2">
                <input
                  className="ov-field"
                  placeholder="Нова фраза…"
                  value={newPhrase}
                  onChange={(e) => setNewPhrase(e.target.value)}
                />
                <button type="button" className="ov-btn-primary" onClick={addPhrase}>
                  Добави фраза
                </button>
              </div>
              <ul className="space-y-2">
                {prefs.experience.phrasebook.map((phrase) => (
                  <li
                    key={phrase.id}
                    className="rounded-2xl border border-[var(--panel-border)] bg-[var(--chip)] px-3 py-2"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      {phrase.category} · {phrase.language}
                    </p>
                    <p className="mt-1 text-sm">{phrase.text}</p>
                    <button
                      type="button"
                      className="mt-2 text-xs text-rose-500"
                      onClick={() =>
                        patchExperience({
                          phrasebook: prefs.experience.phrasebook.filter(
                            (item) => item.id !== phrase.id
                          ),
                        })
                      }
                    >
                      Премахни
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === 'experience' && (
            <div className="space-y-3">
              <SectionTitle icon={Sparkles} title="Experience" />
              <ToggleRow
                label="Smart reply chips"
                checked={prefs.experience.smartReplies}
                onChange={(checked) =>
                  patchExperience({ smartReplies: checked })
                }
              />
              {plan === 'business' ? (
                <ToggleRow
                  label="Call recap / Business Intel"
                  checked={prefs.experience.callRecap}
                  onChange={(checked) =>
                    patchExperience({ callRecap: checked })
                  }
                />
              ) : null}
              <ToggleRow
                label="Rich presence"
                checked={prefs.experience.showPresence}
                onChange={(checked) =>
                  patchExperience({ showPresence: checked })
                }
              />
              {plan === 'podcast' ? (
                <ToggleRow
                  label="AI помощник за подкаст (трендове / въпроси)"
                  checked={prefs.experience.aiPodcastAssistant !== false}
                  onChange={(checked) =>
                    patchExperience({ aiPodcastAssistant: checked })
                  }
                />
              ) : null}
              {plan === 'business' ? (
                <>
                  <ToggleRow
                    label="AI coach в бизнес разговор (само Business)"
                    checked={prefs.experience.aiBusinessCoach !== false}
                    onChange={(checked) =>
                      patchExperience({ aiBusinessCoach: checked })
                    }
                  />
                  <ToggleRow
                    label="Културен съветник по държава (Business)"
                    checked={prefs.experience.aiCultureAdvisor !== false}
                    onChange={(checked) =>
                      patchExperience({ aiCultureAdvisor: checked })
                    }
                  />
                </>
              ) : null}
              {plan === 'free' ? (
                <ToggleRow
                  label="Мини игри в чата (Normal)"
                  checked={prefs.experience.miniGames !== false}
                  onChange={(checked) =>
                    patchExperience({ miniGames: checked })
                  }
                />
              ) : null}
              <ToggleRow
                label="Запис на разговори (всички планове)"
                checked={prefs.chat.allowRecording !== false}
                onChange={(checked) =>
                  patchChat({ allowRecording: checked })
                }
              />

              {plan === 'business' ? (
              <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-emerald-500/5 p-3 space-y-3">
                <div>
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-100">
                    Business стая — предварителни настройки
                  </p>
                  <p className="text-[10px] text-[var(--muted)]">
                    От бележки до сключване на договор · важат за всяка business
                    сесия
                  </p>
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {BUSINESS_ROOM_PRESETS.map((preset) => {
                    const active =
                      (prefs.experience.businessRoom?.presetId ||
                        'deal_close') === preset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          patchExperience({
                            businessRoom: {
                              ...(prefs.experience.businessRoom ||
                                DEFAULT_BUSINESS_ROOM),
                              presetId: preset.id,
                              defaultIntelOptions:
                                preset.id === 'custom'
                                  ? prefs.experience.businessRoom
                                      ?.defaultIntelOptions ||
                                    DEFAULT_BUSINESS_ROOM.defaultIntelOptions
                                  : [...preset.options],
                            },
                          })
                        }
                        className={`rounded-xl border px-3 py-2 text-left transition ${
                          active
                            ? 'border-amber-400 bg-amber-500/20 shadow'
                            : 'border-[var(--panel-border)] bg-black/5 hover:bg-black/10'
                        }`}
                      >
                        <p className="text-[11px] font-bold">{preset.labelBg}</p>
                        <p className="text-[9px] text-[var(--muted)]">
                          {preset.hint}
                        </p>
                      </button>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-1">
                  {BUSINESS_INTEL_OPTIONS.map((opt) => {
                    const selected = (
                      prefs.experience.businessRoom?.defaultIntelOptions ||
                      DEFAULT_BUSINESS_ROOM.defaultIntelOptions
                    ).includes(opt.id)
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          const cur =
                            prefs.experience.businessRoom
                              ?.defaultIntelOptions ||
                            DEFAULT_BUSINESS_ROOM.defaultIntelOptions
                          const next = selected
                            ? cur.filter((id) => id !== opt.id)
                            : [...cur, opt.id]
                          patchExperience({
                            businessRoom: {
                              ...(prefs.experience.businessRoom ||
                                DEFAULT_BUSINESS_ROOM),
                              presetId: 'custom',
                              defaultIntelOptions: next.length
                                ? next
                                : ['summary'],
                            },
                          })
                        }}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          selected
                            ? 'bg-[var(--accent)] text-black'
                            : 'bg-black/15 text-[var(--muted)]'
                        }`}
                      >
                        {opt.labelBg}
                      </button>
                    )
                  })}
                </div>
                <Field label="Договорът се съставя от">
                  <select
                    className="ov-field"
                    value={
                      prefs.experience.businessRoom?.contractComposeFrom ||
                      'notes_and_transcript'
                    }
                    onChange={(e) =>
                      patchExperience({
                        businessRoom: {
                          ...(prefs.experience.businessRoom ||
                            DEFAULT_BUSINESS_ROOM),
                          contractComposeFrom: e.target
                            .value as ContractComposeFrom,
                        },
                      })
                    }
                  >
                    {CONTRACT_COMPOSE_FROM.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.labelBg} — {c.hint}
                      </option>
                    ))}
                  </select>
                </Field>
                <ToggleRow
                  label="Автоматично отвори подпис при писмен договор"
                  checked={Boolean(
                    prefs.experience.businessRoom?.autoOpenSigner
                  )}
                  onChange={(v) =>
                    patchExperience({
                      businessRoom: {
                        ...(prefs.experience.businessRoom ||
                          DEFAULT_BUSINESS_ROOM),
                        autoOpenSigner: v,
                      },
                    })
                  }
                />
                <ToggleRow
                  label="Запази Intel в CRM / memories"
                  checked={Boolean(prefs.experience.businessRoom?.saveToCrm)}
                  onChange={(v) =>
                    patchExperience({
                      businessRoom: {
                        ...(prefs.experience.businessRoom ||
                          DEFAULT_BUSINESS_ROOM),
                        saveToCrm: v,
                      },
                    })
                  }
                />
                <ToggleRow
                  label="Изисквай consent преди виртуален подпис"
                  checked={
                    prefs.experience.businessRoom?.requireSignConsent !== false
                  }
                  onChange={(v) =>
                    patchExperience({
                      businessRoom: {
                        ...(prefs.experience.businessRoom ||
                          DEFAULT_BUSINESS_ROOM),
                        requireSignConsent: v,
                      },
                    })
                  }
                />
                <ToggleRow
                  label="Запечатай договора след първия подпис (SHA-256)"
                  checked={
                    prefs.experience.businessRoom?.sealOnFirstSign !== false
                  }
                  onChange={(v) =>
                    patchExperience({
                      businessRoom: {
                        ...(prefs.experience.businessRoom ||
                          DEFAULT_BUSINESS_ROOM),
                        sealOnFirstSign: v,
                      },
                    })
                  }
                />
                <ToggleRow
                  label="Законен подпис (eIDAS / ESIGN) — Yousign/DocuSign"
                  checked={
                    prefs.experience.businessRoom?.signatureMode !==
                    'acknowledgment'
                  }
                  onChange={(v) =>
                    patchExperience({
                      businessRoom: {
                        ...(prefs.experience.businessRoom ||
                          DEFAULT_BUSINESS_ROOM),
                        signatureMode: v
                          ? 'legal_binding'
                          : 'acknowledgment',
                      },
                    })
                  }
                />
                <Field label="Предпочитан законен провайдер">
                  <select
                    className="ov-field"
                    value={
                      prefs.experience.businessRoom?.preferredLegalProvider ||
                      'yousign'
                    }
                    onChange={(e) =>
                      patchExperience({
                        businessRoom: {
                          ...(prefs.experience.businessRoom ||
                            DEFAULT_BUSINESS_ROOM),
                          preferredLegalProvider: e.target.value as
                            | 'yousign'
                            | 'docusign'
                            | 'adobe_sign'
                            | 'dropbox_sign',
                        },
                      })
                    }
                  >
                    <option value="yousign">Yousign (EU eIDAS)</option>
                    <option value="docusign">DocuSign (ESIGN)</option>
                    <option value="adobe_sign">Adobe Sign</option>
                    <option value="dropbox_sign">Dropbox Sign</option>
                  </select>
                </Field>
              </div>
              ) : null}

              {plan === 'business' ? (
              <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-3 space-y-3">
                <div>
                  <p className="text-xs font-bold text-rose-800 dark:text-rose-100">
                    Реклами при почивка (Business · по желание)
                  </p>
                  <p className="text-[10px] text-[var(--muted)]">
                    Показват се само след тишина в разговора — не прекъсват
                    говоренето.
                  </p>
                </div>
                <ToggleRow
                  label="Включи реклами при почивка"
                  checked={Boolean(
                    (prefs.ads || DEFAULT_ADS).business.enabled
                  )}
                  onChange={(v) =>
                    patchAds({
                      business: {
                        ...(prefs.ads || DEFAULT_ADS).business,
                        enabled: v,
                      },
                    })
                  }
                />
                {(prefs.ads || DEFAULT_ADS).business.enabled ? (
                  <>
                    <Field
                      label={`Тишина за почивка (${(prefs.ads || DEFAULT_ADS).business.breakSilenceSec}s)`}
                    >
                      <input
                        type="range"
                        min={5}
                        max={45}
                        step={1}
                        value={(prefs.ads || DEFAULT_ADS).business.breakSilenceSec}
                        onChange={(e) =>
                          patchAds({
                            business: {
                              ...(prefs.ads || DEFAULT_ADS).business,
                              breakSilenceSec: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full"
                      />
                    </Field>
                    <Field label="Къде да се показва">
                      <select
                        className="ov-field"
                        value={(prefs.ads || DEFAULT_ADS).business.placement}
                        onChange={(e) =>
                          patchAds({
                            business: {
                              ...(prefs.ads || DEFAULT_ADS).business,
                              placement: e.target.value as AdPlacement,
                            },
                          })
                        }
                      >
                        {AD_PLACEMENTS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.labelBg} — {p.hint}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Макс. реклами на обаждане">
                      <input
                        className="ov-field"
                        type="number"
                        min={0}
                        max={10}
                        value={(prefs.ads || DEFAULT_ADS).business.maxAdsPerCall}
                        onChange={(e) =>
                          patchAds({
                            business: {
                              ...(prefs.ads || DEFAULT_ADS).business,
                              maxAdsPerCall: Number(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </Field>
                    {((prefs.ads || DEFAULT_ADS).business.creatives[0]
                      ? [(prefs.ads || DEFAULT_ADS).business.creatives[0]]
                      : []
                    ).map((c) => (
                      <div key={c.id} className="grid gap-2">
                        <Field label="Заглавие на спонсора">
                          <input
                            className="ov-field"
                            value={c.title}
                            onChange={(e) => {
                              const creatives = [
                                ...(prefs.ads || DEFAULT_ADS).business.creatives,
                              ]
                              creatives[0] = { ...c, title: e.target.value }
                              patchAds({
                                business: {
                                  ...(prefs.ads || DEFAULT_ADS).business,
                                  creatives,
                                },
                              })
                            }}
                          />
                        </Field>
                        <Field label="Текст">
                          <textarea
                            className="ov-field min-h-[60px]"
                            value={c.body}
                            onChange={(e) => {
                              const creatives = [
                                ...(prefs.ads || DEFAULT_ADS).business.creatives,
                              ]
                              creatives[0] = { ...c, body: e.target.value }
                              patchAds({
                                business: {
                                  ...(prefs.ads || DEFAULT_ADS).business,
                                  creatives,
                                },
                              })
                            }}
                          />
                        </Field>
                        <Field label="Медия URL (по желание)">
                          <input
                            className="ov-field"
                            placeholder="https://…/banner.jpg"
                            value={c.mediaUrl}
                            onChange={(e) => {
                              const creatives = [
                                ...(prefs.ads || DEFAULT_ADS).business.creatives,
                              ]
                              creatives[0] = {
                                ...c,
                                mediaUrl: e.target.value,
                                format: e.target.value ? 'image' : 'text',
                              }
                              patchAds({
                                business: {
                                  ...(prefs.ads || DEFAULT_ADS).business,
                                  creatives,
                                },
                              })
                            }}
                          />
                        </Field>
                        <Field label="Линк при клик">
                          <input
                            className="ov-field"
                            placeholder="https://…"
                            value={c.clickUrl}
                            onChange={(e) => {
                              const creatives = [
                                ...(prefs.ads || DEFAULT_ADS).business.creatives,
                              ]
                              creatives[0] = { ...c, clickUrl: e.target.value }
                              patchAds({
                                business: {
                                  ...(prefs.ads || DEFAULT_ADS).business,
                                  creatives,
                                },
                              })
                            }}
                          />
                        </Field>
                      </div>
                    ))}
                  </>
                ) : null}
              </div>
              ) : null}

              <div className="rounded-2xl border border-teal-500/25 bg-teal-500/5 p-3 space-y-2">
                <p className="text-xs font-bold text-teal-800 dark:text-teal-100">
                  Find My (като iPhone)
                </p>
                <p className="text-[10px] text-[var(--muted)]">
                  Google Maps с точни координати · opt-in · кръгът се настройва
                  от бутона Find My в дашборда. За всички пинове наведнъж сложи{' '}
                  <code className="text-[9px]">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>.
                </p>
                <ToggleRow
                  label="Включи Find My (споделяй GPS)"
                  checked={Boolean(prefs.profileSocial?.geoShare?.enabled)}
                  onChange={(v) =>
                    updatePrefs((current) => ({
                      profileSocial: {
                        ...current.profileSocial,
                        geoShare: {
                          ...current.profileSocial.geoShare,
                          enabled: v,
                          precision: v
                            ? 'precise'
                            : current.profileSocial.geoShare?.precision ||
                              'city',
                          last: v ? current.profileSocial.geoShare?.last : null,
                          circleIds:
                            current.profileSocial.geoShare?.circleIds || [],
                        },
                        showOnMap: v
                          ? true
                          : current.profileSocial.showOnMap,
                      },
                    }))
                  }
                />
                <Field label="Прецизност">
                  <select
                    className="ov-field"
                    value={
                      prefs.profileSocial?.geoShare?.precision || 'city'
                    }
                    onChange={(e) =>
                      updatePrefs((current) => ({
                        profileSocial: {
                          ...current.profileSocial,
                          geoShare: {
                            ...current.profileSocial.geoShare,
                            precision: e.target.value as 'precise' | 'city',
                          },
                        },
                      }))
                    }
                  >
                    <option value="city">Град (по-приватно)</option>
                    <option value="precise">Точно GPS</option>
                  </select>
                </Field>
                <p className="text-[10px] text-[var(--muted)]">
                  В кръга:{' '}
                  {(prefs.profileSocial?.geoShare?.circleIds || []).length}{' '}
                  души
                </p>
              </div>
            </div>
          )}

          {tab === 'subscribers' && (
            <div className="space-y-3">
              <SectionTitle icon={Users} title="Абонати" />
              <div className="grid gap-2">
                <input
                  className="ov-field"
                  placeholder="Име"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                />
                <input
                  className="ov-field"
                  placeholder="Имейл или телефон"
                  value={newSubContact}
                  onChange={(e) => setNewSubContact(e.target.value)}
                />
                <button
                  type="button"
                  className="ov-btn-primary"
                  onClick={addSubscriber}
                >
                  Добави абонат
                </button>
              </div>
              <ul className="space-y-2">
                {prefs.subscribers.map((sub) => (
                  <li
                    key={sub.id}
                    className="rounded-2xl border border-[var(--panel-border)] bg-[var(--chip)] px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{sub.name}</p>
                      <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] text-[var(--accent)]">
                        {sub.presence || sub.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {sub.email || sub.phone || '—'}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === 'secretary' && (
            <div className="space-y-3">
              <SectionTitle icon={Phone} title="AI секретар" />
              {!user ? (
                <p className="text-sm text-[var(--muted)]">
                  Регистрирай се, за да управляваш секретаря.
                </p>
              ) : !canSecretary ? (
                <div className="rounded-2xl border border-dashed border-[var(--panel-border)] p-4 text-sm text-[var(--muted)]">
                  Само в Business и Podcast & Streaming.
                </div>
              ) : (
                <>
                  <ToggleRow
                    label="Активирай AI секретар"
                    checked={user.secretaryEnabled}
                    onChange={(checked) =>
                      patchUser({ secretaryEnabled: checked })
                    }
                  />
                  <Field label="Телефон за връзка">
                    <input
                      className="ov-field"
                      type="tel"
                      value={user.secretaryPhone}
                      onChange={(e) =>
                        patchUser({ secretaryPhone: e.target.value })
                      }
                      disabled={!user.secretaryEnabled}
                    />
                  </Field>
                </>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: typeof Headphones
  title: string
}) {
  return (
    <p className="flex items-center gap-2 text-sm font-semibold">
      <Icon className="h-4 w-4 text-[var(--accent)]" />
      {title}
    </p>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-[var(--muted)]">{label}</span>
      {children}
    </label>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--chip)] px-3 py-2">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl bg-[var(--chip)] px-3 py-2.5">
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  )
}

function ThemeBlock({
  theme,
  appearance,
  onSelectTheme,
  onAppearance,
}: {
  theme: string
  appearance: AppearanceSettings
  onSelectTheme: (id: ThemeId) => void
  onAppearance: (patch: Partial<AppearanceSettings>) => void
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--chip)] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        Тема
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {THEME_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelectTheme(opt.id)}
            className={`overflow-hidden rounded-xl border text-left ${
              theme === opt.id
                ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/35'
                : 'border-[var(--panel-border)]'
            }`}
          >
            <span
              className="block h-8 w-full"
              style={{ background: opt.swatch }}
            />
            <span className="block px-1.5 py-1 text-[10px] font-semibold">
              {opt.labelBg}
            </span>
          </button>
        ))}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-xs">
        <input
          type="file"
          accept="image/*"
          className="text-[11px]"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            if (file.size > 4.5 * 1024 * 1024) {
              window.alert('Макс. 4.5 MB')
              return
            }
            const reader = new FileReader()
            reader.onload = () => {
              if (typeof reader.result === 'string') {
                onAppearance({
                  customWallpaper: reader.result,
                  wallpaperId: 'custom',
                })
              }
            }
            reader.readAsDataURL(file)
          }}
        />
        Собствен фон (по желание)
      </label>
      {appearance.customWallpaper ? (
        <button
          type="button"
          className="ov-btn-ghost !text-xs"
          onClick={() =>
            onAppearance({ customWallpaper: null, wallpaperId: 'none' })
          }
        >
          Премахни собствения фон
        </button>
      ) : null}
    </div>
  )
}

function MusicRow({
  track,
  active,
  onSelect,
}: {
  track: MusicTrack
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border px-3 py-2.5 text-left ${
        active
          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
          : 'border-[var(--panel-border)] bg-[var(--chip)]'
      }`}
    >
      <p className="text-sm font-semibold">{track.title}</p>
      <p className="text-xs text-[var(--muted)]">
        {track.mood} · {track.plan}
      </p>
    </button>
  )
}
