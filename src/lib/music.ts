import type { PlanId } from '@/lib/languages'

export type MusicTrack = {
  id: string
  title: string
  mood: string
  plan: PlanId
  /** Royalty-free preview URL (Mixkit) */
  src: string
}

/** Built-in ambient library — richer catalogs unlock with higher plans */
export const MUSIC_LIBRARY: MusicTrack[] = [
  // Free / Normal
  {
    id: 'soft-lounge',
    title: 'Soft Lounge',
    mood: 'Топъл фон за чат',
    plan: 'free',
    src: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
  },
  {
    id: 'warm-cafe',
    title: 'Warm Cafe',
    mood: 'Лек cafe ambient',
    plan: 'free',
    src: 'https://assets.mixkit.co/music/preview/mixkit-a-very-happy-christmas-897.mp3',
  },
  // Business
  {
    id: 'focus-flow',
    title: 'Focus Flow',
    mood: 'Концентрация за sales calls',
    plan: 'business',
    src: 'https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3',
  },
  {
    id: 'executive-calm',
    title: 'Executive Calm',
    mood: 'Премиум boardroom ambience',
    plan: 'business',
    src: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
  },
  {
    id: 'midnight-desk',
    title: 'Midnight Desk',
    mood: 'Вечерен deep-work vibe',
    plan: 'business',
    src: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
  },
  // Podcast
  {
    id: 'studio-pulse',
    title: 'Studio Pulse',
    mood: 'Broadcast intro energy',
    plan: 'podcast',
    src: 'https://assets.mixkit.co/music/preview/mixkit-life-is-a-dream-837.mp3',
  },
  {
    id: 'broadcast-glow',
    title: 'Broadcast Glow',
    mood: 'Live show bed music',
    plan: 'podcast',
    src: 'https://assets.mixkit.co/music/preview/mixkit-games-worldbeat-466.mp3',
  },
  {
    id: 'neon-booth',
    title: 'Neon Booth',
    mood: 'Нощен streaming mood',
    plan: 'podcast',
    src: 'https://assets.mixkit.co/music/preview/mixkit-cat-vigor-521.mp3',
  },
  {
    id: 'cinema-warm',
    title: 'Cinema Warm',
    mood: 'Кинематографичен outro',
    plan: 'podcast',
    src: 'https://assets.mixkit.co/music/preview/mixkit-deep-urban-623.mp3',
  },
]

const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  business: 1,
  podcast: 2,
}

export function tracksForPlan(plan: PlanId): MusicTrack[] {
  const rank = PLAN_RANK[plan]
  return MUSIC_LIBRARY.filter((track) => PLAN_RANK[track.plan] <= rank)
}

export function canPlayTrack(trackId: string, plan: PlanId): boolean {
  const track = MUSIC_LIBRARY.find((item) => item.id === trackId)
  if (!track) return false
  return PLAN_RANK[track.plan] <= PLAN_RANK[plan]
}

export function getTrack(trackId: string): MusicTrack | undefined {
  return MUSIC_LIBRARY.find((item) => item.id === trackId)
}
