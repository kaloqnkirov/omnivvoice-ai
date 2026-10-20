export type StreamPlatformId =
  | 'youtube'
  | 'tiktok'
  | 'facebook'
  | 'instagram'
  | 'twitch'
  | 'linkedin'
  | 'x'
  | 'kick'
  | 'discord'
  | 'spotify'
  | 'apple_podcasts'
  | 'rumble'

export type StreamPlatform = {
  id: StreamPlatformId
  label: string
  category: 'video' | 'social' | 'audio' | 'community'
  hint: string
}

export const STREAM_PLATFORMS: StreamPlatform[] = [
  {
    id: 'youtube',
    label: 'YouTube',
    category: 'video',
    hint: 'Live + Shorts RTMP / stream key',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    category: 'social',
    hint: 'LIVE + 9:16 clips',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    category: 'social',
    hint: 'Page / Group live',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    category: 'social',
    hint: 'Live + Reels export',
  },
  {
    id: 'twitch',
    label: 'Twitch',
    category: 'video',
    hint: 'RTMP ingest + chat overlay',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    category: 'social',
    hint: 'Professional live events',
  },
  {
    id: 'x',
    label: 'X (Twitter)',
    category: 'social',
    hint: 'Spaces / live clips',
  },
  {
    id: 'kick',
    label: 'Kick',
    category: 'video',
    hint: 'RTMP multi-stream',
  },
  {
    id: 'rumble',
    label: 'Rumble',
    category: 'video',
    hint: 'Alt video live',
  },
  {
    id: 'discord',
    label: 'Discord',
    category: 'community',
    hint: 'Stage / Go Live webhook',
  },
  {
    id: 'spotify',
    label: 'Spotify',
    category: 'audio',
    hint: 'Podcast RSS / video podcast',
  },
  {
    id: 'apple_podcasts',
    label: 'Apple Podcasts',
    category: 'audio',
    hint: 'RSS feed publish',
  },
]
