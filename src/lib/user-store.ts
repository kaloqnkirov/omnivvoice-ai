'use client'

import type {
  AuthProvider,
  BlockedContact,
  Conversation,
  InviteLink,
  SocialLink,
} from '@/lib/auth-types'
import type { PlanId } from '@/lib/languages'
import type { StreamPlatformId } from '@/lib/platforms'
import {
  DEFAULT_PROFILE_SOCIAL,
  type ProfileSocial,
} from '@/lib/profile-social'
import { DEFAULT_SNAP_PLUS, type SnapPlusState } from '@/lib/snap-plus'
import {
  DEFAULT_APPEARANCE,
  type AppearanceSettings,
  type ThemeId,
} from '@/lib/appearance'
import type { CustomStudioRoom } from '@/lib/studio-rooms'

export type ContactMethod = 'email' | 'phone'

export type PresenceStatus =
  | 'online'
  | 'writing'
  | 'speaking'
  | 'in_call'
  | 'in_studio'
  | 'offline'

export type OmniUser = {
  id: string
  fullName: string
  displayName: string
  email: string
  phone: string
  password: string
  avatarDataUrl: string
  contactMethod: ContactMethod
  nativeLanguage: string
  company: string
  plan: PlanId
  planPaid: boolean
  /** Plans the user has unlocked (can switch among these in the menu) */
  unlockedPlans?: PlanId[]
  /** Platform owner — everything free, all modes unlocked */
  isAdmin: boolean
  authProvider: AuthProvider
  secretaryEnabled: boolean
  secretaryPhone: string
  createdAt: string
}

export type Subscriber = {
  id: string
  name: string
  email: string
  phone: string
  language: string
  status: 'active' | 'invited' | 'paused' | 'blocked'
  plan: PlanId
  presence?: PresenceStatus
  avatarDataUrl?: string
  source?: AuthProvider | 'manual' | 'website'
}

export type RoomSettings = {
  name: string
  roomId: string
  lighting: 'soft' | 'studio' | 'neon' | 'cinematic' | 'daylight'
  cameraPreset: 'close' | 'medium' | 'wide' | 'presenter'
  backgroundBlur: boolean
  virtualBackground: boolean
  mirrorVideo: boolean
  hdVideo: boolean
  frameRate: 24 | 30 | 60
  noiseSuppression: boolean
  echoCancellation: boolean
  autoGainControl: boolean
  micDevice: string
  cameraDevice: string
  speakerDevice: string
  autoSubtitles: boolean
  subtitleSize: 's' | 'm' | 'l'
  allowGuests: boolean
  guestLinkCode: string
  guestExpiresMinutes: number
  privacyEphemeral: boolean
  waitingRoom: boolean
  knockToEnter: boolean
  lockRoom: boolean
  maxParticipants: number
  screenShareQuality: 'auto' | 'sharp' | 'smooth'
  recordingQuality: '720p' | '1080p' | '4k'
  dualTrackRecording: boolean
  lobbyMusic: boolean
  /** Virtual office plate id from STUDIO_ROOMS */
  studioRoomId: string
  customBackground: string | null
  /** User-uploaded office/studio plates (persisted) */
  customStudioRooms: CustomStudioRoom[]
  videoFilter: 'none' | 'cinema' | 'warm' | 'cool' | 'soft' | 'vivid' | 'noir'
  videoQuality: 'auto' | '360p' | '720p' | '1080p'
}

export type ChatSettings = {
  readReceipts: boolean
  typingIndicators: boolean
  linkPreviews: boolean
  mediaCompression: boolean
  enterToSend: boolean
  spellcheck: boolean
  disappearingMessages: 'off' | '24h' | '7d' | 'after_seen'
  mediaAutoDownload: boolean
  voiceMessages: boolean
  reactions: boolean
  replyThreads: boolean
  pinChats: boolean
  archiveChats: boolean
  muteNotifications: boolean
  mentionAlerts: boolean
  translationPreview: boolean
  saveToGallery: boolean
  blockedAtRest: boolean
  groupChatEnabled: boolean
  maxAttachmentMb: number
}

export type PlatformConnection = {
  connected: boolean
  account: string
  streamKey: string
  rtmpUrl: string
  autoPublish: boolean
}

export type PodcastSettings = {
  showTitle: string
  episodeTitle: string
  description: string
  tags: string
  language: string
  layout: 'grid' | 'spotlight' | 'cinema' | 'vertical'
  resolution: '720p' | '1080p' | '1440p' | '4k'
  bitrateKbps: number
  fps: 24 | 30 | 60
  audioBitrateKbps: 128 | 192 | 256 | 320
  obsEnabled: boolean
  obsScene: string
  multistream: boolean
  lowerThirds: boolean
  countdown: boolean
  autoClips916: boolean
  autoChapters: boolean
  liveChatModeration: boolean
  slowModeSeconds: number
  subscriberOnlyChat: boolean
  donateAlerts: boolean
  brandLogo: boolean
  watermark: boolean
  endScreen: boolean
  vodSave: boolean
  rssFeedUrl: string
  platforms: Record<StreamPlatformId, PlatformConnection>
}

export type NotificationSettings = {
  desktopPush: boolean
  soundEnabled: boolean
  callRingtone: boolean
  messagePreview: boolean
  emailDigest: boolean
  quietHours: boolean
  quietFrom: string
  quietTo: string
}

export type VoiceSettings = {
  voiceURI: string
  rate: number
  pitch: number
  targetLanguage: string
  emotionSafe: boolean
  tone: 'natural' | 'formal' | 'casual'
}

export type MusicSettings = {
  enabled: boolean
  trackId: string
  volume: number
  duckDuringSpeech: boolean
}

export type Phrase = {
  id: string
  category: 'sales' | 'travel' | 'podcast' | 'general'
  text: string
  language: string
}

export type ExperienceSettings = {
  smartReplies: boolean
  callRecap: boolean
  showPresence: boolean
  phrasebook: Phrase[]
}

export type WebsiteChannel = 'chat' | 'call' | 'both'

export type WebsiteConnection = {
  id: string
  name: string
  domain: string
  siteKey: string
  enabled: boolean
  channel: WebsiteChannel
  welcomeMessage: string
  hostLanguage: string
  visitorDefaultLanguage: string
  position: 'bottom-right' | 'bottom-left'
  showBranding: boolean
  onlineLabel: string
  createdAt: string
}

export type AppPreferences = {
  theme: ThemeId
  appearance: AppearanceSettings
  user: OmniUser | null
  subscribers: Subscriber[]
  blocked: BlockedContact[]
  conversations: Conversation[]
  invites: InviteLink[]
  socialLinks: SocialLink[]
  websites: WebsiteConnection[]
  room: RoomSettings
  chat: ChatSettings
  podcast: PodcastSettings
  notifications: NotificationSettings
  voice: VoiceSettings
  music: MusicSettings
  experience: ExperienceSettings
  presence: PresenceStatus
  profileSocial: ProfileSocial
  snapPlus: SnapPlusState
}

const STORAGE_KEY = 'omnivvoice.preferences.v8'

function emptyPlatform(): PlatformConnection {
  return {
    connected: false,
    account: '',
    streamKey: '',
    rtmpUrl: '',
    autoPublish: false,
  }
}

export const DEFAULT_PLATFORMS: Record<StreamPlatformId, PlatformConnection> = {
  youtube: {
    ...emptyPlatform(),
    rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
  },
  tiktok: { ...emptyPlatform(), rtmpUrl: 'rtmps://push.tiktokcdn.com/live' },
  facebook: {
    ...emptyPlatform(),
    rtmpUrl: 'rtmps://live-api-s.facebook.com:443/rtmp/',
  },
  instagram: { ...emptyPlatform() },
  twitch: {
    ...emptyPlatform(),
    rtmpUrl: 'rtmp://live.twitch.tv/app',
  },
  linkedin: { ...emptyPlatform() },
  x: { ...emptyPlatform() },
  kick: { ...emptyPlatform(), rtmpUrl: 'rtmps://stream.kick.com/live' },
  discord: { ...emptyPlatform() },
  spotify: { ...emptyPlatform() },
  apple_podcasts: { ...emptyPlatform() },
  rumble: { ...emptyPlatform() },
}

export const DEFAULT_ROOM: RoomSettings = {
  name: 'My OmniVoice Room',
  roomId: 'ov-room-001',
  lighting: 'studio',
  cameraPreset: 'medium',
  backgroundBlur: true,
  virtualBackground: true,
  mirrorVideo: true,
  hdVideo: true,
  frameRate: 30,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
  micDevice: 'default',
  cameraDevice: 'default',
  speakerDevice: 'default',
  autoSubtitles: true,
  subtitleSize: 'm',
  allowGuests: false,
  guestLinkCode: 'guest-welcome',
  guestExpiresMinutes: 30,
  privacyEphemeral: false,
  waitingRoom: true,
  knockToEnter: true,
  lockRoom: false,
  maxParticipants: 8,
  screenShareQuality: 'auto',
  recordingQuality: '1080p',
  dualTrackRecording: true,
  lobbyMusic: true,
  studioRoomId: 'glass-office',
  customBackground: null,
  customStudioRooms: [],
  videoFilter: 'none',
  videoQuality: '1080p',
}

export const DEFAULT_CHAT: ChatSettings = {
  readReceipts: true,
  typingIndicators: true,
  linkPreviews: true,
  mediaCompression: true,
  enterToSend: true,
  spellcheck: true,
  disappearingMessages: 'off',
  mediaAutoDownload: true,
  voiceMessages: true,
  reactions: true,
  replyThreads: true,
  pinChats: true,
  archiveChats: true,
  muteNotifications: false,
  mentionAlerts: true,
  translationPreview: true,
  saveToGallery: false,
  blockedAtRest: true,
  groupChatEnabled: true,
  maxAttachmentMb: 25,
}

export const DEFAULT_PODCAST: PodcastSettings = {
  showTitle: 'OmniVoice Live',
  episodeTitle: 'Episode 01 — Realtime AI',
  description: 'Live multilingual show with translated hosts.',
  tags: 'ai, translation, podcast, live',
  language: 'en',
  layout: 'grid',
  resolution: '1080p',
  bitrateKbps: 4500,
  fps: 30,
  audioBitrateKbps: 192,
  obsEnabled: true,
  obsScene: 'Main Studio',
  multistream: true,
  lowerThirds: true,
  countdown: true,
  autoClips916: true,
  autoChapters: true,
  liveChatModeration: true,
  slowModeSeconds: 5,
  subscriberOnlyChat: false,
  donateAlerts: true,
  brandLogo: true,
  watermark: false,
  endScreen: true,
  vodSave: true,
  rssFeedUrl: '',
  platforms: DEFAULT_PLATFORMS,
}

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  desktopPush: true,
  soundEnabled: true,
  callRingtone: true,
  messagePreview: true,
  emailDigest: false,
  quietHours: false,
  quietFrom: '22:00',
  quietTo: '08:00',
}

export const DEFAULT_VOICE: VoiceSettings = {
  voiceURI: '',
  rate: 1,
  pitch: 1,
  targetLanguage: 'en',
  emotionSafe: true,
  tone: 'natural',
}

export const DEFAULT_MUSIC: MusicSettings = {
  enabled: false,
  trackId: 'soft-lounge',
  volume: 0.28,
  duckDuringSpeech: true,
}

export const DEFAULT_PHRASEBOOK: Phrase[] = [
  {
    id: 'ph1',
    category: 'general',
    text: 'Здравей! Радвам се, че се чуваме.',
    language: 'bg',
  },
  {
    id: 'ph2',
    category: 'sales',
    text: 'Можем да започнем пилот за 14 дни без риск.',
    language: 'bg',
  },
  {
    id: 'ph3',
    category: 'podcast',
    text: 'Welcome back — today we go live with realtime AI.',
    language: 'en',
  },
  {
    id: 'ph4',
    category: 'travel',
    text: 'Could you repeat that a bit slower, please?',
    language: 'en',
  },
]

export const DEFAULT_EXPERIENCE: ExperienceSettings = {
  smartReplies: true,
  callRecap: true,
  showPresence: true,
  phrasebook: DEFAULT_PHRASEBOOK,
}

export const DEFAULT_SOCIAL_LINKS: SocialLink[] = [
  {
    provider: 'google',
    connected: false,
    label: 'Google',
    canImportContacts: true,
  },
  {
    provider: 'facebook',
    connected: false,
    label: 'Facebook',
    canImportContacts: true,
  },
  {
    provider: 'apple',
    connected: false,
    label: 'Apple',
    canImportContacts: false,
  },
  {
    provider: 'phone',
    connected: false,
    label: 'Телефон / контакти',
    canImportContacts: true,
  },
]

export const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    title: 'Мария Петрова',
    isGroup: false,
    members: [
      {
        id: 'm1',
        name: 'Мария Петрова',
        language: 'bg',
        presence: 'online',
      },
    ],
    lastMessage: 'Да се чуем след малко?',
    updatedAt: '2026-10-19T14:02:00.000Z',
    unread: 2,
    pinned: true,
    muted: false,
    saveChat: true,
    disappearAfter: 'off',
    sessionOpen: true,
    activeGuestIds: [],
    messages: [
      {
        id: 'cm1',
        fromMe: false,
        text: 'Здравей! Готови ли сте за демото?',
        createdAt: '2026-10-19T14:00:00.000Z',
        status: 'read',
      },
      {
        id: 'cm2',
        fromMe: true,
        text: 'Да — пускам превода на живо.',
        createdAt: '2026-10-19T14:02:00.000Z',
        status: 'read',
      },
    ],
  },
  {
    id: 'conv-2',
    title: 'Studio Crew',
    isGroup: true,
    members: [
      { id: 'g1', name: 'Alex', language: 'es', presence: 'online' },
      { id: 'g2', name: 'Yuki', language: 'ja', presence: 'in_studio' },
      { id: 'g3', name: 'Producer', language: 'en', presence: 'writing' },
    ],
    lastMessage: 'Shorts pipeline is ready',
    updatedAt: '2026-10-19T13:40:00.000Z',
    unread: 0,
    pinned: false,
    muted: false,
    saveChat: true,
    disappearAfter: '24h',
    sessionOpen: true,
    activeGuestIds: [],
    messages: [
      {
        id: 'cg1',
        fromMe: false,
        text: 'Shorts pipeline is ready',
        createdAt: '2026-10-19T13:40:00.000Z',
        status: 'delivered',
      },
    ],
  },
]

export const DEMO_WEBSITES: WebsiteConnection[] = [
  {
    id: 'web-1',
    name: 'Моят сайт',
    domain: 'mysite.bg',
    siteKey: 'ov_demo_mysite',
    enabled: true,
    channel: 'both',
    welcomeMessage: 'Здравей! Пиши или звънни — превеждаме на живо.',
    hostLanguage: 'bg',
    visitorDefaultLanguage: 'en',
    position: 'bottom-right',
    showBranding: true,
    onlineLabel: 'Онлайн сега',
    createdAt: '2026-10-19T12:00:00.000Z',
  },
]

export const DEMO_SUBSCRIBERS: Subscriber[] = [
  {
    id: 'sub-1',
    name: 'Maria Petrova',
    email: 'maria@studio.bg',
    phone: '+359888112233',
    language: 'bg',
    status: 'active',
    plan: 'business',
    presence: 'online',
    source: 'manual',
  },
  {
    id: 'sub-2',
    name: 'Alex Rivera',
    email: 'alex@global.io',
    phone: '+34600111222',
    language: 'es',
    status: 'active',
    plan: 'free',
    presence: 'writing',
    source: 'website',
  },
  {
    id: 'sub-3',
    name: 'Yuki Tanaka',
    email: 'yuki@tokyo.jp',
    phone: '+819012345678',
    language: 'ja',
    status: 'invited',
    plan: 'podcast',
    presence: 'in_studio',
    source: 'google',
  },
]

const THEME_IDS: ThemeId[] = [
  'light',
  'dark',
  'midnight',
  'ocean',
  'sunset',
  'forest',
  'aurora',
  'carbon',
]

function normalizeTheme(value: unknown): ThemeId {
  return THEME_IDS.includes(value as ThemeId) ? (value as ThemeId) : 'dark'
}

function defaults(): AppPreferences {
  return {
    theme: 'dark',
    appearance: DEFAULT_APPEARANCE,
    user: null,
    subscribers: DEMO_SUBSCRIBERS,
    blocked: [],
    conversations: DEMO_CONVERSATIONS,
    invites: [],
    socialLinks: DEFAULT_SOCIAL_LINKS,
    websites: DEMO_WEBSITES,
    room: DEFAULT_ROOM,
    chat: DEFAULT_CHAT,
    podcast: DEFAULT_PODCAST,
    notifications: DEFAULT_NOTIFICATIONS,
    voice: DEFAULT_VOICE,
    music: DEFAULT_MUSIC,
    experience: DEFAULT_EXPERIENCE,
    presence: 'online',
    profileSocial: DEFAULT_PROFILE_SOCIAL,
    snapPlus: DEFAULT_SNAP_PLUS,
  }
}

export function loadPreferences(): AppPreferences {
  if (typeof window === 'undefined') return defaults()

  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ||
      window.localStorage.getItem('omnivvoice.preferences.v7') ||
      window.localStorage.getItem('omnivvoice.preferences.v6') ||
      window.localStorage.getItem('omnivvoice.preferences.v5') ||
      window.localStorage.getItem('omnivvoice.preferences.v4') ||
      window.localStorage.getItem('omnivvoice.preferences.v3') ||
      window.localStorage.getItem('omnivvoice.preferences.v2') ||
      window.localStorage.getItem('omnivvoice.preferences.v1')
    if (!raw) return defaults()
    const parsed = JSON.parse(raw) as Partial<AppPreferences>
    const base = defaults()
    const user = parsed.user
      ? {
          ...parsed.user,
          password: parsed.user.password || '',
          avatarDataUrl: parsed.user.avatarDataUrl || '',
          planPaid:
            typeof parsed.user.planPaid === 'boolean'
              ? parsed.user.planPaid
              : parsed.user.plan === 'free',
          unlockedPlans: Array.isArray(
            (parsed.user as OmniUser).unlockedPlans
          )
            ? (parsed.user as OmniUser).unlockedPlans
            : parsed.user.plan === 'free'
              ? (['free'] as PlanId[])
              : parsed.user.planPaid
                ? (['free', parsed.user.plan] as PlanId[])
                : (['free'] as PlanId[]),
          isAdmin: Boolean(parsed.user.isAdmin),
          authProvider: parsed.user.authProvider || ('email' as AuthProvider),
        }
      : null
    const theme = normalizeTheme(parsed.theme || parsed.appearance?.theme)
    return {
      theme,
      appearance: {
        ...DEFAULT_APPEARANCE,
        ...(parsed.appearance || {}),
        theme: normalizeTheme(parsed.appearance?.theme || theme),
      },
      user,
      subscribers: parsed.subscribers?.length
        ? parsed.subscribers
        : DEMO_SUBSCRIBERS,
      blocked: parsed.blocked || [],
      conversations: (parsed.conversations?.length
        ? parsed.conversations
        : DEMO_CONVERSATIONS
      ).map((conv) => ({
        ...conv,
        sessionOpen:
          typeof conv.sessionOpen === 'boolean' ? conv.sessionOpen : true,
        activeGuestIds: conv.activeGuestIds || [],
        archived: Boolean((conv as Conversation & { archived?: boolean }).archived),
        joinRequests: Array.isArray(
          (conv as Conversation & { joinRequests?: unknown }).joinRequests
        )
          ? (conv as Conversation).joinRequests
          : [],
      })),
      invites: parsed.invites || [],
      socialLinks: parsed.socialLinks?.length
        ? parsed.socialLinks
        : DEFAULT_SOCIAL_LINKS,
      websites: parsed.websites?.length ? parsed.websites : DEMO_WEBSITES,
      room: {
        ...base.room,
        ...parsed.room,
        customStudioRooms: parsed.room?.customStudioRooms || [],
      },
      chat: { ...base.chat, ...parsed.chat },
      podcast: {
        ...base.podcast,
        ...parsed.podcast,
        platforms: {
          ...base.podcast.platforms,
          ...(parsed.podcast?.platforms || {}),
        },
      },
      notifications: { ...base.notifications, ...parsed.notifications },
      voice: { ...base.voice, ...parsed.voice },
      music: { ...base.music, ...parsed.music },
      experience: {
        ...base.experience,
        ...parsed.experience,
        phrasebook:
          parsed.experience?.phrasebook?.length
            ? parsed.experience.phrasebook
            : DEFAULT_PHRASEBOOK,
      },
      presence: parsed.presence || 'online',
      profileSocial: {
        ...DEFAULT_PROFILE_SOCIAL,
        ...(parsed.profileSocial || {}),
        stories: parsed.profileSocial?.stories || [],
      },
      snapPlus: {
        ...DEFAULT_SNAP_PLUS,
        ...(parsed.snapPlus || {}),
        friendships: parsed.snapPlus?.friendships || {},
        memories: parsed.snapPlus?.memories?.length
          ? parsed.snapPlus.memories
          : DEFAULT_SNAP_PLUS.memories,
        spotlight: parsed.snapPlus?.spotlight?.length
          ? parsed.snapPlus.spotlight
          : DEFAULT_SNAP_PLUS.spotlight,
      },
    }
  } catch {
    return defaults()
  }
}

export function savePreferences(prefs: AppPreferences) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

export function createUserId() {
  return `user_${Math.random().toString(36).slice(2, 10)}`
}

export function createGuestSession(room: RoomSettings) {
  return {
    roomId: room.roomId,
    code: room.guestLinkCode,
    expiresAt: Date.now() + room.guestExpiresMinutes * 60 * 1000,
  }
}

export function connectedPlatformIds(podcast: PodcastSettings): StreamPlatformId[] {
  return (Object.keys(podcast.platforms) as StreamPlatformId[]).filter(
    (id) => podcast.platforms[id].connected
  )
}
