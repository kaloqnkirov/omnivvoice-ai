'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'

type Props = {
  disabled?: boolean
  onRecorded: (payload: {
    dataUrl: string
    durationSec: number
    mimeType: string
  }) => void
}

export default function VoiceNoteButton({ disabled, onRecorded }: Props) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAt = useRef(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      mediaRef.current?.stream.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function start() {
    if (disabled || recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const reader = new FileReader()
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            onRecorded({
              dataUrl: reader.result,
              durationSec: Math.max(
                1,
                Math.round((Date.now() - startedAt.current) / 1000)
              ),
              mimeType,
            })
          }
        }
        reader.readAsDataURL(blob)
        stream.getTracks().forEach((t) => t.stop())
      }
      mediaRef.current = recorder
      startedAt.current = Date.now()
      setSeconds(0)
      recorder.start()
      setRecording(true)
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => s + 1)
      }, 1000)
    } catch {
      // mic denied
    }
  }

  function stop() {
    if (!recording) return
    mediaRef.current?.stop()
    mediaRef.current = null
    setRecording(false)
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  return (
    <button
      type="button"
      className={`ov-icon-btn ${recording ? '!bg-red-500/20 !text-red-400' : ''}`}
      title={recording ? 'Спри записа' : 'Гласова бележка'}
      disabled={disabled}
      onClick={() => void (recording ? stop() : start())}
    >
      {recording ? (
        <span className="flex items-center gap-1 text-[10px] font-bold">
          <Square className="h-3 w-3 fill-current" />
          {seconds}s
        </span>
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </button>
  )
}
