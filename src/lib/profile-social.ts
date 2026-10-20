export type MoodId =
  | 'great'
  | 'focused'
  | 'creative'
  | 'busy'
  | 'chill'
  | 'tired'
  | 'excited'
  | 'offline_mood'

export type ProfileMood = {
  id: MoodId
  emoji: string
  label: string
  labelBg: string
}

export const PROFILE_MOODS: ProfileMood[] = [
  { id: 'great', emoji: '😄', label: 'Great', labelBg: 'Супер' },
  { id: 'focused', emoji: '🎯', label: 'Focused', labelBg: 'Фокусиран' },
  { id: 'creative', emoji: '✨', label: 'Creative', labelBg: 'Креативен' },
  { id: 'busy', emoji: '⚡', label: 'Busy', labelBg: 'Зает' },
  { id: 'chill', emoji: '😌', label: 'Chill', labelBg: 'Спокоен' },
  { id: 'tired', emoji: '😴', label: 'Tired', labelBg: 'Уморен' },
  { id: 'excited', emoji: '🔥', label: 'Excited', labelBg: 'Възбуден' },
  { id: 'offline_mood', emoji: '🌙', label: 'Away', labelBg: 'Отсъствам' },
]

export type UserStory = {
  id: string
  type: 'text' | 'image'
  text?: string
  imageDataUrl?: string
  createdAt: string
  expiresAt: string
  views: number
  audience: 'friends' | 'close' | 'public'
}

export type ProfileSocial = {
  moodId: MoodId
  bio: string
  locationLabel: string
  streakDays: number
  stories: UserStory[]
  showOnMap: boolean
  publicProfile: boolean
}

export const DEFAULT_PROFILE_SOCIAL: ProfileSocial = {
  moodId: 'focused',
  bio: 'Говоря на всеки език — на живо.',
  locationLabel: 'София · Studio',
  streakDays: 3,
  stories: [],
  showOnMap: false,
  publicProfile: true,
}

export function getMood(id: MoodId | undefined) {
  return PROFILE_MOODS.find((m) => m.id === id) || PROFILE_MOODS[1]
}

export function activeStories(stories: UserStory[]) {
  const now = Date.now()
  return stories.filter((s) => new Date(s.expiresAt).getTime() > now)
}

export function createStory(input: {
  type: 'text' | 'image'
  text?: string
  imageDataUrl?: string
  audience?: UserStory['audience']
}): UserStory {
  const createdAt = new Date()
  const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000)
  return {
    id: `story_${Date.now()}`,
    type: input.type,
    text: input.text,
    imageDataUrl: input.imageDataUrl,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    views: 0,
    audience: input.audience || 'friends',
  }
}
