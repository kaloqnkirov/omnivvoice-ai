import type { PresenceStatus } from '@/lib/user-store'
import type { MoodId } from '@/lib/profile-social'

/** OmniVoice "better than Snapchat" social layer */

export type CharmId =
  | 'polyglot'
  | 'streak'
  | 'deal_closer'
  | 'studio_buddy'
  | 'night_owl'
  | 'quick_reply'

export type Charm = {
  id: CharmId
  emoji: string
  title: string
  titleBg: string
  description: string
}

export const CHARMS: Charm[] = [
  {
    id: 'polyglot',
    emoji: '🌍',
    title: 'Polyglot',
    titleBg: 'Полиглот',
    description: 'Говорихте на 2+ езика заедно',
  },
  {
    id: 'streak',
    emoji: '🔥',
    title: 'Streak',
    titleBg: 'Серия',
    description: 'Контакт 3+ дни подред',
  },
  {
    id: 'deal_closer',
    emoji: '🤝',
    title: 'Deal closer',
    titleBg: 'Closer',
    description: 'Имате споделена deal карта',
  },
  {
    id: 'studio_buddy',
    emoji: '🎙️',
    title: 'Studio buddy',
    titleBg: 'Studio',
    description: 'Били сте заедно в подкаст/стая',
  },
  {
    id: 'night_owl',
    emoji: '🦉',
    title: 'Night owl',
    titleBg: 'Нощна птица',
    description: 'Съобщения след 22:00',
  },
  {
    id: 'quick_reply',
    emoji: '⚡',
    title: 'Quick reply',
    titleBg: 'Бърз отговор',
    description: 'Средно под 2 мин реакция',
  },
]

export type FriendshipStats = {
  contactId: string
  messagesExchanged: number
  callsTogether: number
  languagesUsed: string[]
  streakDays: number
  lastInteractionAt: string
  charmIds: CharmId[]
  note: string
  bestFriendRank?: number
}

export type MemoryItem = {
  id: string
  kind: 'translation' | 'deal' | 'clip' | 'photo' | 'voice' | 'note'
  title: string
  body: string
  mediaUrl?: string
  locked: boolean
  createdAt: string
  tags: string[]
}

export type SpotlightItem = {
  id: string
  authorName: string
  authorAvatar?: string
  title: string
  caption: string
  captionTranslated?: string
  mediaUrl?: string
  kind: 'clip' | 'story' | 'highlight'
  likes: number
  likedByMe: boolean
  language: string
  createdAt: string
}

export type MapNode = {
  id: string
  name: string
  presence: PresenceStatus
  moodId: MoodId
  locationLabel: string
  x: number
  y: number
  isMe?: boolean
}

export type SnapPlusState = {
  friendships: Record<string, FriendshipStats>
  memories: MemoryItem[]
  vaultPin: string
  vaultUnlockedUntil: number
  spotlight: SpotlightItem[]
  captureDraftCaption: string
}

export const AVATAR_POSES: Record<
  MoodId,
  { pose: string; gradient: string; label: string }
> = {
  great: {
    pose: '😄',
    gradient: 'from-amber-300 via-orange-400 to-rose-500',
    label: 'Shine',
  },
  focused: {
    pose: '🎯',
    gradient: 'from-teal-400 via-cyan-500 to-indigo-600',
    label: 'Laser',
  },
  creative: {
    pose: '✨',
    gradient: 'from-fuchsia-400 via-violet-500 to-indigo-600',
    label: 'Spark',
  },
  busy: {
    pose: '⚡',
    gradient: 'from-yellow-300 via-amber-500 to-orange-600',
    label: 'Rush',
  },
  chill: {
    pose: '😌',
    gradient: 'from-sky-300 via-teal-400 to-emerald-500',
    label: 'Ease',
  },
  tired: {
    pose: '😴',
    gradient: 'from-slate-400 via-indigo-500 to-slate-700',
    label: 'Rest',
  },
  excited: {
    pose: '🔥',
    gradient: 'from-rose-400 via-red-500 to-orange-500',
    label: 'Hype',
  },
  offline_mood: {
    pose: '🌙',
    gradient: 'from-slate-600 via-slate-800 to-black',
    label: 'Away',
  },
}

export const DEFAULT_SPOTLIGHT: SpotlightItem[] = [
  {
    id: 'sp1',
    authorName: 'Maria Petrova',
    title: 'Demo highlight · BG→EN',
    caption: 'Клиентът каза „да“ след live превод',
    captionTranslated: 'The client said yes after live translation',
    kind: 'highlight',
    likes: 128,
    likedByMe: false,
    language: 'bg',
    createdAt: '2026-10-19T18:00:00.000Z',
  },
  {
    id: 'sp2',
    authorName: 'Alex Rivera',
    title: 'Podcast cold open',
    caption: 'Cold open ready for multistream',
    captionTranslated: 'Колд оупънът е готов за мултистрийм',
    kind: 'clip',
    likes: 86,
    likedByMe: true,
    language: 'es',
    createdAt: '2026-10-19T16:20:00.000Z',
  },
  {
    id: 'sp3',
    authorName: 'Yuki Tanaka',
    title: 'Studio vibes',
    caption: '9:16 short from tonight’s booth',
    captionTranslated: '9:16 short от днешния booth',
    kind: 'story',
    likes: 204,
    likedByMe: false,
    language: 'ja',
    createdAt: '2026-10-19T12:10:00.000Z',
  },
]

export const DEFAULT_SNAP_PLUS: SnapPlusState = {
  friendships: {},
  memories: [
    {
      id: 'mem1',
      kind: 'translation',
      title: 'Ключова фраза',
      body: 'Можем да започнем пилот за 14 дни без риск.',
      locked: false,
      createdAt: '2026-10-18T10:00:00.000Z',
      tags: ['sales', 'bg'],
    },
    {
      id: 'mem2',
      kind: 'deal',
      title: 'Acme · Proposal',
      body: '€12,400 · Negotiation',
      locked: true,
      createdAt: '2026-10-17T15:00:00.000Z',
      tags: ['crm'],
    },
  ],
  vaultPin: '1234',
  vaultUnlockedUntil: 0,
  spotlight: DEFAULT_SPOTLIGHT,
  captureDraftCaption: '',
}

export function ensureFriendship(
  state: SnapPlusState,
  contactId: string,
  seed?: Partial<FriendshipStats>
): FriendshipStats {
  const existing = state.friendships[contactId]
  if (existing) return existing
  return {
    contactId,
    messagesExchanged: seed?.messagesExchanged ?? 12,
    callsTogether: seed?.callsTogether ?? 2,
    languagesUsed: seed?.languagesUsed ?? ['bg', 'en'],
    streakDays: seed?.streakDays ?? 2,
    lastInteractionAt: seed?.lastInteractionAt ?? new Date().toISOString(),
    charmIds: seed?.charmIds ?? ['polyglot', 'quick_reply'],
    note: seed?.note ?? '',
    bestFriendRank: seed?.bestFriendRank,
  }
}

export function bumpFriendship(
  state: SnapPlusState,
  contactId: string,
  patch: Partial<FriendshipStats>
): SnapPlusState {
  const base = ensureFriendship(state, contactId)
  return {
    ...state,
    friendships: {
      ...state.friendships,
      [contactId]: { ...base, ...patch, contactId },
    },
  }
}

export function buildMapNodes(input: {
  meName: string
  meMood: MoodId
  mePresence: PresenceStatus
  meLocation: string
  showMe: boolean
  people: {
    id: string
    name: string
    presence: PresenceStatus
    language: string
  }[]
}): MapNode[] {
  const nodes: MapNode[] = []
  if (input.showMe) {
    nodes.push({
      id: 'me',
      name: input.meName,
      presence: input.mePresence,
      moodId: input.meMood,
      locationLabel: input.meLocation,
      x: 48,
      y: 42,
      isMe: true,
    })
  }
  const spots = [
    [22, 28],
    [70, 30],
    [30, 68],
    [75, 65],
    [55, 78],
    [18, 55],
  ]
  input.people.slice(0, 6).forEach((p, i) => {
    const [x, y] = spots[i % spots.length]
    nodes.push({
      id: p.id,
      name: p.name,
      presence: p.presence,
      moodId:
        p.presence === 'offline'
          ? 'offline_mood'
          : p.presence === 'in_studio'
            ? 'creative'
            : p.presence === 'in_call'
              ? 'busy'
              : 'focused',
      locationLabel:
        p.presence === 'in_studio'
          ? 'Studio booth'
          : p.presence === 'in_call'
            ? 'Live room'
            : `${p.language.toUpperCase()} desk`,
      x,
      y,
    })
  })
  return nodes
}
