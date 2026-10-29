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
  normalizeThemeId,
  type AppearanceSettings,
  type ThemeId,
} from '@/lib/appearance'
import type { CustomStudioRoom } from '@/lib/studio-rooms'
import type { MyFaceLookId } from '@/lib/my-face'
import { parseAiRooms, type AiRoomSaved } from '@/lib/ai-rooms'
import {
  DEFAULT_STREAMING,
  type StreamingSettings,
} from '@/lib/streaming'
import {
  DEFAULT_BUSINESS_ROOM,
  normalizeBusinessRoom,
  type BusinessRoomPrefs,
} from '@/lib/business-presets'
import { DEFAULT_ADS, normalizeAds, type AdsSettings } from '@/lib/ads'
import {
  DEFAULT_MEET_MATCH,
  normalizeMeetMatch,
  type MeetMatchState,
} from '@/lib/meet-match'
import type { AdminPlanGrant } from '@/lib/admin-grants'
import { applyAdminGrantsToUser } from '@/lib/admin-grants'

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
  /** Styled variants from Avatar Studio */
  avatarGallery?: string[]
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
  /** real | contour (body cutout) | blur | oval CSS fallback */
  cutoutMode: 'real' | 'contour' | 'blur' | 'oval'
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
  /** Optional MyFace polish — each user opts in (like AI background) */
  myFaceEnabled: boolean
  myFaceLook: MyFaceLookId
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
  /** Any plan: allow recording conversations */
  allowRecording?: boolean
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
  /** Classic podcast studio vs content Streaming (Twitch-style) */
  sessionMode: 'podcast' | 'streaming'
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
  streaming: StreamingSettings
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
  /** Curated picker: 3F / 3M / 2 child — empty = Auto */
  voicePreset: string
  rate: number
  pitch: number
  targetLanguage: string
  emotionSafe: boolean
  tone: 'natural' | 'formal' | 'casual'
}

export type MusicSettings = {
  enabled: boolean
  /** Built-in Mixkit library vs Spotify embed */
  source: 'library' | 'spotify'
  trackId: string
  /** open.spotify.com / spotify: URI — used when source === 'spotify' */
  spotifyUrl: string
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
  /** Business plan: pre-configure room AI from notes → contract */
  businessRoom: BusinessRoomPrefs
  /** Podcast: trending questions / facts assistant */
  aiPodcastAssistant?: boolean
  /** Business: nudges mid-conversation (not on Normal) */
  aiBusinessCoach?: boolean
  /** Business: country etiquette advisor (default on) */
  aiCultureAdvisor?: boolean
  /** Pre-set podcast episode topic for AI */
  podcastTopic?: string
  /** ISO-ish country code for culture pack */
  partnerCountry?: string
  /** Normal plan: mini-games in chat */
  miniGames?: boolean
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
  /** Optional sponsor ads — Business & Podcast paid plans */
  ads: AdsSettings
  presence: PresenceStatus
  profileSocial: ProfileSocial
  snapPlus: SnapPlusState
  /** User-saved AI virtual rooms (capped by plan — see AI_ROOM_QUOTAS) */
  aiRooms: AiRoomSaved[]
  /** Stripe paid-content unlocks (content ids) */
  paidUnlocks: string[]
  /** Случайни запознанства — off by default */
  meetMatch: MeetMatchState
  /** Admin: free Business/Podcast entitlements by email */
  adminPlanGrants: AdminPlanGrant[]
  /** Extra Cloud Translation chars from invite bonuses */
  translateBonusChars: number
  /** How many referral invites were claimed for bonus */
  referralInvitesClaimed: number
}

const STORAGE_KEY = 'omnivvoice.preferences.v9'

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
  linkedin: {
    ...emptyPlatform(),
    rtmpUrl: 'rtmps://live-api.linkedin.com:443/rtc',
  },
  x: { ...emptyPlatform() },
  kick: { ...emptyPlatform(), rtmpUrl: 'rtmps://stream.kick.com/live' },
  discord: { ...emptyPlatform() },
  spotify: { ...emptyPlatform() },
  apple_podcasts: { ...emptyPlatform() },
  rumble: {
    ...emptyPlatform(),
    rtmpUrl: 'rtmp://live.rumble.com/live',
  },
  hbo: { ...emptyPlatform() },
  netflix: { ...emptyPlatform() },
  disney: { ...emptyPlatform() },
  prime: { ...emptyPlatform() },
  apple_tv: { ...emptyPlatform() },
  playstation: { ...emptyPlatform() },
  xbox: { ...emptyPlatform() },
  geforce_now: { ...emptyPlatform() },
  smart_tv: { ...emptyPlatform() },
}

export const DEFAULT_ROOM: RoomSettings = {
  name: 'My OmniVoice Room',
  roomId: 'ov-room-001',
  lighting: 'studio',
  cameraPreset: 'medium',
  backgroundBlur: false,
  virtualBackground: true,
  cutoutMode: 'contour',
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
  myFaceEnabled: false,
  myFaceLook: 'soft_glow',
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
  allowRecording: true,
}

export const DEFAULT_PODCAST: PodcastSettings = {
  showTitle: 'OmniVoice Live',
  episodeTitle: 'Episode 01 — Realtime AI',
  description: 'Live multilingual show with translated hosts.',
  tags: 'ai, translation, podcast, live',
  language: 'en',
  sessionMode: 'podcast',
  layout: 'grid',
  resolution: '1080p',
  bitrateKbps: 4500,
  fps: 30,
  audioBitrateKbps: 256,
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
  streaming: DEFAULT_STREAMING,
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
  voicePreset: '',
  rate: 1,
  pitch: 1,
  targetLanguage: 'en',
  emotionSafe: true,
  tone: 'natural',
}

export const DEFAULT_MUSIC: MusicSettings = {
  enabled: false,
  source: 'library',
  trackId: 'soft-lounge',
  spotifyUrl: '',
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
  businessRoom: DEFAULT_BUSINESS_ROOM,
  aiPodcastAssistant: true,
  aiBusinessCoach: true,
  aiCultureAdvisor: true,
  podcastTopic: '',
  partnerCountry: 'bg',
  miniGames: true,
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
    space: 'chat',
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
    space: 'room',
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

function normalizeTheme(value: unknown): ThemeId {
  return normalizeThemeId(value)
}

function defaults(): AppPreferences {
  return {
    theme: 'dark',
    appearance: DEFAULT_APPEARANCE,
    user: null,
    subscribers: [],
    blocked: [],
    conversations: [],
    invites: [],
    socialLinks: DEFAULT_SOCIAL_LINKS,
    websites: [],
    room: DEFAULT_ROOM,
    chat: DEFAULT_CHAT,
    podcast: DEFAULT_PODCAST,
    notifications: DEFAULT_NOTIFICATIONS,
    voice: DEFAULT_VOICE,
    music: DEFAULT_MUSIC,
    experience: DEFAULT_EXPERIENCE,
    ads: DEFAULT_ADS,
    presence: 'online',
    profileSocial: DEFAULT_PROFILE_SOCIAL,
    snapPlus: DEFAULT_SNAP_PLUS,
    aiRooms: [],
    paidUnlocks: [],
    meetMatch: DEFAULT_MEET_MATCH,
    adminPlanGrants: [],
    translateBonusChars: 0,
    referralInvitesClaimed: 0,
  }
}

export function loadPreferences(): AppPreferences {
  if (typeof window === 'undefined') return defaults()

  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ||
      window.localStorage.getItem('omnivvoice.preferences.v8') ||
      window.localStorage.getItem('omnivvoice.preferences.v7') ||
      window.localStorage.getItem('omnivvoice.preferences.v6') ||
      window.localStorage.getItem('omnivvoice.preferences.v5') ||
      window.localStorage.getItem('omnivvoice.preferences.v4') ||
      window.localStorage.getItem('omnivvoice.preferences.v3') ||
      window.localStorage.getItem('omnivvoice.preferences.v2') ||
      window.localStorage.getItem('omnivvoice.preferences.v1')
    if (!raw) return defaults()
    const parsed = JSON.parse(raw) as Partial<AppPreferences>
    const demoConvIds = new Set(DEMO_CONVERSATIONS.map((c) => c.id))
    const demoSubIds = new Set(DEMO_SUBSCRIBERS.map((s) => s.id))
    if (Array.isArray(parsed.conversations)) {
      parsed.conversations = parsed.conversations.filter(
        (c) =>
          !demoConvIds.has(c.id) &&
          !String(c.id).startsWith('demo_') &&
          !/studio crew|мария петрова/i.test(c.title || '')
      )
    }
    if (Array.isArray(parsed.subscribers)) {
      parsed.subscribers = parsed.subscribers.filter(
        (s) => !demoSubIds.has(s.id) && !String(s.id).startsWith('demo_')
      )
    }
    if (Array.isArray(parsed.websites)) {
      const demoWeb = new Set(DEMO_WEBSITES.map((w) => w.id))
      parsed.websites = parsed.websites.filter((w) => !demoWeb.has(w.id))
    }
    const base = defaults()
    const adminPlanGrants: AdminPlanGrant[] = Array.isArray(
      (parsed as { adminPlanGrants?: AdminPlanGrant[] }).adminPlanGrants
    )
      ? (parsed as { adminPlanGrants: AdminPlanGrant[] }).adminPlanGrants.filter(
          (g) =>
            g &&
            typeof g.email === 'string' &&
            (g.plan === 'business' || g.plan === 'podcast')
        )
      : []
    const rawUser = parsed.user
      ? {
          ...parsed.user,
          password: parsed.user.password || '',
          avatarDataUrl: parsed.user.avatarDataUrl || '',
          avatarGallery: Array.isArray(parsed.user.avatarGallery)
            ? parsed.user.avatarGallery.filter(
                (x): x is string => typeof x === 'string'
              ).slice(0, 12)
            : [],
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
    const user = rawUser
      ? applyAdminGrantsToUser(rawUser, adminPlanGrants)
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
      // Never re-seed demo Maria/Studio Crew when the user cleared lists
      subscribers: Array.isArray(parsed.subscribers) ? parsed.subscribers : [],
      blocked: parsed.blocked || [],
      conversations: (Array.isArray(parsed.conversations)
        ? parsed.conversations
        : []
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
      websites: Array.isArray(parsed.websites) ? parsed.websites : [],
      room: {
        ...base.room,
        ...parsed.room,
        customStudioRooms: parsed.room?.customStudioRooms || [],
        cutoutMode:
          parsed.room?.cutoutMode ||
          (parsed.room?.virtualBackground === false
            ? 'real'
            : parsed.room?.backgroundBlur
              ? 'blur'
              : 'contour'),
        myFaceEnabled: Boolean(parsed.room?.myFaceEnabled),
        myFaceLook: parsed.room?.myFaceLook || base.room.myFaceLook,
      },
      chat: { ...base.chat, ...parsed.chat },
      podcast: {
        ...base.podcast,
        ...parsed.podcast,
        sessionMode:
          parsed.podcast?.sessionMode === 'streaming' ||
          parsed.podcast?.sessionMode === 'podcast'
            ? parsed.podcast.sessionMode
            : base.podcast.sessionMode,
        platforms: {
          ...base.podcast.platforms,
          ...(parsed.podcast?.platforms || {}),
        },
        streaming: {
          ...DEFAULT_STREAMING,
          ...(parsed.podcast?.streaming || {}),
          paidContent: {
            ...DEFAULT_STREAMING.paidContent,
            ...(parsed.podcast?.streaming?.paidContent || {}),
          },
        },
      },
      notifications: { ...base.notifications, ...parsed.notifications },
      voice: {
        ...base.voice,
        ...parsed.voice,
        voicePreset:
          typeof parsed.voice?.voicePreset === 'string'
            ? parsed.voice.voicePreset
            : base.voice.voicePreset,
      },
      music: {
        ...base.music,
        ...parsed.music,
        source:
          parsed.music?.source === 'spotify' || parsed.music?.source === 'library'
            ? parsed.music.source
            : 'library',
        spotifyUrl: parsed.music?.spotifyUrl || '',
      },
      experience: {
        ...base.experience,
        ...parsed.experience,
        phrasebook:
          parsed.experience?.phrasebook?.length
            ? parsed.experience.phrasebook
            : DEFAULT_PHRASEBOOK,
        businessRoom: normalizeBusinessRoom(
          parsed.experience?.businessRoom || base.experience.businessRoom
        ),
      },
      ads: normalizeAds(parsed.ads),
      presence: parsed.presence || 'online',
      profileSocial: {
        ...DEFAULT_PROFILE_SOCIAL,
        ...(parsed.profileSocial || {}),
        stories: parsed.profileSocial?.stories || [],
        geoShare: {
          ...DEFAULT_PROFILE_SOCIAL.geoShare,
          ...(parsed.profileSocial?.geoShare || {}),
          circleIds: Array.isArray(parsed.profileSocial?.geoShare?.circleIds)
            ? parsed.profileSocial.geoShare.circleIds.filter(
                (x): x is string => typeof x === 'string'
              )
            : [],
        },
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
      paidUnlocks: Array.isArray(parsed.paidUnlocks)
        ? parsed.paidUnlocks.filter((x): x is string => typeof x === 'string')
        : [],
      aiRooms: parseAiRooms(
        parsed.aiRooms,
        user?.isAdmin ? 'podcast' : user?.plan || 'free'
      ),
      meetMatch: normalizeMeetMatch(parsed.meetMatch),
      adminPlanGrants,
      translateBonusChars:
        typeof (parsed as { translateBonusChars?: number }).translateBonusChars ===
        'number'
          ? Math.max(
              0,
              (parsed as { translateBonusChars: number }).translateBonusChars
            )
          : 0,
      referralInvitesClaimed:
        typeof (parsed as { referralInvitesClaimed?: number })
          .referralInvitesClaimed === 'number'
          ? Math.max(
              0,
              (parsed as { referralInvitesClaimed: number })
                .referralInvitesClaimed
            )
          : 0,
    }
  } catch {
    return defaults()
  }
}

export function savePreferences(prefs: AppPreferences) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch (err) {
    // QuotaExceeded from fat data: URLs — strip heavy custom banners and retry once
    const slim = {
      ...prefs,
      room: {
        ...prefs.room,
        customStudioRooms: (prefs.room.customStudioRooms || []).map((r) => ({
          ...r,
          imageDataUrl: r.imageDataUrl?.startsWith('data:')
            ? ''
            : r.imageDataUrl,
        })),
        customBackground:
          prefs.room.customBackground?.startsWith('data:')
            ? null
            : prefs.room.customBackground,
      },
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slim))
      console.warn('savePreferences: trimmed data: banners after quota error', err)
    } catch (err2) {
      console.error('savePreferences failed', err2)
    }
  }
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
