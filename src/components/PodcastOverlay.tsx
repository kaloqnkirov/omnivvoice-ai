'use client'

import { Clapperboard, MonitorPlay, Radio, Smartphone } from 'lucide-react'
import { STREAM_PLATFORMS, type StreamPlatformId } from '@/lib/platforms'

type PodcastOverlayProps = {
  visible: boolean
  obsLive: boolean
  shortQueued: boolean
  showTitle: string
  layout: string
  resolution: string
  connectedPlatforms: StreamPlatformId[]
  multistream: boolean
  onToggleObs: () => void
  onCaptureShort: () => void
}

export default function PodcastOverlay({
  visible,
  obsLive,
  shortQueued,
  showTitle,
  layout,
  resolution,
  connectedPlatforms,
  multistream,
  onToggleObs,
  onCaptureShort,
}: PodcastOverlayProps) {
  if (!visible) return null

  const labels = connectedPlatforms
    .map((id) => STREAM_PLATFORMS.find((p) => p.id === id)?.label || id)
    .slice(0, 6)

  return (
    <div className="absolute right-4 top-4 z-20 flex flex-col items-end gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
          obsLive
            ? 'bg-red-500/20 text-red-300 ring-red-400/30'
            : 'bg-slate-500/20 text-slate-300 ring-slate-400/25'
        }`}
      >
        <Radio className="h-3 w-3" />
        {obsLive ? 'LIVE · OBS feed' : 'OBS standby'}
      </span>

      <div className="w-[220px] rounded-xl border border-white/15 bg-black/55 p-2 shadow-lg backdrop-blur">
        <p className="mb-1 text-[10px] font-semibold text-white">{showTitle}</p>
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
          <MonitorPlay className="h-3.5 w-3.5" />
          {layout} · {resolution}
        </p>
        <div className="grid grid-cols-2 gap-1">
          {['Host A', 'Host B', 'Guest', 'Booth'].map((label) => (
            <div
              key={label}
              className="rounded-md bg-gradient-to-br from-teal-500/25 to-slate-900 px-1.5 py-2 text-center text-[9px] text-slate-200"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="mt-2">
          <p className="text-[9px] uppercase tracking-wider text-slate-400">
            {multistream ? 'Multistream' : 'Single stream'} · {labels.length} platforms
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {labels.length ? (
              labels.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-emerald-200"
                >
                  {label}
                </span>
              ))
            ) : (
              <span className="text-[9px] text-slate-400">
                Свържи платформи в Настройки
              </span>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={onToggleObs}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/10 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-white/15"
          >
            <Clapperboard className="h-3 w-3" />
            {obsLive ? 'Stop OBS output' : 'Start OBS output'}
          </button>
          <button
            type="button"
            onClick={onCaptureShort}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-500/25 px-2 py-1.5 text-[11px] font-medium text-teal-100 ring-1 ring-teal-400/30 hover:bg-teal-500/35"
          >
            <Smartphone className="h-3 w-3" />
            Capture 9:16 short
          </button>
        </div>

        <div className="mt-2 overflow-hidden rounded-lg border border-white/10 bg-black/40 p-1">
          <div className="aspect-[9/16] rounded-md bg-gradient-to-b from-teal-500/40 to-slate-900 p-2">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-teal-100">
              Vertical short
            </p>
            <p className="mt-1 text-[10px] leading-snug text-slate-200">
              {shortQueued
                ? '9:16 clip captured from live highlights'
                : 'Tap capture to queue a vertical clip'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
