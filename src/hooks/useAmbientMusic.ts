'use client'

import { useEffect, useRef } from 'react'
import { canPlayTrack, getTrack } from '@/lib/music'
import type { PlanId } from '@/lib/languages'

export function useAmbientMusic(options: {
  enabled: boolean
  trackId: string
  volume: number
  plan: PlanId
  duck: boolean
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const track = getTrack(options.trackId)
    const allowed = canPlayTrack(options.trackId, options.plan)

    if (!options.enabled || !track || !allowed) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      return
    }

    const audio = audioRef.current || new Audio()
    audioRef.current = audio
    audio.loop = true
    audio.volume = Math.max(0, Math.min(1, options.volume))
    if (audio.src !== track.src) {
      audio.src = track.src
    }

    const play = () => {
      void audio.play().catch(() => {
        /* autoplay may require user gesture */
      })
    }
    play()

    return () => {
      audio.pause()
    }
  }, [options.enabled, options.trackId, options.plan, options.volume])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = Math.max(0, Math.min(1, options.volume))
  }, [options.volume])

  return {
    duckNow: () => {
      const audio = audioRef.current
      if (!audio || !options.duck) return
      audio.volume = Math.max(0.04, options.volume * 0.25)
      window.setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.volume = options.volume
        }
      }, 1800)
    },
  }
}
