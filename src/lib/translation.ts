'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { APP_LANGUAGES, resolveSpeechCode } from '@/lib/languages'
import {
  playbackRateForPreset,
  type VoicePresetId,
} from '@/lib/voice-presets'

export type TranslateOptions = {
  targetLanguage: string
  speak?: boolean
  voiceLang?: string
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

function toLangCodeClient(raw: string | undefined, fallback = 'en'): string {
  const value = (raw || '').trim().toLowerCase()
  if (!value) return fallback
  const byCode = APP_LANGUAGES.find(
    (l) => l.code === value || value.startsWith(`${l.code}-`)
  )
  if (byCode) return byCode.code
  const byName = APP_LANGUAGES.find(
    (l) =>
      l.name.toLowerCase() === value ||
      l.nativeName.toLowerCase() === value ||
      value.includes(l.name.toLowerCase())
  )
  return byName?.code || fallback
}

/** Browser-side fallback when server/Gemini is down (uses the phone's IP) */
async function clientFallbackTranslate(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string,
  signal?: AbortSignal
): Promise<string | null> {
  const tl = toLangCodeClient(targetLanguage, 'en')
  const sl = sourceLanguage
    ? toLangCodeClient(sourceLanguage, 'auto')
    : 'auto'

  try {
    const url =
      `https://translate.googleapis.com/translate_a/single?client=gtx` +
      `&sl=${encodeURIComponent(sl)}` +
      `&tl=${encodeURIComponent(tl)}` +
      `&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url, { signal })
    if (res.ok) {
      const data = (await res.json()) as unknown
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const joined = (data[0] as unknown[])
          .map((chunk) =>
            Array.isArray(chunk) && typeof chunk[0] === 'string' ? chunk[0] : ''
          )
          .join('')
          .trim()
        if (joined) return joined
      }
    }
  } catch {
    /* try MyMemory */
  }

  try {
    const pair = `${sl === 'auto' ? 'autodetect' : sl}|${tl}`
    const url =
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}` +
      `&langpair=${encodeURIComponent(pair)}`
    const res = await fetch(url, { signal })
    if (!res.ok) return null
    const data = (await res.json()) as {
      responseData?: { translatedText?: string }
      responseStatus?: number
    }
    const out = data.responseData?.translatedText?.trim()
    if (out && data.responseStatus === 200 && !/^MYMEMORY WARNING/i.test(out)) {
      return out
    }
  } catch {
    /* ignore */
  }
  return null
}

export async function translateText(
  text: string,
  targetLanguage: string,
  options?: {
    emotionSafe?: boolean
    tone?: 'natural' | 'formal' | 'casual'
    sourceLanguage?: string
    signal?: AbortSignal
    /** Rate-limit bucket (user / guest id) */
    userKey?: string
    /**
     * Gemini tone polish. Default false — production uses Google NMT for scale.
     * Set true only for premium “natural tone” passes.
     */
    polish?: boolean
    /** free/normal = free translators; business/podcast = paid Google Cloud */
    plan?: 'free' | 'normal' | 'business' | 'podcast'
    /** Host profile id — monthly 1.5M/2.5M char quota */
    billingUserId?: string
    /** Invite-referral bonus Cloud characters */
    bonusChars?: number
  }
): Promise<string> {
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        targetLanguage,
        sourceLanguage: options?.sourceLanguage,
        emotionSafe: options?.emotionSafe ?? true,
        tone: options?.tone ?? 'natural',
        // VoiceBridge default: fast path, no Gemini on every chunk
        polish: options?.polish ?? false,
        userKey: options?.userKey,
        // Guests + Normal plan never hit paid Google/Gemini unless host is paid / has bonus
        plan: options?.plan ?? 'free',
        billingUserId: options?.billingUserId,
        bonusChars: options?.bonusChars,
      }),
      signal: options?.signal,
    })

    const data = (await response.json()) as {
      translation?: string
      error?: string
    }

    if (response.ok && data.translation) return data.translation
  } catch {
    /* fall through to browser fallback */
  }

  const local = await clientFallbackTranslate(
    text,
    targetLanguage,
    options?.sourceLanguage,
    options?.signal
  )
  if (local) return local

  throw new Error(
    'Преводът е временно недостъпен. Провери връзката и опитай пак.'
  )
}

function pickVoice(
  lang: string,
  options?: { voiceURI?: string; voiceName?: string }
): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  const prefix = lang.slice(0, 2).toLowerCase()
  const inLang = (v: SpeechSynthesisVoice) =>
    v.lang.toLowerCase().startsWith(prefix)

  // Explicit URI wins even if lang tag mismatches (common on BG/Windows)
  if (options?.voiceURI) {
    const byUri = voices.find((item) => item.voiceURI === options.voiceURI)
    if (byUri) return byUri
  }
  if (options?.voiceName) {
    const name = options.voiceName.toLowerCase()
    const byName =
      voices.find((item) => item.name.toLowerCase() === name) ||
      voices.find((item) => item.name.toLowerCase().includes(name))
    if (byName) return byName
  }
  return (
    voices.find((item) => item.lang.toLowerCase() === lang.toLowerCase()) ||
    voices.find((item) => inLang(item)) ||
    null
  )
}

/** Resolve display name for a local voiceURI (to send across devices) */
export function resolveVoiceName(voiceURI?: string): string | undefined {
  if (!voiceURI || typeof window === 'undefined' || !window.speechSynthesis) {
    return undefined
  }
  return window.speechSynthesis
    .getVoices()
    .find((item) => item.voiceURI === voiceURI)?.name
}

function isMobileBrowser() {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

/** Shared element — must be play()'d once from a user tap or mobile blocks TTS */
let cloudAudio: HTMLAudioElement | null = null
let mediaPlaybackUnlocked = false
let audioCtx: AudioContext | null = null

const SILENT_WAV =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQQAAAAAAA=='

/**
 * Call from the same tap as “Разреши микрофон”.
 * Without this, Android Chrome blocks later VoiceBridge TTS (no sound).
 */
export function unlockMediaPlayback() {
  if (typeof window === 'undefined') return
  unlockSpeechSynthesis()
  try {
    if (!cloudAudio) cloudAudio = new Audio()
    cloudAudio.src = SILENT_WAV
    cloudAudio.volume = 0.01
    void cloudAudio.play().then(() => {
      mediaPlaybackUnlocked = true
    })
  } catch {
    /* ignore */
  }
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (AC) {
      if (!audioCtx) audioCtx = new AC()
      void audioCtx.resume()
    }
  } catch {
    /* ignore */
  }
}

let pitchedSource: AudioBufferSourceNode | null = null

function resolveAudioContext(): AudioContext | null {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AC) return null
    if (!audioCtx) audioCtx = new AC()
    return audioCtx
  } catch {
    return null
  }
}

/** Bake pitch into PCM so browsers that ignore playbackRate still differ */
function bakePitchBuffer(
  ctx: AudioContext,
  input: AudioBuffer,
  rate: number
): AudioBuffer {
  // Allow deep male (~0.5); Google BG TTS base is female
  const safe = Math.min(1.95, Math.max(0.5, rate))
  if (Math.abs(safe - 1) < 0.02) return input
  const newLen = Math.max(1, Math.floor(input.length / safe))
  const out = ctx.createBuffer(
    input.numberOfChannels,
    newLen,
    input.sampleRate
  )
  for (let ch = 0; ch < input.numberOfChannels; ch++) {
    const src = input.getChannelData(ch)
    const dst = out.getChannelData(ch)
    for (let i = 0; i < newLen; i++) {
      const pos = i * safe
      const i0 = Math.floor(pos)
      const i1 = Math.min(i0 + 1, src.length - 1)
      const t = pos - i0
      dst[i] = src[i0] * (1 - t) + src[i1] * t
    }
  }
  return out
}

async function playBlobWithRate(blob: Blob, playbackRate: number) {
  const rate = Math.min(1.95, Math.max(0.5, playbackRate))
  const ctx = resolveAudioContext()
  if (ctx) {
    try {
      if (ctx.state === 'suspended') await ctx.resume()
      try {
        pitchedSource?.stop()
      } catch {
        /* ignore */
      }
      const raw = await ctx.decodeAudioData(await blob.arrayBuffer())
      // Bake rate into samples — do NOT rely on src.playbackRate (often ignored)
      const buffer = bakePitchBuffer(ctx, raw, rate)
      const src = ctx.createBufferSource()
      const gain = ctx.createGain()
      gain.gain.value = 1
      src.buffer = buffer
      src.playbackRate.value = 1
      src.connect(gain)
      gain.connect(ctx.destination)
      pitchedSource = src
      markTtsSpeaking(buffer.duration * 1000)
      const waitMs = Math.min(60000, Math.max(800, buffer.duration * 1000 + 400))
      await new Promise<void>((resolve) => {
        let done = false
        const finish = () => {
          if (done) return
          done = true
          window.clearTimeout(timer)
          ttsGateUntil = Date.now() + 250
          if (pitchedSource === src) pitchedSource = null
          resolve()
        }
        const timer = window.setTimeout(finish, waitMs)
        src.onended = finish
        try {
          src.start(0)
          mediaPlaybackUnlocked = true
          notifyTtsAudible()
        } catch {
          finish()
        }
      })
      return
    } catch {
      /* fall through to <audio> */
    }
  }

  const obj = URL.createObjectURL(blob)
  if (!cloudAudio) cloudAudio = new Audio()
  try {
    cloudAudio.pause()
  } catch {
    /* ignore */
  }
  cloudAudio.volume = 1
  cloudAudio.defaultPlaybackRate = rate
  cloudAudio.playbackRate = rate
  cloudAudio.src = obj
  markTtsSpeaking(estimateSpeakMs('x'.repeat(40)) / rate)
  await new Promise<void>((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      window.clearTimeout(timer)
      try {
        URL.revokeObjectURL(obj)
      } catch {
        /* ignore */
      }
      ttsGateUntil = Date.now() + 250
      resolve()
    }
    const timer = window.setTimeout(finish, 30000)
    cloudAudio!.onended = finish
    cloudAudio!.onerror = finish
    void cloudAudio!.play().then(() => {
      mediaPlaybackUnlocked = true
      notifyTtsAudible()
    }).catch(() => finish())
  })
}

/** Google TTS URL limit ~200 chars — split on word/sentence boundaries */
function splitTtsChunks(text: string, maxLen = 160): string[] {
  const t = text.trim()
  if (!t) return []
  if (t.length <= maxLen) return [t]
  const parts: string[] = []
  let rest = t
  while (rest.length > maxLen) {
    const window = rest.slice(0, maxLen)
    let cut = Math.max(
      window.lastIndexOf('. '),
      window.lastIndexOf('? '),
      window.lastIndexOf('! '),
      window.lastIndexOf('。'),
      window.lastIndexOf('、'),
      window.lastIndexOf(' ')
    )
    if (cut < maxLen * 0.35) cut = maxLen
    parts.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  if (rest) parts.push(rest)
  return parts.filter(Boolean)
}

function speakOsFallback(chunk: string, lang: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  try {
    const u = new SpeechSynthesisUtterance(chunk)
    u.lang = lang
    u.rate = 1.05
    u.pitch = 1
    window.speechSynthesis.speak(u)
    markTtsSpeaking(estimateSpeakMs(chunk))
  } catch {
    /* ignore */
  }
}

async function speakCloudChunk(
  chunk: string,
  lang: string,
  playbackRate: number,
  allowSpeechFallback: boolean
) {
  const tl = (lang || 'en').slice(0, 2).toLowerCase()
  const proxyUrl =
    `/api/tts?lang=${encodeURIComponent(tl)}&q=${encodeURIComponent(chunk)}`
  const ac = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
    ? AbortSignal.timeout(10000)
    : undefined
  try {
    let res = await fetch(proxyUrl, { cache: 'no-store', signal: ac })
    if (!res.ok) {
      const direct =
        `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob` +
        `&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(chunk)}`
      res = await fetch(direct, { signal: ac })
    }
    if (!res.ok) throw new Error('tts http')
    const blob = await res.blob()
    if (!blob.size) throw new Error('tts empty')
    await playBlobWithRate(blob, playbackRate)
  } catch {
    if (!allowSpeechFallback) {
      console.warn('[OmniVoice] Pitched TTS failed — not falling back to OS voice')
      return
    }
    speakOsFallback(chunk, lang)
  }
}

/** Pitched TTS via same-origin /api/tts — never silent-fallback to Windows male SS */
async function speakViaCloudTts(
  text: string,
  lang: string,
  tone?: {
    pitch?: number
    rate?: number
    playbackRate?: number
    allowSpeechFallback?: boolean
  }
) {
  const chunks = splitTtsChunks(text)
  if (!chunks.length) return
  const playbackRate =
    tone?.playbackRate ??
    playbackRateForPreset(undefined, tone?.pitch ?? 1, tone?.rate ?? 1)
  const allowFallback = tone?.allowSpeechFallback !== false
  // Gate for full utterance so group STT stays muted through all chunks
  markTtsSpeaking(estimateSpeakMs(text))
  for (const chunk of chunks) {
    await speakCloudChunk(chunk, lang, playbackRate, allowFallback)
  }
}

function speakLocal(
  text: string,
  options: {
    lang: string
    voiceURI?: string
    voiceName?: string
    rate?: number
    pitch?: number
    queue?: boolean
  }
): boolean {
  if (!window.speechSynthesis) return false
  try {
    void window.speechSynthesis.getVoices()
    if (!options.queue) window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = options.lang
    utterance.rate = Math.min(2, Math.max(0.5, options.rate ?? 1.05))
    utterance.pitch = Math.min(2, Math.max(0, options.pitch ?? 1))
    const voice = pickVoice(options.lang, {
      voiceURI: options.voiceURI,
      voiceName: options.voiceName,
    })
    if (voice) {
      utterance.voice = voice
      if (!utterance.lang || utterance.lang.length < 2) {
        utterance.lang = voice.lang
      }
    }
    let started = false
    utterance.onstart = () => {
      started = true
      markTtsSpeaking(estimateSpeakMs(text))
    }
    utterance.onend = () => {
      ttsGateUntil = Date.now() + 250
    }
    window.speechSynthesis.speak(utterance)
    window.setTimeout(() => {
      try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume()
      } catch {
        /* ignore */
      }
      if (!started) {
        void speakViaCloudTts(text, options.lang, {
          pitch: options.pitch,
          rate: options.rate,
        })
      }
    }, 500)
    return true
  } catch {
    return false
  }
}

export function speakText(
  text: string,
  options: {
    lang?: string
    voiceURI?: string
    voiceName?: string
    rate?: number
    pitch?: number
    /** Curated preset — forces pitched cloud so female/child actually differ */
    voicePreset?: VoicePresetId | ''
    /** Queue after current speech (continuous talk). Default cancels. */
    queue?: boolean
    /**
     * Prefer speechSynthesis. Avoid for voice samples — Windows often
     * ignores pitch and always plays the same male voice.
     */
    preferLocal?: boolean
    /** Skip OS TTS; always use pitched cloud/WebAudio (voice picker) */
    forcePitchedCloud?: boolean
    /**
     * VoiceBridge receive path: cloud first (audible on phones), OS fallback.
     * Do not trust speakLocal alone — it often “starts” with no sound.
     */
    bridgePlayback?: boolean
  } = {}
) {
  if (typeof window === 'undefined') return
  const trimmed = text.trim()
  if (!trimmed) return
  const lang = options.lang || 'en-US'
  markTtsSpeaking(estimateSpeakMs(trimmed))

  const playbackRate = playbackRateForPreset(
    options.voicePreset,
    options.pitch,
    options.rate
  )
  const tone = {
    pitch: options.pitch,
    rate: options.rate,
    playbackRate,
  }

  // Preset / strong pitch → pitched cloud (SS pitch is unreliable on Windows)
  const pitchOff =
    typeof options.pitch === 'number' && Math.abs(options.pitch - 1) > 0.12
  const forceCloud =
    options.forcePitchedCloud ||
    Boolean(options.voicePreset) ||
    pitchOff ||
    Boolean(options.bridgePlayback)

  if (!options.queue) {
    try {
      window.speechSynthesis?.cancel()
    } catch {
      /* ignore */
    }
    try {
      pitchedSource?.stop()
    } catch {
      /* ignore */
    }
  }

  // VoiceBridge / presets: cloud first so translation is actually heard
  if (forceCloud || options.bridgePlayback) {
    void speakViaCloudTts(trimmed, lang, {
      ...tone,
      allowSpeechFallback: !options.forcePitchedCloud,
    })
    return
  }

  if (options.preferLocal !== false) {
    const ok = speakLocal(trimmed, {
      lang,
      voiceURI: options.voiceURI,
      voiceName: options.voiceName,
      rate: options.rate,
      pitch: options.pitch,
      queue: options.queue,
    })
    if (ok) return
  }

  void speakViaCloudTts(trimmed, lang, {
    ...tone,
    allowSpeechFallback: true,
  })
}

/** Voice-picker sample — pitched /api/tts only (no Windows male SS) */
export function speakVoicePresetSample(
  presetId: VoicePresetId,
  text: string,
  lang: string
) {
  try {
    window.speechSynthesis?.cancel()
  } catch {
    /* ignore */
  }
  void unlockMediaPlayback()
  void speakText(text, {
    lang,
    voicePreset: presetId,
    forcePitchedCloud: true,
    queue: false,
  })
}

/** Call once after a user gesture so mobile browsers allow speechSynthesis. */
export function unlockSpeechSynthesis() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  try {
    void window.speechSynthesis.getVoices()
    window.speechSynthesis.cancel()
    const tip = new SpeechSynthesisUtterance(' ')
    tip.volume = 0
    window.speechSynthesis.speak(tip)
    window.speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
}

/** While local TTS plays, ignore mic STT — stops echo loop (repeat translations) */
let ttsGateUntil = 0
/** Fired when translated audio actually starts (so we can mute raw mic safely) */
let ttsAudibleListener: (() => void) | null = null

export function setTtsAudibleListener(fn: (() => void) | null) {
  ttsAudibleListener = fn
}

function notifyTtsAudible() {
  try {
    ttsAudibleListener?.()
  } catch {
    /* ignore */
  }
}

export function stopSpeaking() {
  ttsGateUntil = 0
  if (typeof window === 'undefined') return
  try {
    window.speechSynthesis?.cancel()
  } catch {
    /* ignore */
  }
  try {
    pitchedSource?.stop()
    pitchedSource = null
  } catch {
    /* ignore */
  }
  try {
    if (cloudAudio) {
      cloudAudio.pause()
      cloudAudio.removeAttribute('src')
      cloudAudio.load()
    }
  } catch {
    /* ignore */
  }
}

/** Pause before translate — snappy but not every syllable */
const ENDPOINT_MS = 380
/** Minimum characters before an interim commit */
const MIN_COMMIT_CHARS = 3
/** Don't translate every single word — need at least this many new chars */
const MIN_DELTA_CHARS = 4

export function markTtsSpeaking(durationMs: number) {
  const until = Date.now() + Math.max(600, durationMs)
  if (until > ttsGateUntil) ttsGateUntil = until
}

export function isTtsSpeaking(): boolean {
  return Date.now() < ttsGateUntil
}

function estimateSpeakMs(text: string) {
  return Math.min(20000, Math.max(900, text.split(/\s+/).length * 380 + 500))
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
  userKey?: string
  polish?: boolean
  plan?: 'free' | 'normal' | 'business' | 'podcast'
  billingUserId?: string
  bonusChars?: number
  onSource?: (text: string) => void
  onTranslation?: (text: string) => void
  /** Fired when a source chunk + its translation are committed (for Business Intel) */
  onTranscriptLine?: (line: {
    source: string
    translation: string
    at: string
  }) => void
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
    userKey,
    polish = false,
    plan = 'free',
    billingUserId,
    bonusChars = 0,
    onSource,
    onTranslation,
    onTranscriptLine,
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
  const shouldListenRef = useRef(false)
  const mountedRef = useRef(true)
  const endpointTimerRef = useRef<number | null>(null)
  const latestInterimRef = useRef('')
  const committedSourceRef = useRef('')
  const pendingSourceRef = useRef<string | null>(null)
  const pumpingRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const translatedAccumRef = useRef('')

  const targetLanguageRef = useRef(targetLanguage)
  const sourceLangRef = useRef(sourceLang)
  const speakOutputRef = useRef(speakOutput)
  const voiceLangRef = useRef(voiceLang)
  const voiceURIRef = useRef(voiceURI)
  const voiceRateRef = useRef(voiceRate)
  const voicePitchRef = useRef(voicePitch)
  const emotionSafeRef = useRef(emotionSafe)
  const toneRef = useRef(tone)
  const userKeyRef = useRef(userKey)
  const polishRef = useRef(polish)
  const planRef = useRef(plan)
  const billingUserIdRef = useRef(billingUserId)
  const bonusCharsRef = useRef(bonusChars)
  const onSourceRef = useRef(onSource)
  const onTranslationRef = useRef(onTranslation)
  const onTranscriptLineRef = useRef(onTranscriptLine)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    targetLanguageRef.current = targetLanguage
    sourceLangRef.current = sourceLang
    speakOutputRef.current = speakOutput
    voiceLangRef.current = voiceLang
    voiceURIRef.current = voiceURI
    voiceRateRef.current = voiceRate
    voicePitchRef.current = voicePitch
    emotionSafeRef.current = emotionSafe
    toneRef.current = tone
    userKeyRef.current = userKey
    polishRef.current = polish
    planRef.current = plan
    billingUserIdRef.current = billingUserId
    bonusCharsRef.current = bonusChars
    onSourceRef.current = onSource
    onTranslationRef.current = onTranslation
    onTranscriptLineRef.current = onTranscriptLine
    onErrorRef.current = onError
  })

  const pumpTranslate = useCallback(async () => {
    if (pumpingRef.current || !mountedRef.current) return
    pumpingRef.current = true
    setTranslating(true)
    try {
      while (mountedRef.current && pendingSourceRef.current) {
        const full = pendingSourceRef.current.trim()
        pendingSourceRef.current = null
        if (!full) continue

        const committed = committedSourceRef.current
        let toTranslate = full
        if (
          committed &&
          full.toLowerCase().startsWith(committed.toLowerCase())
        ) {
          const delta = full.slice(committed.length).trim()
          if (!delta) continue
          toTranslate = delta
        }

        setSourceText(full)
        onSourceRef.current?.(toTranslate)

        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller

        try {
          const translation = await translateText(
            toTranslate,
            targetLanguageRef.current,
            {
              emotionSafe: emotionSafeRef.current,
              tone: toneRef.current,
              sourceLanguage: sourceLangRef.current,
              signal: controller.signal,
              userKey: userKeyRef.current,
              polish: polishRef.current,
              plan: planRef.current,
              billingUserId: billingUserIdRef.current,
              bonusChars: bonusCharsRef.current,
            }
          )
          if (!mountedRef.current || controller.signal.aborted) return
          if (pendingSourceRef.current) continue

          committedSourceRef.current = full
          translatedAccumRef.current = translatedAccumRef.current
            ? `${translatedAccumRef.current} ${translation}`.trim()
            : translation
          setTranslatedText(translatedAccumRef.current)
          onTranslationRef.current?.(translation)
          onTranscriptLineRef.current?.({
            source: toTranslate,
            translation,
            at: new Date().toISOString(),
          })
          if (speakOutputRef.current) {
            speakText(translation, {
              lang:
                voiceLangRef.current ||
                guessVoiceLang(targetLanguageRef.current),
              voiceURI: voiceURIRef.current,
              rate: voiceRateRef.current,
              pitch: voicePitchRef.current,
              queue: true,
            })
          }
        } catch (error) {
          if (!mountedRef.current) return
          if (error instanceof Error && error.name === 'AbortError') continue
          const message =
            error instanceof Error ? error.message : 'Translation failed'
          onErrorRef.current?.(message)
        }
      }
    } finally {
      pumpingRef.current = false
      if (mountedRef.current) setTranslating(false)
      if (pendingSourceRef.current) void pumpTranslate()
    }
  }, [])

  const requestTranslate = useCallback(
    (text: string) => {
      const normalized = text.trim()
      if (!normalized || !mountedRef.current) return
      pendingSourceRef.current = normalized
      // Cancel in-flight Gemini so we never wait on stale words
      abortRef.current?.abort()
      void pumpTranslate()
    },
    [pumpTranslate]
  )

  const commitIfReady = useCallback(
    (text: string, force = false) => {
      const normalized = text.trim()
      if (!normalized) return
      if (!force && normalized.length < MIN_COMMIT_CHARS) return
      if (
        normalized.toLowerCase() === committedSourceRef.current.toLowerCase()
      ) {
        return
      }
      const committed = committedSourceRef.current
      if (
        committed &&
        normalized.toLowerCase().startsWith(committed.toLowerCase())
      ) {
        const delta = normalized.slice(committed.length).trim()
        if (delta.length < MIN_DELTA_CHARS && !force) return
      }
      requestTranslate(normalized)
    },
    [requestTranslate]
  )

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
      // Fast restart — keep listening continuous
      window.setTimeout(() => {
        if (!shouldListenRef.current || !mountedRef.current) return
        try {
          recognition.start()
        } catch {
          /* already started */
        }
      }, 40)
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

      const finalTrim = finalText.trim()
      // While our TTS plays, ignore interim (echo) but ALWAYS send finals —
      // otherwise guest EN never reaches host as VoiceBridge.
      if (isTtsSpeaking() && !finalTrim) return

      const interimTrim = interim.trim()
      latestInterimRef.current = interimTrim
      setInterimText(interimTrim)
      setLevel(
        Math.min(1, (interimTrim.length || finalTrim.length) / 40)
      )

      if (endpointTimerRef.current) {
        window.clearTimeout(endpointTimerRef.current)
        endpointTimerRef.current = null
      }

      // Quota-friendly: translate after a pause, not every word
      if (interimTrim && !isTtsSpeaking()) {
        endpointTimerRef.current = window.setTimeout(() => {
          if (!mountedRef.current || isTtsSpeaking()) return
          commitIfReady(latestInterimRef.current, true)
        }, ENDPOINT_MS)
      }

      if (finalTrim) {
        if (endpointTimerRef.current) {
          window.clearTimeout(endpointTimerRef.current)
          endpointTimerRef.current = null
        }
        commitIfReady(finalTrim, true)
        window.setTimeout(() => {
          if (!latestInterimRef.current) {
            committedSourceRef.current = ''
            translatedAccumRef.current = ''
          }
        }, 50)
      }
    }

    recognitionRef.current = recognition

    return () => {
      mountedRef.current = false
      shouldListenRef.current = false
      if (endpointTimerRef.current) {
        window.clearTimeout(endpointTimerRef.current)
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
  }, [sourceLang, commitIfReady])

  useEffect(() => {
    const recognition = recognitionRef.current
    if (!recognition || !supported) return

    if (enabled) {
      shouldListenRef.current = true
      committedSourceRef.current = ''
      translatedAccumRef.current = ''
      pendingSourceRef.current = null
      abortRef.current?.abort()
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
    const recognition = recognitionRef.current
    if (!recognition) return
    try {
      recognition.start()
    } catch {
      /* already running */
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
    listening,
    supported,
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
  return resolveSpeechCode(targetLanguage)
}
