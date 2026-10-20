export type MediaKind = 'gif' | 'sticker' | 'image' | 'voice' | 'poll' | 'deal' | 'clip'

export type ChatPoll = {
  question: string
  options: { id: string; label: string; votes: number }[]
  votedOptionId?: string
  multi?: boolean
}

export type RichChatPayload = {
  kind?: MediaKind
  mediaUrl?: string
  mediaPoster?: string
  caption?: string
  voiceDurationSec?: number
  poll?: ChatPoll
  deal?: { title: string; value: string; stage: string }
  clip?: { label: string; atSec: number }
  replyToId?: string
  replyPreview?: string
  reactions?: Record<string, number>
}

export const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '🙏', '🔥', '👍', '👏']

export type CatalogItem = {
  id: string
  label: string
  url: string
  tags: string[]
  kind: 'gif' | 'sticker'
}

/** Curated GIF pack (public Giphy media) — no API key required */
export const GIF_CATALOG: CatalogItem[] = [
  {
    id: 'gif-thumbs',
    label: 'Thumbs up',
    url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
    tags: ['yes', 'ok', 'approve', 'да'],
    kind: 'gif',
  },
  {
    id: 'gif-clap',
    label: 'Clap',
    url: 'https://media.giphy.com/media/7rj2ZgttvgomY/giphy.gif',
    tags: ['clap', 'bravo', 'аплодисменти'],
    kind: 'gif',
  },
  {
    id: 'gif-party',
    label: 'Party',
    url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
    tags: ['party', 'celebrate', 'парти'],
    kind: 'gif',
  },
  {
    id: 'gif-wow',
    label: 'Mind blown',
    url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif',
    tags: ['wow', 'surprised', 'изненада'],
    kind: 'gif',
  },
  {
    id: 'gif-lol',
    label: 'LOL',
    url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif',
    tags: ['lol', 'laugh', 'смях'],
    kind: 'gif',
  },
  {
    id: 'gif-love',
    label: 'Heart',
    url: 'https://media.giphy.com/media/3o7TKnO6Wve6502iJ2/giphy.gif',
    tags: ['love', 'heart', 'обич'],
    kind: 'gif',
  },
  {
    id: 'gif-wave',
    label: 'Wave',
    url: 'https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif',
    tags: ['hi', 'hello', 'здравей'],
    kind: 'gif',
  },
  {
    id: 'gif-think',
    label: 'Thinking',
    url: 'https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif',
    tags: ['think', 'hmm', 'мисля'],
    kind: 'gif',
  },
  {
    id: 'gif-fire',
    label: 'Fire',
    url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
    tags: ['fire', 'hot', 'огон'],
    kind: 'gif',
  },
  {
    id: 'gif-coffee',
    label: 'Coffee',
    url: 'https://media.giphy.com/media/3oEduQAsYcJKQH2XsI/giphy.gif',
    tags: ['coffee', 'work', 'кафе'],
    kind: 'gif',
  },
  {
    id: 'gif-deal',
    label: 'Handshake',
    url: 'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif',
    tags: ['deal', 'business', 'сделка'],
    kind: 'gif',
  },
  {
    id: 'gif-mic',
    label: 'Drop the mic',
    url: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif',
    tags: ['mic', 'podcast', 'микрофон'],
    kind: 'gif',
  },
]

/** Sticker pack — large emoji stickers (no external CDN dependency) */
export const STICKER_CATALOG: CatalogItem[] = [
  { id: 'st-1', label: 'Smile', url: '😀', tags: ['happy'], kind: 'sticker' },
  { id: 'st-2', label: 'Rocket', url: '🚀', tags: ['launch'], kind: 'sticker' },
  { id: 'st-3', label: 'Star', url: '⭐', tags: ['star'], kind: 'sticker' },
  { id: 'st-4', label: 'Flex', url: '💪', tags: ['strong'], kind: 'sticker' },
  { id: 'st-5', label: 'Brain', url: '🧠', tags: ['idea'], kind: 'sticker' },
  { id: 'st-6', label: 'Globe', url: '🌍', tags: ['world'], kind: 'sticker' },
  { id: 'st-7', label: 'Briefcase', url: '💼', tags: ['biz'], kind: 'sticker' },
  { id: 'st-8', label: 'Podcast', url: '🎙️', tags: ['show'], kind: 'sticker' },
  { id: 'st-9', label: 'Check', url: '✅', tags: ['done'], kind: 'sticker' },
  { id: 'st-10', label: 'Party', url: '🥳', tags: ['fun'], kind: 'sticker' },
  { id: 'st-11', label: 'Eyes', url: '👀', tags: ['look'], kind: 'sticker' },
  { id: 'st-12', label: '100', url: '💯', tags: ['perfect'], kind: 'sticker' },
]

export const STICKER_CATEGORIES = [
  { id: 'all', label: 'Всички' },
  { id: 'react', label: 'Реакции' },
  { id: 'biz', label: 'Бизнес' },
  { id: 'show', label: 'Подкаст' },
] as const

export function searchCatalog(items: CatalogItem[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.tags.some((t) => t.includes(q))
  )
}

/** OmniVoice exclusive: bilingual auto-caption for GIF/sticker */
export function bilingualCaption(
  label: string,
  peerLangCode: string
): string {
  const map: Record<string, Record<string, string>> = {
    bg: {
      'Thumbs up': 'Супер — одобрено 👍',
      Clap: 'Браво! 👏',
      Party: 'Парти време 🎉',
      'Mind blown': 'Уау… 🤯',
      LOL: 'Умирам от смях 😂',
      Heart: 'Със сърце ❤️',
      Wave: 'Здравей! 👋',
      Thinking: 'Мисля… 🤔',
      Fire: 'Огън 🔥',
      Coffee: 'Кафе пауза ☕',
      Handshake: 'Сделка! 🤝',
      'Drop the mic': 'Микрофонът падна 🎤',
    },
    en: {},
    es: {
      'Thumbs up': '¡Genial! 👍',
      Clap: '¡Bravo! 👏',
      Party: '¡Fiesta! 🎉',
      Wave: '¡Hola! 👋',
    },
  }
  const dict = map[peerLangCode] || map.bg
  return dict[label] || `${label}`
}
