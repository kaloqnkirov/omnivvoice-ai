import type { PlanId } from '@/lib/languages'

export type StudioCategory =
  | 'all'
  | 'office'
  | 'meeting'
  | 'executive'
  | 'creative'
  | 'lounge'
  | 'outdoor'
  | 'podcast'
  | 'mine'

export type StudioRoom = {
  id: string
  name: string
  description: string
  category: Exclude<StudioCategory, 'all' | 'mine'>
  /** Minimum plan that unlocks this room */
  plan: PlanId
  pack: 'core' | 'business' | 'podcast'
  gradient: string
  imageUrl: string
  custom?: boolean
}

export type CustomStudioRoom = {
  id: string
  name: string
  imageDataUrl: string
  createdAt: string
}

const RANK: Record<PlanId, number> = { free: 0, business: 1, podcast: 2 }

/** Built-in catalog — Business offices + Podcast studios */
export const STUDIO_ROOMS: StudioRoom[] = [
  // Free core
  {
    id: 'glass-office',
    name: 'Стъклен офис',
    description: 'Open space с дневна светлина',
    category: 'office',
    plan: 'free',
    pack: 'core',
    gradient: 'linear-gradient(135deg,#1e293b,#334155)',
    imageUrl:
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'home-office',
    name: 'Home office',
    description: 'Уютен домашен работен кът',
    category: 'office',
    plan: 'free',
    pack: 'core',
    gradient: 'linear-gradient(135deg,#78350f,#292524)',
    imageUrl:
      'https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'soft-lounge',
    name: 'Soft lounge',
    description: 'Меки дивани и топла светлина',
    category: 'lounge',
    plan: 'free',
    pack: 'core',
    gradient: 'linear-gradient(135deg,#7c2d12,#431407)',
    imageUrl:
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=80',
  },
  // Business pack
  {
    id: 'boardroom',
    name: 'Заседателна зала',
    description: 'Официална дъска за срещи',
    category: 'meeting',
    plan: 'business',
    pack: 'business',
    gradient: 'linear-gradient(135deg,#111827,#1f2937)',
    imageUrl:
      'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'executive-suite',
    name: 'Executive suite',
    description: 'Премиум кабинет с градски изглед',
    category: 'executive',
    plan: 'business',
    pack: 'business',
    gradient: 'linear-gradient(135deg,#1a1033,#0f172a)',
    imageUrl:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'coworking',
    name: 'Coworking hub',
    description: 'Жив coworking с растения',
    category: 'office',
    plan: 'business',
    pack: 'business',
    gradient: 'linear-gradient(135deg,#14532d,#052e16)',
    imageUrl:
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'law-office',
    name: 'Law office',
    description: 'Класически кабинет с дърво',
    category: 'executive',
    plan: 'business',
    pack: 'business',
    gradient: 'linear-gradient(135deg,#44403c,#1c1917)',
    imageUrl:
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'hybrid-booth',
    name: 'Hybrid booth',
    description: 'Тиха кабина за hybrid срещи',
    category: 'meeting',
    plan: 'business',
    pack: 'business',
    gradient: 'linear-gradient(135deg,#164e63,#0f172a)',
    imageUrl:
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'glass-meeting',
    name: 'Glass meeting',
    description: 'Прозрачна заседателна кабина',
    category: 'meeting',
    plan: 'business',
    pack: 'business',
    gradient: 'linear-gradient(135deg,#334155,#0f172a)',
    imageUrl:
      'https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'sales-floor',
    name: 'Sales floor',
    description: 'Динамичен sales open space',
    category: 'office',
    plan: 'business',
    pack: 'business',
    gradient: 'linear-gradient(135deg,#1e3a5f,#0f172a)',
    imageUrl:
      'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'client-lounge',
    name: 'Client lounge',
    description: 'Лоби за клиентски срещи',
    category: 'lounge',
    plan: 'business',
    pack: 'business',
    gradient: 'linear-gradient(135deg,#44403c,#1c1917)',
    imageUrl:
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'ceo-corner',
    name: 'CEO corner',
    description: 'Елегантен ъгъл с кожена мебел',
    category: 'executive',
    plan: 'business',
    pack: 'business',
    gradient: 'linear-gradient(135deg,#1c1917,#44403c)',
    imageUrl:
      'https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'scandi-desk',
    name: 'Scandi desk',
    description: 'Светъл скандинавски работен кът',
    category: 'office',
    plan: 'business',
    pack: 'business',
    gradient: 'linear-gradient(135deg,#e7e5e4,#a8a29e)',
    imageUrl:
      'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bb?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'auditorium',
    name: 'Auditorium',
    description: 'Голяма зала за презентации',
    category: 'meeting',
    plan: 'business',
    pack: 'business',
    gradient: 'linear-gradient(135deg,#1e293b,#0f172a)',
    imageUrl:
      'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'night-skyline',
    name: 'Night skyline',
    description: 'Вечерни светлини на града',
    category: 'executive',
    plan: 'business',
    pack: 'business',
    gradient: 'linear-gradient(135deg,#0b1220,#1e3a5f)',
    imageUrl:
      'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&q=80',
  },
  // Podcast pack
  {
    id: 'podcast-dark',
    name: 'Podcast dark',
    description: 'Тъмно акустично студио',
    category: 'podcast',
    plan: 'podcast',
    pack: 'podcast',
    gradient: 'linear-gradient(135deg,#1a1a2e,#0f3460)',
    imageUrl:
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'neon-studio',
    name: 'Neon studio',
    description: 'LED атмосфера за стрийм',
    category: 'podcast',
    plan: 'podcast',
    pack: 'podcast',
    gradient: 'linear-gradient(135deg,#4c1d95,#831843)',
    imageUrl:
      'https://images.unsplash.com/photo-1516280440614-6697288d5d38?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'conference-tech',
    name: 'Tech conference',
    description: 'Сцена и LED стена',
    category: 'podcast',
    plan: 'podcast',
    pack: 'podcast',
    gradient: 'linear-gradient(135deg,#0f172a,#312e81)',
    imageUrl:
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'design-studio',
    name: 'Design studio',
    description: 'Ателие за креативни записи',
    category: 'creative',
    plan: 'podcast',
    pack: 'podcast',
    gradient: 'linear-gradient(135deg,#4c1d95,#1e1b4b)',
    imageUrl:
      'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'startup-loft',
    name: 'Startup loft',
    description: 'Тухли и креативна енергия',
    category: 'creative',
    plan: 'podcast',
    pack: 'podcast',
    gradient: 'linear-gradient(135deg,#3f2a1d,#1c1917)',
    imageUrl:
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'brick-warehouse',
    name: 'Brick warehouse',
    description: 'Индустриален loft за live show',
    category: 'creative',
    plan: 'podcast',
    pack: 'podcast',
    gradient: 'linear-gradient(135deg,#7c2d12,#1c1917)',
    imageUrl:
      'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'rooftop',
    name: 'Rooftop terrace',
    description: 'Открита тераса за outdoor episode',
    category: 'outdoor',
    plan: 'podcast',
    pack: 'podcast',
    gradient: 'linear-gradient(135deg,#0c4a6e,#082f49)',
    imageUrl:
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'garden-patio',
    name: 'Garden patio',
    description: 'Зелен двор за спокойни записи',
    category: 'outdoor',
    plan: 'podcast',
    pack: 'podcast',
    gradient: 'linear-gradient(135deg,#14532d,#052e16)',
    imageUrl:
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'library-office',
    name: 'Библиотечен офис',
    description: 'Топли рафтове — идеално за talk show',
    category: 'lounge',
    plan: 'podcast',
    pack: 'podcast',
    gradient: 'linear-gradient(135deg,#292524,#1c1917)',
    imageUrl:
      'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'green-screen',
    name: 'Green screen bay',
    description: 'Чист chroma ключ за виртуални сцени',
    category: 'podcast',
    plan: 'podcast',
    pack: 'podcast',
    gradient: 'linear-gradient(135deg,#14532d,#052e16)',
    imageUrl:
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1600&q=70',
  },
  {
    id: 'talk-show',
    name: 'Talk-show set',
    description: 'Класически set с два микрофона',
    category: 'podcast',
    plan: 'podcast',
    pack: 'podcast',
    gradient: 'linear-gradient(135deg,#1e1b4b,#312e81)',
    imageUrl:
      'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'penthouse',
    name: 'Penthouse',
    description: 'Луксозен пентхаус за премиум епизоди',
    category: 'executive',
    plan: 'podcast',
    pack: 'podcast',
    gradient: 'linear-gradient(135deg,#1e1b4b,#0f172a)',
    imageUrl:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80',
  },
]

export const STUDIO_CATEGORIES: { id: StudioCategory; label: string }[] = [
  { id: 'all', label: 'Всички' },
  { id: 'office', label: 'Офис' },
  { id: 'meeting', label: 'Срещи' },
  { id: 'executive', label: 'Executive' },
  { id: 'podcast', label: 'Подкаст' },
  { id: 'creative', label: 'Креатив' },
  { id: 'lounge', label: 'Lounge' },
  { id: 'outdoor', label: 'Открито' },
  { id: 'mine', label: 'Моите' },
]

export type StudioPackFilter = 'all' | 'business' | 'podcast' | 'mine'

export const STUDIO_PACKS: { id: StudioPackFilter; label: string }[] = [
  { id: 'all', label: 'Всички пакети' },
  { id: 'business', label: 'Business офиси' },
  { id: 'podcast', label: 'Podcast студиа' },
  { id: 'mine', label: 'Качени от мен' },
]

export function planUnlocks(userPlan: PlanId, required: PlanId) {
  return RANK[userPlan] >= RANK[required]
}

export function customToStudioRoom(custom: CustomStudioRoom): StudioRoom {
  return {
    id: custom.id,
    name: custom.name,
    description: 'Твой качен фон',
    category: 'creative',
    plan: 'free',
    pack: 'core',
    gradient: 'linear-gradient(135deg,#1e293b,#0f172a)',
    imageUrl: custom.imageDataUrl,
    custom: true,
  }
}

export function roomsForPlan(
  userPlan: PlanId,
  customRooms: CustomStudioRoom[] = []
): StudioRoom[] {
  const unlocked = STUDIO_ROOMS.filter((room) =>
    planUnlocks(userPlan, room.plan)
  )
  return [...customRooms.map(customToStudioRoom), ...unlocked]
}

export function getStudioRoom(
  id: string | undefined | null,
  customRooms: CustomStudioRoom[] = []
) {
  const custom = customRooms.find((r) => r.id === id)
  if (custom) return customToStudioRoom(custom)
  return STUDIO_ROOMS.find((r) => r.id === id) || STUDIO_ROOMS[0]
}

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
