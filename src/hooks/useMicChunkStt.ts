'use client'

import { useEffect, useRef } from 'react'
import { isTtsSpeaking } from '@/lib/translation'

/**
 * Chunked STT via MediaRecorder + /api/transcribe.
 * Works on local mic (guest send) or remote LiveKit track (host receive).
 * Does not need Web Speech API.
 */
export function useMicChunkStt(options: {
  enabled: boolean
  track: MediaStreamTrack | null
  identity?: string
  sourceLangHint?: string
  onTranscript: (text: string, from: string) => void
  onError?: (message: string) => void
}) {
  const {
    enabled,
    track,
    identity = 'local',
    sourceLangHint,
    onTranscript,
    onError,
  } = options
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const langRef = useRef(sourceLangHint)
  langRef.current = sourceLangHint
  const busyRef = useRef(false)
  const lastSentRef = useRef('')
  const lastErrAtRef = useRef(0)

  useEffect(() => {
    if (!enabled || !track || track.readyState !== 'live') return
    if (typeof window === 'undefined') return

    let recorder: MediaRecorder | null = null
    let chunks: BlobPart[] = []
    let speaking = false
    let silentMs = 0
    let voicedMs = 0
    let timer = 0
    let closed = false

    const stream = new MediaStream([track])
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    source.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)

    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : ''

    const flush = async () => {
      if (!recorder || recorder.state === 'inactive') return
      if (busyRef.current || isTtsSpeaking()) {
        try {
          recorder.stop()
        } catch {
          /* ignore */
        }
        chunks = []
        return
      }
      busyRef.current = true
      await new Promise<void>((resolve) => {
        recorder!.onstop = () => resolve()
        try {
          recorder!.stop()
        } catch {
          resolve()
        }
      })
      const blob = new Blob(chunks, { type: mime || 'audio/webm' })
      chunks = []
      recorder = null
      if (blob.size < 600) {
        busyRef.current = false
        return
      }
      try {
        const body = new FormData()
        body.append('audio', blob, 'speech.webm')
        if (langRef.current) body.append('lang', langRef.current)
        const res = await fetch('/api/transcribe', { method: 'POST', body })
        const dataJson = (await res.json().catch(() => ({}))) as {
          text?: string
          error?: string
        }
        if (!res.ok || dataJson.error) {
          const now = Date.now()
          if (now - lastErrAtRef.current > 8000) {
            lastErrAtRef.current = now
            onErrorRef.current?.(dataJson.error || `STT HTTP ${res.status}`)
          }
        }
        const text = (dataJson.text || '').trim()
        const key = text.toLowerCase().replace(/\s+/g, ' ').slice(0, 120)
        if (
          text.length >= 2 &&
          key !== lastSentRef.current &&
          !isTtsSpeaking()
        ) {
          lastSentRef.current = key
          onTranscriptRef.current(text, identity)
        }
      } catch {
        /* ignore */
      } finally {
        busyRef.current = false
      }
    }

    const tick = () => {
      if (closed) return
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i += 1) {
        const v = (data[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / data.length)
      const hot = rms > 0.022

      if (isTtsSpeaking()) {
        if (speaking && recorder) {
          void flush()
          speaking = false
          voicedMs = 0
          silentMs = 0
        }
        timer = window.setTimeout(tick, 80) as unknown as number
        return
      }

      if (hot) {
        voicedMs += 80
        silentMs = 0
        if (!speaking && voicedMs > 200) {
          speaking = true
          chunks = []
          try {
            recorder = mime
              ? new MediaRecorder(stream, { mimeType: mime })
              : new MediaRecorder(stream)
            recorder.ondataavailable = (e) => {
              if (e.data.size) chunks.push(e.data)
            }
            recorder.start(200)
          } catch {
            speaking = false
            recorder = null
          }
        }
      } else {
        silentMs += 80
        voicedMs = 0
        if (speaking && silentMs > 550) {
          speaking = false
          void flush()
        }
      }
      timer = window.setTimeout(tick, 80) as unknown as number
    }

    void ctx.resume().then(() => {
      if (!closed) tick()
    })

    return () => {
      closed = true
      window.clearTimeout(timer)
      try {
        if (recorder && recorder.state !== 'inactive') recorder.stop()
      } catch {
        /* ignore */
      }
      try {
        source.disconnect()
      } catch {
        /* ignore */
      }
      void ctx.close().catch(() => undefined)
    }
  }, [enabled, track, identity])
}
