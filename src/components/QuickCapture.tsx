'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Send, Sparkles, X } from 'lucide-react'
import { bilingualCaption } from '@/lib/chat-media'

type Props = {
  open: boolean
  peerLanguage?: string
  onClose: () => void
  onSendToChat: (payload: {
    imageDataUrl: string
    caption: string
    captionTranslated: string
  }) => void
  onPostStory: (payload: {
    imageDataUrl: string
    caption: string
  }) => void
  onSaveMemory: (payload: {
    imageDataUrl: string
    caption: string
    locked: boolean
  }) => void
}

export default function QuickCapture({
  open,
  peerLanguage = 'en',
  onClose,
  onSendToChat,
  onPostStory,
  onSaveMemory,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [facingUser, setFacingUser] = useState(true)

  useEffect(() => {
    if (!open) {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      return
    }
    let cancelled = false
    async function start() {
      setError(null)
      setPreview(null)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingUser ? 'user' : 'environment' },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play()
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Камерата не е достъпна — качи снимка'
        )
      }
    }
    void start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [open, facingUser])

  function snap() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 720
    canvas.height = video.videoHeight || 1280
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    setPreview(canvas.toDataURL('image/jpeg', 0.92))
  }

  const translated = caption.trim()
    ? (() => {
        const smart = bilingualCaption(caption.trim(), peerLanguage)
        return smart !== caption.trim()
          ? smart
          : `↔ ${peerLanguage.toUpperCase()}: ${caption.trim()}`
      })()
    : ''

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/80 px-3 py-4 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b1020] shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 text-white">
          <p className="text-sm font-semibold">Quick Capture</p>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative aspect-[9/16] bg-black">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <video
              ref={videoRef}
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <p className="mb-1 flex items-center gap-1 text-[10px] text-teal-200">
              <Sparkles className="h-3 w-3" />
              OmniVoice: двуезичен caption автоматично
            </p>
            <input
              className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40"
              placeholder="Подпис…"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            {translated ? (
              <p className="mt-1 text-[11px] text-white/70">{translated}</p>
            ) : null}
          </div>
        </div>

        {error ? (
          <p className="px-4 py-2 text-xs text-amber-300">{error}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-2 p-3">
          {!preview ? (
            <>
              <button
                type="button"
                className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black"
                onClick={snap}
              >
                <Camera className="mr-1 inline h-3.5 w-3.5" />
                Snap
              </button>
              <button
                type="button"
                className="rounded-full bg-white/10 px-3 py-2 text-xs text-white"
                onClick={() => setFacingUser((v) => !v)}
              >
                Flip
              </button>
              <label className="cursor-pointer rounded-full bg-white/10 px-3 py-2 text-xs text-white">
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => {
                      if (typeof reader.result === 'string') setPreview(reader.result)
                    }
                    reader.readAsDataURL(file)
                  }}
                />
              </label>
            </>
          ) : (
            <>
              <button
                type="button"
                className="rounded-full bg-white/10 px-3 py-2 text-xs text-white"
                onClick={() => setPreview(null)}
              >
                Повторно
              </button>
              <button
                type="button"
                className="rounded-full bg-teal-500 px-3 py-2 text-xs font-semibold text-white"
                onClick={() => {
                  if (!preview) return
                  onSendToChat({
                    imageDataUrl: preview,
                    caption: caption || 'Snap',
                    captionTranslated: translated || caption || 'Snap',
                  })
                  onClose()
                }}
              >
                <Send className="mr-1 inline h-3.5 w-3.5" />
                В чата
              </button>
              <button
                type="button"
                className="rounded-full bg-amber-500 px-3 py-2 text-xs font-semibold text-black"
                onClick={() => {
                  if (!preview) return
                  onPostStory({
                    imageDataUrl: preview,
                    caption: caption || 'Story snap',
                  })
                  onClose()
                }}
              >
                Story
              </button>
              <button
                type="button"
                className="rounded-full bg-white/10 px-3 py-2 text-xs text-white"
                onClick={() => {
                  if (!preview) return
                  onSaveMemory({
                    imageDataUrl: preview,
                    caption: caption || 'Memory',
                    locked: false,
                  })
                  onClose()
                }}
              >
                Memories
              </button>
              <button
                type="button"
                className="rounded-full bg-rose-500/80 px-3 py-2 text-xs font-semibold text-white"
                onClick={() => {
                  if (!preview) return
                  onSaveMemory({
                    imageDataUrl: preview,
                    caption: caption || 'Eyes Only',
                    locked: true,
                  })
                  onClose()
                }}
              >
                Eyes Only
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
