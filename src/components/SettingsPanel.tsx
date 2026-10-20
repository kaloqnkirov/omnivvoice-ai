'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { tracksForPlan, type MusicTrack } from '@/lib/music'
import { STREAM_PLATFORMS, type StreamPlatformId } from '@/lib/platforms'
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
import { useTheme } from '@/lib/theme'

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

type SettingsPanelProps = {
  open: boolean
  onClose: () => void
  onOpenRegister: () => void
}

const TABS: Array<[Tab, string]> = [
  ['account', 'Акаунт'],
  ['websites', 'Сайтове'],
  ['room', 'Стая'],
  ['chat', 'Чат'],
  ['podcast', 'Подкаст'],
  ['platforms', 'Платформи'],
  ['guests', 'Guest'],
  ['voice', 'Глас'],
  ['music', 'Музика'],
  ['privacy', 'Privacy'],
  ['notifications', 'Известия'],
  ['phrasebook', 'Фрази'],
  ['experience', 'Experience'],
  ['subscribers', 'Абонати'],
  ['secretary', 'Секретар'],
]

export default function SettingsPanel({
  open,
  onClose,
  onOpenRegister,
}: SettingsPanelProps) {
  const { theme, toggleTheme, prefs, updatePrefs } = useTheme()
  const [tab, setTab] = useState<Tab>('account')
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
    'all' | 'video' | 'social' | 'audio' | 'community'
  >('all')

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const load = () => setVoices(window.speechSynthesis.getVoices())
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [])

  const plan = prefs.user?.plan || 'free'
  const musicTracks = useMemo(() => tracksForPlan(plan), [plan])
  const podcastLocked = plan !== 'podcast' && plan !== 'business'

  const filteredVoices = useMemo(() => {
    const target = APP_LANGUAGES.find(
      (lang) => lang.code === prefs.voice.targetLanguage
    )
    if (!target) return voices
    const matched = voices.filter((voice) =>
      voice.lang.toLowerCase().startsWith(target.code)
    )
    return matched.length ? matched : voices
  }, [voices, prefs.voice.targetLanguage])

  const platforms = useMemo(() => {
    if (platformFilter === 'all') return STREAM_PLATFORMS
    return STREAM_PLATFORMS.filter((p) => p.category === platformFilter)
  }, [platformFilter])

  if (!open) return null

  const user = prefs.user
  const canSecretary = user ? planAllowsSecretary(user.plan) : false
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'
  const guestUrl = `${origin}/join?code=${encodeURIComponent(prefs.room.guestLinkCode)}&conv=${encodeURIComponent(prefs.conversations[0]?.id || 'conv-1')}&channel=both`
  const siteGuestHint = prefs.websites[0]
    ? `${origin}/join?site=${encodeURIComponent(prefs.websites[0].siteKey)}&conv=${encodeURIComponent(prefs.conversations[0]?.id || 'conv-1')}&channel=both`
    : guestUrl
  const connectedCount = Object.values(prefs.podcast.platforms).filter(
    (p) => p.connected
  ).length

  function patchRoom(patch: Partial<RoomSettings>) {
    updatePrefs({ room: { ...prefs.room, ...patch } })
  }
  function patchChat(patch: Partial<ChatSettings>) {
    updatePrefs({ chat: { ...prefs.chat, ...patch } })
  }
  function patchPodcast(patch: Partial<PodcastSettings>) {
    updatePrefs({ podcast: { ...prefs.podcast, ...patch } })
  }
  function patchPlatform(
    id: StreamPlatformId,
    patch: Partial<PodcastSettings['platforms'][StreamPlatformId]>
  ) {
    updatePrefs({
      podcast: {
        ...prefs.podcast,
        platforms: {
          ...prefs.podcast.platforms,
          [id]: { ...prefs.podcast.platforms[id], ...patch },
        },
      },
    })
  }
  function patchNotifications(patch: Partial<NotificationSettings>) {
    updatePrefs({ notifications: { ...prefs.notifications, ...patch } })
  }
  function patchVoice(patch: Partial<VoiceSettings>) {
    updatePrefs({ voice: { ...prefs.voice, ...patch } })
  }
  function patchMusic(patch: Partial<MusicSettings>) {
    updatePrefs({ music: { ...prefs.music, ...patch } })
  }
  function patchExperience(patch: Partial<ExperienceSettings>) {
    updatePrefs({ experience: { ...prefs.experience, ...patch } })
  }
  function patchUser(patch: Partial<NonNullable<AppPreferences['user']>>) {
    if (!prefs.user) return
    updatePrefs({ user: { ...prefs.user, ...patch } })
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
    updatePrefs({ subscribers: [subscriber, ...prefs.subscribers] })
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
    patchExperience({ phrasebook: [phrase, ...prefs.experience.phrasebook] })
    setNewPhrase('')
  }

  async function copyGuestLink() {
    try {
      await navigator.clipboard.writeText(guestUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
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
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/40 backdrop-blur-sm">
      <aside className="ov-panel flex h-full w-full max-w-xl flex-col border-l border-[var(--panel-border)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-5 py-4">
          <div>
            <p className="ov-kicker">Control center</p>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              Всички фини настройки
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Сайтове · Стая · Чат · Подкаст · {connectedCount} платформи
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={toggleTheme} className="ov-icon-btn">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button type="button" onClick={onClose} className="ov-icon-btn">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-[var(--panel-border)] px-3 py-2">
          {TABS.map(([id, label]) => (
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

        <div className="flex-1 overflow-y-auto px-5 py-4">
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
                    onClick={() => updatePrefs({ user: null })}
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
                onLight={() => updatePrefs({ theme: 'light' })}
                onDark={() => updatePrefs({ theme: 'dark' })}
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
              <SectionTitle icon={Headphones} title="Стая — фини настройки" />
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
                    <option value="default">System default</option>
                    <option value="headset">Headset mic</option>
                    <option value="usb">USB condenser</option>
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
                    <option value="default">System default</option>
                    <option value="front">Front camera</option>
                    <option value="dslr">Virtual DSLR</option>
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
                    <option value="default">System default</option>
                    <option value="headphones">Headphones</option>
                    <option value="monitor">Studio monitors</option>
                  </select>
                </Field>
              </div>
              <ToggleRow label="HD video" checked={prefs.room.hdVideo} onChange={(v) => patchRoom({ hdVideo: v })} />
              <ToggleRow label="Background blur" checked={prefs.room.backgroundBlur} onChange={(v) => patchRoom({ backgroundBlur: v })} />
              <ToggleRow label="Virtual background" checked={prefs.room.virtualBackground} onChange={(v) => patchRoom({ virtualBackground: v })} />
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
              {podcastLocked ? (
                <p className="rounded-xl border border-dashed border-[var(--panel-border)] px-3 py-2 text-xs text-[var(--muted)]">
                  Пълният broadcast пакет е най-богат в Podcast плана (Business също отключва част от live опциите).
                </p>
              ) : null}
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
                YouTube, TikTok, Facebook, Instagram, Twitch, LinkedIn, X, Kick,
                Discord, Spotify, Apple Podcasts, Rumble — stream keys + auto publish.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(
                  ['all', 'video', 'social', 'audio', 'community'] as const
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
                    {filter}
                  </button>
                ))}
              </div>
              {platforms.map((platform) => {
                const conn = prefs.podcast.platforms[platform.id]
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
                      <label className="flex items-center gap-2 text-xs">
                        <span>{conn.connected ? 'Connected' : 'Off'}</span>
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
                    {conn.connected ? (
                      <div className="mt-3 grid gap-2">
                        <input
                          className="ov-field"
                          placeholder="Account / channel"
                          value={conn.account}
                          onChange={(e) =>
                            patchPlatform(platform.id, {
                              account: e.target.value,
                            })
                          }
                        />
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
                            patchPlatform(platform.id, { autoPublish: v })
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                )
              })}
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
              <Field label="Език за превод / глас">
                <select
                  className="ov-field"
                  value={prefs.voice.targetLanguage}
                  onChange={(e) =>
                    patchVoice({ targetLanguage: e.target.value, voiceURI: '' })
                  }
                >
                  {APP_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} · {lang.nativeName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Избор на глас">
                <select
                  className="ov-field"
                  value={prefs.voice.voiceURI}
                  onChange={(e) => patchVoice({ voiceURI: e.target.value })}
                >
                  <option value="">Системен</option>
                  {filteredVoices.map((voice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} · {voice.lang}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`Скорост (${prefs.voice.rate.toFixed(1)})`}>
                <input
                  type="range"
                  min={0.7}
                  max={1.4}
                  step={0.05}
                  value={prefs.voice.rate}
                  onChange={(e) => patchVoice({ rate: Number(e.target.value) })}
                  className="w-full"
                />
              </Field>
              <Field label={`Височина (${prefs.voice.pitch.toFixed(1)})`}>
                <input
                  type="range"
                  min={0.7}
                  max={1.4}
                  step={0.05}
                  value={prefs.voice.pitch}
                  onChange={(e) =>
                    patchVoice({ pitch: Number(e.target.value) })
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
                План {PLANS[plan].label}: {musicTracks.length} писти
              </p>
              <ToggleRow
                label="Пусни музика"
                checked={prefs.music.enabled}
                onChange={(checked) => patchMusic({ enabled: checked })}
              />
              <ToggleRow
                label="Duck volume докато говориш"
                checked={prefs.music.duckDuringSpeech}
                onChange={(checked) =>
                  patchMusic({ duckDuringSpeech: checked })
                }
              />
              <Field label={`Сила (${Math.round(prefs.music.volume * 100)}%)`}>
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
              {musicTracks.map((track) => (
                <MusicRow
                  key={track.id}
                  track={track}
                  active={prefs.music.trackId === track.id}
                  onSelect={() =>
                    patchMusic({ trackId: track.id, enabled: true })
                  }
                />
              ))}
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
              <ToggleRow
                label="Call recap"
                checked={prefs.experience.callRecap}
                onChange={(checked) => patchExperience({ callRecap: checked })}
              />
              <ToggleRow
                label="Rich presence"
                checked={prefs.experience.showPresence}
                onChange={(checked) =>
                  patchExperience({ showPresence: checked })
                }
              />
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
  onLight,
  onDark,
}: {
  theme: string
  onLight: () => void
  onDark: () => void
}) {
  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--chip)] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        Тема
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onLight}
          className={`rounded-xl px-3 py-2 text-sm ${
            theme === 'light'
              ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
              : 'bg-[var(--panel)] text-[var(--muted)]'
          }`}
        >
          Light
        </button>
        <button
          type="button"
          onClick={onDark}
          className={`rounded-xl px-3 py-2 text-sm ${
            theme === 'dark'
              ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
              : 'bg-[var(--panel)] text-[var(--muted)]'
          }`}
        >
          Dark
        </button>
      </div>
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
