export type StudioCategory =
  | 'all'
  | 'office'
  | 'meeting'
  | 'executive'
  | 'creative'
  | 'lounge'
  | 'outdoor'

export type StudioRoom = {
  id: string
  name: string
  description: string
  category: Exclude<StudioCategory, 'all'>
  gradient: string
  /** Public image URL (Unsplash) */
  imageUrl: string
}

/** Large catalog of virtual office / studio plates */
export const STUDIO_ROOMS: StudioRoom[] = [
  {
    id: 'glass-office',
    name: 'Стъклен офис',
    description: 'Съвременен open space с дневна светлина',
    category: 'office',
    gradient: 'linear-gradient(135deg,#1e293b,#334155)',
    imageUrl:
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'startup-loft',
    name: 'Startup loft',
    description: 'Тухли, дърво и креативна енергия',
    category: 'creative',
    gradient: 'linear-gradient(135deg,#3f2a1d,#1c1917)',
    imageUrl:
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'boardroom',
    name: 'Заседателна зала',
    description: 'Официална дъска за срещи',
    category: 'meeting',
    gradient: 'linear-gradient(135deg,#111827,#1f2937)',
    imageUrl:
      'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'executive-suite',
    name: 'Executive suite',
    description: 'Премиум кабинет с градски изглед',
    category: 'executive',
    gradient: 'linear-gradient(135deg,#1a1033,#0f172a)',
    imageUrl:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'coworking',
    name: 'Coworking hub',
    description: 'Жив coworking с растения',
    category: 'office',
    gradient: 'linear-gradient(135deg,#14532d,#052e16)',
    imageUrl:
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'library-office',
    name: 'Библиотечен офис',
    description: 'Топли рафтове и спокойствие',
    category: 'lounge',
    gradient: 'linear-gradient(135deg,#292524,#1c1917)',
    imageUrl:
      'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'minimal-white',
    name: 'Minimal white',
    description: 'Чист бял студиен фон',
    category: 'office',
    gradient: 'linear-gradient(135deg,#f8fafc,#e2e8f0)',
    imageUrl:
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'night-skyline',
    name: 'Night skyline',
    description: 'Вечерни светлини на града',
    category: 'executive',
    gradient: 'linear-gradient(135deg,#0b1220,#1e3a5f)',
    imageUrl:
      'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'design-studio',
    name: 'Design studio',
    description: 'Ателие за креативни срещи',
    category: 'creative',
    gradient: 'linear-gradient(135deg,#4c1d95,#1e1b4b)',
    imageUrl:
      'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'hotel-lobby',
    name: 'Lobby lounge',
    description: 'Луксозно лоби за неформални разговори',
    category: 'lounge',
    gradient: 'linear-gradient(135deg,#44403c,#1c1917)',
    imageUrl:
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'conference-tech',
    name: 'Tech conference',
    description: 'Сцена и LED стена',
    category: 'meeting',
    gradient: 'linear-gradient(135deg,#0f172a,#312e81)',
    imageUrl:
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'home-office',
    name: 'Home office',
    description: 'Уютен домашен работен кът',
    category: 'office',
    gradient: 'linear-gradient(135deg,#78350f,#292524)',
    imageUrl:
      'https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'rooftop',
    name: 'Rooftop terrace',
    description: 'Открита тераса с градски въздух',
    category: 'outdoor',
    gradient: 'linear-gradient(135deg,#0c4a6e,#082f49)',
    imageUrl:
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'garden-patio',
    name: 'Garden patio',
    description: 'Зелен двор за спокойни срещи',
    category: 'outdoor',
    gradient: 'linear-gradient(135deg,#14532d,#052e16)',
    imageUrl:
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'podcast-dark',
    name: 'Podcast dark',
    description: 'Тъмно акустично студио',
    category: 'creative',
    gradient: 'linear-gradient(135deg,#1a1a2e,#0f3460)',
    imageUrl:
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'ceo-corner',
    name: 'CEO corner',
    description: 'Елегантен ъгъл с кожена мебел',
    category: 'executive',
    gradient: 'linear-gradient(135deg,#1c1917,#44403c)',
    imageUrl:
      'https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'glass-meeting',
    name: 'Glass meeting',
    description: 'Прозрачна заседателна кабина',
    category: 'meeting',
    gradient: 'linear-gradient(135deg,#334155,#0f172a)',
    imageUrl:
      'https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'soft-lounge',
    name: 'Soft lounge',
    description: 'Меки дивани и топла светлина',
    category: 'lounge',
    gradient: 'linear-gradient(135deg,#7c2d12,#431407)',
    imageUrl:
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'open-plan',
    name: 'Open plan',
    description: 'Голям open-plan офис с колони',
    category: 'office',
    gradient: 'linear-gradient(135deg,#1e3a5f,#0f172a)',
    imageUrl:
      'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'scandi-desk',
    name: 'Scandi desk',
    description: 'Светъл скандинавски работен кът',
    category: 'office',
    gradient: 'linear-gradient(135deg,#e7e5e4,#a8a29e)',
    imageUrl:
      'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bb?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'brick-warehouse',
    name: 'Brick warehouse',
    description: 'Индустриален loft с тухли',
    category: 'creative',
    gradient: 'linear-gradient(135deg,#7c2d12,#1c1917)',
    imageUrl:
      'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'neon-studio',
    name: 'Neon studio',
    description: 'Цветна LED атмосфера за стрийм',
    category: 'creative',
    gradient: 'linear-gradient(135deg,#4c1d95,#831843)',
    imageUrl:
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'beach-cabana',
    name: 'Beach cabana',
    description: 'Лека outdoor vibe до морето',
    category: 'outdoor',
    gradient: 'linear-gradient(135deg,#0369a1,#0c4a6e)',
    imageUrl:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'mountain-view',
    name: 'Mountain view',
    description: 'Панорама към планините',
    category: 'outdoor',
    gradient: 'linear-gradient(135deg,#334155,#0f172a)',
    imageUrl:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'penthouse',
    name: 'Penthouse',
    description: 'Луксозен пентхаус с панорамни прозорци',
    category: 'executive',
    gradient: 'linear-gradient(135deg,#1e1b4b,#0f172a)',
    imageUrl:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'law-office',
    name: 'Law office',
    description: 'Класически кабинет с дърво',
    category: 'executive',
    gradient: 'linear-gradient(135deg,#44403c,#1c1917)',
    imageUrl:
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'hybrid-booth',
    name: 'Hybrid booth',
    description: 'Тиха кабина за hybrid срещи',
    category: 'meeting',
    gradient: 'linear-gradient(135deg,#164e63,#0f172a)',
    imageUrl:
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'auditorium',
    name: 'Auditorium',
    description: 'Голяма зала за презентации',
    category: 'meeting',
    gradient: 'linear-gradient(135deg,#1e293b,#0f172a)',
    imageUrl:
      'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'cafe-corner',
    name: 'Café corner',
    description: 'Кафе атмосфера за неформални разговори',
    category: 'lounge',
    gradient: 'linear-gradient(135deg,#78350f,#292524)',
    imageUrl:
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'zen-garden',
    name: 'Zen garden',
    description: 'Спокоен зелен кът',
    category: 'lounge',
    gradient: 'linear-gradient(135deg,#365314,#14532d)',
    imageUrl:
      'https://images.unsplash.com/photo-1545389336-cf090694435e?auto=format&fit=crop&w=1600&q=80',
  },
]

export const STUDIO_CATEGORIES: { id: StudioCategory; label: string }[] = [
  { id: 'all', label: 'Всички' },
  { id: 'office', label: 'Офис' },
  { id: 'meeting', label: 'Срещи' },
  { id: 'executive', label: 'Executive' },
  { id: 'creative', label: 'Креатив' },
  { id: 'lounge', label: 'Lounge' },
  { id: 'outdoor', label: 'Открито' },
]

export type VideoFilterId =
  | 'none'
  | 'cinema'
  | 'warm'
  | 'cool'
  | 'soft'
  | 'vivid'
  | 'noir'

export const VIDEO_FILTERS: {
  id: VideoFilterId
  label: string
  css: string
}[] = [
  { id: 'none', label: 'Без филтър', css: 'none' },
  { id: 'cinema', label: 'Cinema', css: 'contrast(1.08) saturate(1.1) brightness(0.95)' },
  { id: 'warm', label: 'Топъл', css: 'sepia(0.18) saturate(1.15) brightness(1.02)' },
  { id: 'cool', label: 'Студен', css: 'hue-rotate(12deg) saturate(1.05) brightness(1.04)' },
  { id: 'soft', label: 'Мек', css: 'brightness(1.06) contrast(0.92) saturate(0.95)' },
  { id: 'vivid', label: 'Ярък', css: 'saturate(1.35) contrast(1.1)' },
  { id: 'noir', label: 'Noir', css: 'grayscale(1) contrast(1.15)' },
]

export type VideoQualityId = 'auto' | '360p' | '720p' | '1080p'

export const VIDEO_QUALITY: Record<
  VideoQualityId,
  { label: string; width: number; height: number; maxBitrate: number }
> = {
  auto: { label: 'Auto HD', width: 1280, height: 720, maxBitrate: 1_700_000 },
  '360p': { label: '360p · пести трафик', width: 640, height: 360, maxBitrate: 600_000 },
  '720p': { label: '720p HD', width: 1280, height: 720, maxBitrate: 1_700_000 },
  '1080p': { label: '1080p Full HD', width: 1920, height: 1080, maxBitrate: 3_000_000 },
}

export function getStudioRoom(id: string | undefined | null) {
  return STUDIO_ROOMS.find((r) => r.id === id) || STUDIO_ROOMS[0]
}
