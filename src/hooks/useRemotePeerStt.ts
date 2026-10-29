'use client'

import { useEffect, useRef } from 'react'
import { isTtsSpeaking } from '@/lib/translation'

type RemoteAudio = {
  identity: string
  track: MediaStreamTrack
}

/**
 * Host-side STT on remote LiveKit mic — works when the guest phone has no
 * Web Speech API (common on Huawei / iOS). Emits spoken text for VoiceBridge.
 */
export function useRemotePeerStt(options: {
  enabled: boolean
  /** Hint for transcription (peer language ISO), e.g. en */
  sourceLangHint?: string
  remotes: RemoteAudio[]
  onTranscript: (text: string, from: string) => void
}) {
  const { enabled, sourceLangHint, remotes, onTranscript } = options
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript
  const langRef = useRef(sourceLangHint)
  langRef.current = sourceLangHint
  const busyRef = useRef(false)
  const lastSentRef = useRef('')

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    if (!remotes.length) return

    const cleanups: Array<() => void> = []

    remotes.forEach(({ identity, track }) => {
      if (track.readyState !== 'live') return

      let recorder: MediaRecorder | null = null
      let chunks: BlobPart[] = []
      let speaking = false
      let silentMs = 0
      let voicedMs = 0
      let raf = 0
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
        if (blob.size < 800) {
          busyRef.current = false
          return
        }
        try {
          const body = new FormData()
          body.append('audio', blob, 'peer.webm')
          if (langRef.current) body.append('lang', langRef.current)
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body,
          })
          const dataJson = (await res.json().catch(() => ({}))) as {
            text?: string
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
        const hot = rms > 0.045

        if (isTtsSpeaking()) {
          // Don't capture while we play translation (avoid loop)
          if (speaking && recorder) {
            void flush()
            speaking = false
            voicedMs = 0
            silentMs = 0
          }
          raf = window.setTimeout(tick, 100) as unknown as number
          return
        }

        if (hot) {
          voicedMs += 100
          silentMs = 0
          if (!speaking && voicedMs > 250) {
            speaking = true
            chunks = []
            try {
              recorder = mime
                ? new MediaRecorder(stream, { mimeType: mime })
                : new MediaRecorder(stream)
              recorder.ondataavailable = (e) => {
                if (e.data.size) chunks.push(e.data)
              }
              recorder.start(250)
            } catch {
              speaking = false
              recorder = null
            }
          }
        } else {
          silentMs += 100
          voicedMs = 0
          if (speaking && silentMs > 700) {
            speaking = false
            void flush()
          }
        }
        raf = window.setTimeout(tick, 100) as unknown as number
      }

      void ctx.resume().then(() => {
        if (!closed) tick()
      })

      cleanups.push(() => {
        closed = true
        window.clearTimeout(raf)
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
      })
    })

    return () => {
      cleanups.forEach((fn) => fn())
    }
  }, [enabled, remotes])
}
