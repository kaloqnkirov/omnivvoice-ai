'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type TranslateOptions = {
  targetLanguage: string
  speak?: boolean
  voiceLang?: string
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export async function translateText(
  text: string,
  targetLanguage: string,
  options?: {
    emotionSafe?: boolean
    tone?: 'natural' | 'formal' | 'casual'
  }
): Promise<string> {
  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      targetLanguage,
      emotionSafe: options?.emotionSafe ?? true,
      tone: options?.tone ?? 'natural',
    }),
  })

  const data = (await response.json()) as {
    translation?: string
    error?: string
  }

  if (!response.ok || !data.translation) {
    throw new Error(data.error || 'Translation failed')
  }

  return data.translation
}

export function speakText(
  text: string,
  options: {
    lang?: string
    voiceURI?: string
    rate?: number
    pitch?: number
  } = {}
) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = options.lang || 'en-US'
    utterance.rate = options.rate ?? 1
    utterance.pitch = options.pitch ?? 1
    if (options.voiceURI) {
      const voice = window.speechSynthesis
        .getVoices()
        .find((item) => item.voiceURI === options.voiceURI)
      if (voice) utterance.voice = voice
    }
    window.speechSynthesis.speak(utterance)
  } catch {
    /* ignore TTS failures */
  }
}

export function stopSpeaking() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
}

export function useLiveTranslation(options: {
  targetLanguage: string
  enabled: boolean
  sourceLang?: string
  speakOutput?: boolean
  voiceLang?: string
  voiceURI?: string
  voiceRate?: number
  voicePitch?: number
  emotionSafe?: boolean
  tone?: 'natural' | 'formal' | 'casual'
  onSource?: (text: string) => void
  onTranslation?: (text: string) => void
  onError?: (message: string) => void
}) {
  const {
    targetLanguage,
    enabled,
    sourceLang = 'en-US',
    speakOutput = true,
    voiceLang,
    voiceURI,
    voiceRate = 1,
    voicePitch = 1,
    emotionSafe = true,
    tone = 'natural',
    onSource,
    onTranslation,
    onError,
  } = options

  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [translating, setTranslating] = useState(false)
  const [level, setLevel] = useState(0)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const busyRef = useRef(false)
  const shouldListenRef = useRef(false)
  const mountedRef = useRef(true)
  const interimTimerRef = useRef<number | null>(null)

  const targetLanguageRef = useRef(targetLanguage)
  const speakOutputRef = useRef(speakOutput)
  const voiceLangRef = useRef(voiceLang)
  const voiceURIRef = useRef(voiceURI)
  const voiceRateRef = useRef(voiceRate)
  const voicePitchRef = useRef(voicePitch)
  const emotionSafeRef = useRef(emotionSafe)
  const toneRef = useRef(tone)
  const onSourceRef = useRef(onSource)
  const onTranslationRef = useRef(onTranslation)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    targetLanguageRef.current = targetLanguage
    speakOutputRef.current = speakOutput
    voiceLangRef.current = voiceLang
    voiceURIRef.current = voiceURI
    voiceRateRef.current = voiceRate
    voicePitchRef.current = voicePitch
    emotionSafeRef.current = emotionSafe
    toneRef.current = tone
    onSourceRef.current = onSource
    onTranslationRef.current = onTranslation
    onErrorRef.current = onError
  })

  const processFinal = useCallback(async (text: string) => {
    if (!text.trim() || busyRef.current || !mountedRef.current) return
    busyRef.current = true
    setSourceText(text)
    onSourceRef.current?.(text)
    setTranslating(true)
    try {
      const translation = await translateText(text, targetLanguageRef.current, {
        emotionSafe: emotionSafeRef.current,
        tone: toneRef.current,
      })
      if (!mountedRef.current) return
      setTranslatedText(translation)
      onTranslationRef.current?.(translation)
      if (speakOutputRef.current) {
        speakText(translation, {
          lang:
            voiceLangRef.current || guessVoiceLang(targetLanguageRef.current),
          voiceURI: voiceURIRef.current,
          rate: voiceRateRef.current,
          pitch: voicePitchRef.current,
        })
      }
    } catch (error) {
      if (!mountedRef.current) return
      const message =
        error instanceof Error ? error.message : 'Translation failed'
      onErrorRef.current?.(message)
    } finally {
      if (mountedRef.current) setTranslating(false)
      busyRef.current = false
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const Ctor = getSpeechRecognitionCtor()
    setSupported(Boolean(Ctor))
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = sourceLang
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      if (mountedRef.current) setListening(true)
    }

    recognition.onend = () => {
      if (!mountedRef.current) return
      setListening(false)
      if (!shouldListenRef.current) return
      window.setTimeout(() => {
        if (!shouldListenRef.current || !mountedRef.current) return
        try {
          recognition.start()
        } catch {
          /* already started */
        }
      }, 180)
    }

    recognition.onerror = (event) => {
      if (
        event.error === 'aborted' ||
        event.error === 'no-speech' ||
        event.error === 'network'
      ) {
        return
      }
      onErrorRef.current?.(event.error || 'Speech recognition error')
    }

    recognition.onresult = (event) => {
      let interim = ''
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const transcript = result[0]?.transcript || ''
        if (result.isFinal) finalText += `${transcript} `
        else interim += transcript
      }

      if (interimTimerRef.current) {
        window.clearTimeout(interimTimerRef.current)
      }
      interimTimerRef.current = window.setTimeout(() => {
        if (!mountedRef.current) return
        setInterimText(interim)
        setLevel(Math.min(1, (interim.length || finalText.length) / 48))
      }, 50)

      if (finalText.trim()) {
        void processFinal(finalText.trim())
      }
    }

    recognitionRef.current = recognition

    return () => {
      mountedRef.current = false
      shouldListenRef.current = false
      if (interimTimerRef.current) {
        window.clearTimeout(interimTimerRef.current)
      }
      recognition.onstart = null
      recognition.onend = null
      recognition.onerror = null
      recognition.onresult = null
      try {
        recognition.abort()
      } catch {
        try {
          recognition.stop()
        } catch {
          /* ignore */
        }
      }
      recognitionRef.current = null
      stopSpeaking()
    }
  }, [sourceLang, processFinal])

  useEffect(() => {
    const recognition = recognitionRef.current
    if (!recognition || !supported) return

    if (enabled) {
      shouldListenRef.current = true
      const timer = window.setTimeout(() => {
        if (!shouldListenRef.current || !mountedRef.current) return
        try {
          recognition.start()
        } catch {
          /* already running */
        }
      }, 0)
      return () => window.clearTimeout(timer)
    }

    shouldListenRef.current = false
    try {
      recognition.stop()
    } catch {
      /* ignore */
    }
    setListening(false)
    setInterimText('')
    setLevel(0)
    stopSpeaking()
  }, [enabled, supported])

  const start = useCallback(() => {
    shouldListenRef.current = true
    try {
      recognitionRef.current?.start()
    } catch {
      /* ignore */
    }
  }, [])

  const stop = useCallback(() => {
    shouldListenRef.current = false
    try {
      recognitionRef.current?.stop()
    } catch {
      /* ignore */
    }
    stopSpeaking()
  }, [])

  return {
    supported,
    listening,
    interimText,
    sourceText,
    translatedText,
    translating,
    level,
    start,
    stop,
    translateText,
    speakText,
  }
}

function guessVoiceLang(targetLanguage: string) {
  const value = targetLanguage.toLowerCase()
  if (value.startsWith('es') || value.includes('spanish')) return 'es-ES'
  if (value.startsWith('de') || value.includes('german')) return 'de-DE'
  if (value.startsWith('fr') || value.includes('french')) return 'fr-FR'
  if (value.startsWith('pt') || value.includes('portuguese')) return 'pt-BR'
  if (value.startsWith('ja') || value.includes('japanese')) return 'ja-JP'
  if (value.startsWith('bg') || value.includes('bulgarian')) return 'bg-BG'
  return 'en-US'
}
