'use client'

import { AVATAR_POSES } from '@/lib/snap-plus'
import type { MoodId } from '@/lib/profile-social'

type Props = {
  moodId: MoodId
  name: string
  imageUrl?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  ring?: boolean
  showPose?: boolean
}

const SIZE = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-24 w-24 text-3xl',
}

export default function MoodAvatar({
  moodId,
  name,
  imageUrl,
  size = 'md',
  ring = false,
  showPose = true,
}: Props) {
  const pose = AVATAR_POSES[moodId] || AVATAR_POSES.focused

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br ${pose.gradient} font-bold text-white ${SIZE[size]} ${
        ring ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[var(--background)]' : ''
      }`}
      title={`${pose.label} · ${name}`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span>{name.slice(0, 1).toUpperCase()}</span>
      )}
      {showPose ? (
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-[var(--panel)] px-0.5 text-[10px] shadow">
          {pose.pose}
        </span>
      ) : null}
    </span>
  )
}
