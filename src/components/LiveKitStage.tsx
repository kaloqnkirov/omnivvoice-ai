'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import {
  AudioPresets,
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  LocalAudioTrack,
  LocalVideoTrack,
  type LocalTrack,
  type RemoteParticipant,
  type RemoteTrackPublication,
  type VideoCaptureOptions,
} from 'livekit-client'

/** Visible on the yellow Allow button — proves the phone loaded this build */
const MEDIA_BUILD = 'cam23'
import {
  BackgroundProcessor,
  supportsBackgroundProcessors,
} from '@livekit/track-processors'
import { CameraOff, Loader2 } from 'lucide-react'
import { loadBannerBlob } from '@/lib/banner-url'
import ParallaxRoomBg from '@/components/ParallaxRoomBg'
import {
  VIDEO_FILTERS,
  VIDEO_QUALITY,
  getStudioRoom,
  type CustomStudioRoom,
  type VideoFilterId,
  type VideoQualityId,
} from '@/lib/studio-rooms'
import type { StageCutout } from '@/lib/stage-cutout'
import { chromaKeyDataUrl } from '@/lib/stage-cutout'
import { pipCornerClass, type PipCorner } from '@/lib/streaming'
import { isTtsSpeaking, unlockMediaPlayback } from '@/lib/translation'
import {
  composeVideoCss,
  myFaceCss,
  type MyFaceLookId,
} from '@/lib/my-face'

export type { StageCutout } from '@/lib/stage-cutout'
export { cutoutLabelBg, nextCutout } from '@/lib/stage-cutout'

export type VoiceBridgePacket = {
  type: 'voicebridge'
  /** v2: original speech text. Legacy (no v): pre-translated into `lang`. */
  v?: 2
  text: string
  /** Speaker's own language (ISO), e.g. bg */
  sourceLang?: string
  /** Hint: language we pre-translated into (ISO) */
  lang: string
  /** Optional pre-translation into `lang` (receiver still prefers their own language) */
  translatedText?: string
  from: string
  fromName?: string
  /** Speaker's chosen TTS voice — remote should play with this persona */
  voiceURI?: string
  voiceName?: string
  rate?: number
  pitch?: number
}

export type LiveKitStageHandle = {
  /** Send speech to peers — they translate into THEIR language and play TTS */
  sendVoiceBridge: (payload: {
    text: string
    lang: string
    sourceLang?: string
    translatedText?: string
    v?: 2
    voiceURI?: string
    voiceName?: string
    rate?: number
    pitch?: number
  }) => void
  /** Temporarily duck a remote's raw mic while TTS plays */
  duckRemoteAudio: (identity: string, durationMs: number) => void
  getRemoteLanguages: () => Array<{ identity: string; language: string; name: string }>
  /** Local LiveKit participant identity (ignore self VoiceBridge echo) */
  getLocalIdentity: () => string | null
  /**
   * Phone/Chrome: must run from a user tap — one getUserMedia for mic (+ camera).
   * Avoids “close all bubbles / try again” from stacked auto prompts.
   * Pass `{ wantCamera: true }` when turning Cam on in the same tap as setState
   * (cameraOnRef would otherwise still be false for one frame).
   * Pass `streamPromise` started synchronously in the same click (before any await).
   */
  armLocalMedia: (opts?: {
    wantCamera?: boolean
    streamPromise?: Promise<MediaStream>
  }) => Promise<boolean>
  /** Browser autoplay unlock — required or remote mic is silent */
  unlockRemoteAudio: () => Promise<void>
  /**
   * After translated TTS actually plays: mute raw remote permanently
   * while translation stays on (only-translation mode).
   */
  confirmTranslationAudio: () => void
}

type Props = {
  roomId: string
  displayName: string
  guestId?: string
  /** Your listening/speaking language code (bg, en, …) */
  language?: string
  micOn: boolean
  cameraOn: boolean
  screenShare?: boolean
  studioRoomId?: string
  customBackground?: string | null
  customStudioRooms?: CustomStudioRoom[]
  videoFilter?: VideoFilterId
  videoQuality?: VideoQualityId
  /** Opt-in MyFace polish (like AI background) */
  myFaceEnabled?: boolean
  myFaceLook?: MyFaceLookId
  mirrorVideo?: boolean
  cutout?: StageCutout
  broadcastOverlays?: boolean
  lowerThird?: string
  noiseSuppression?: boolean
  echoCancellation?: boolean
  autoGainControl?: boolean
  /** Opus bitrate for published mic (kbps). Higher = clearer voice. */
  audioBitrateKbps?: 64 | 96 | 128 | 192 | 256 | 320
  frameRate?: 24 | 30 | 60
  enableLiveKit?: boolean
  /** Loudspeaker / remote audio output */
  speakerOn?: boolean
  /** Voice-call layout: avatars, no camera tiles */
  audioOnly?: boolean
  /** Streaming: full content + host PiP cutout; conference: seats around a table */
  stageLayout?: 'grid' | 'content-pip' | 'conference'
  pipCorner?: PipCorner
  contentHint?: 'screenshare' | 'game' | 'movie' | 'series'
  /** Floating emoji bursts around streaming silhouette (Twitch-style) */
  silhouetteReactions?: Array<{ id: string; emoji: string }>
  /** When VoiceBridge is on, keep raw remote mic quieter under TTS */
  duckRawRemoteMic?: boolean
  /**
   * Mute what we PUBLISH to peers (STT can still use local mic).
   * Prefer false unless VoiceBridge TTS is proven — otherwise both sides hear nothing.
   */
  silencePublishedMic?: boolean
  onVoiceBridge?: (packet: VoiceBridgePacket) => void
  onRemoteLanguages?: (
    peers: Array<{ identity: string; language: string; name: string }>
  ) => void
  /** Fired once local mic track exists (after permission) */
  onMicReady?: () => void
  /** Remote mic MediaStreamTrack — host-side STT when guest has no Web Speech */
  onRemoteAudioTracks?: (
    tracks: Array<{ identity: string; track: MediaStreamTrack }>
  ) => void
}

function parseParticipantLanguage(raw: string | undefined): string {
  if (!raw) return 'en'
  try {
    const meta = JSON.parse(raw) as { language?: string }
    if (meta.language) return meta.language
  } catch {
    /* ignore */
  }
  return 'en'
}

function qualityToPreset(quality: VideoQualityId) {
  if (quality === '1080p') return VideoPresets.h1080
  if (quality === '720p' || quality === 'auto') return VideoPresets.h720
  return VideoPresets.h360
}

function isIOSUa() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return (
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function isHuaweiUa() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /Huawei|Honor|HMSCore|Harmony/i.test(ua)
}

function isAndroidUa() {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent || '')
}

/** System-level camera/mic lock — common on iPhone + Huawei/EMUI */
function blockedMediaHint(kind: 'mic' | 'camera'): string {
  if (isIOSUa()) {
    return kind === 'camera'
      ? 'Камерата е спряна за Chrome на iPhone. iPhone Настройки → Chrome → Камера → Вкл. После „Разреши камера“. Или отвори линка в Safari.'
      : 'Микрофонът е спрян за Chrome на iPhone. Настройки → Chrome → Микрофон → Вкл., после жълтия бутон.'
  }
  if (isHuaweiUa()) {
    return kind === 'camera'
      ? 'Камерата е спряна за Chrome на Huawei. Настройки → Приложения → Chrome → Разрешения → Камера → Разреши. Също: Настройки → Поверителност → Управление на разрешения → Камера. После презареди и „Разреши камера“. Или Huawei Browser.'
      : 'Микрофонът е спрян за Chrome на Huawei. Настройки → Приложения → Chrome → Разрешения → Микрофон → Разреши, после жълтия бутон.'
  }
  if (isAndroidUa()) {
    return kind === 'camera'
      ? 'Камерата е блокирана за Chrome. Настройки → Приложения → Chrome → Разрешения → Камера → Разреши. После в Chrome ⋮ → Настройки на сайта → Камера → Разреши за omnivvoice-ai.vercel.app.'
      : 'Микрофонът е блокиран за Chrome. Настройки → Приложения → Chrome → Разрешения → Микрофон → Разреши, после жълтия бутон.'
  }
  return `Микрофонът/камерата са блокирани за сайта. Chrome → ⋮ → Настройки на сайта → ${kind === 'camera' ? 'Камера' : 'Микрофон'} → Разреши, презареди, после бутона.`
}

function mediaPermissionHint(
  err: unknown,
  kind: 'mic' | 'camera' = 'mic',
  permState: 'granted' | 'denied' | 'prompt' | 'unknown' = 'unknown'
): string {
  const msg = err instanceof Error ? err.message : String(err || '')
  const name = err instanceof Error ? err.name : ''
  const label = kind === 'camera' ? 'камерата' : 'микрофона'
  const phoneOs = isIOSUa() || isHuaweiUa() || isAndroidUa()
  if (permState === 'denied' || /NotAllowed|PermissionDenied|SecurityError/i.test(name)) {
    if (phoneOs || permState === 'denied') {
      return blockedMediaHint(kind)
    }
  }
  if (
    /NotAllowed|Permission|PermissionDenied|dismissed/i.test(`${name} ${msg}`) ||
    /close.*(bubble|dialog)/i.test(msg)
  ) {
    // "Ask" in settings + no prompt = call without user gesture (common on mobile)
    return phoneOs
      ? `${blockedMediaHint(kind)} Натисни и жълтия бутон Allow.`
      : `Chrome не показа Allow. Натисни жълтия бутон отново и избери Allow. (Настройките на сайта да останат „Запитване“.)`
  }
  if (/Overconstrained/i.test(`${name} ${msg}`)) {
    return 'Устройството отхвърли настройките за камера/мик. Опитай пак — ползваме по-прости настройки.'
  }
  if (/NotFound|DevicesNotFound/i.test(`${name} ${msg}`)) {
    return 'Chrome не вижда микрофон/камера. Провери дали друго приложение ги държи, или Site settings → нулирай разрешенията за omnivvoice-ai.vercel.app.'
  }
  if (/NotReadable|TrackStart|in use/i.test(`${name} ${msg}`)) {
    return 'Микрофонът/камерата са заети (често от друго Chrome/PWA прозорче). Затвори другите OmniVoice прозорци и опитай пак.'
  }
  return msg || `Няма достъп до ${label}`
}

/** Prefer HQ voice capture; fall back if the device rejects advanced constraints */
function micAudioConstraints(opts: {
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean
}): MediaTrackConstraints {
  const c: MediaTrackConstraints & Record<string, unknown> = {
    echoCancellation: opts.echoCancellation,
    noiseSuppression: opts.noiseSuppression,
    autoGainControl: opts.autoGainControl,
    channelCount: 1,
    sampleRate: { ideal: 48000 },
    sampleSize: { ideal: 16 },
    // Chrome / Edge — clearer speech when supported
    voiceIsolation: opts.noiseSuppression ? { ideal: true } : undefined,
    googEchoCancellation: opts.echoCancellation,
    googNoiseSuppression: opts.noiseSuppression,
    googAutoGainControl: opts.autoGainControl,
    googHighpassFilter: true,
    googTypingNoiseDetection: true,
  }
  return c
}

async function acquireMicStream(opts: {
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean
}): Promise<MediaStream> {
  // PWA / installed apps: advanced constraints often throw Overconstrained
  // (shown wrongly as „няма устройство“). Always start with bare audio:true.
  const attempts: MediaStreamConstraints[] = [
    { audio: true, video: false },
    {
      audio: {
        echoCancellation: opts.echoCancellation,
        noiseSuppression: opts.noiseSuppression,
        autoGainControl: opts.autoGainControl,
      },
      video: false,
    },
    { audio: micAudioConstraints(opts), video: false },
  ]
  let lastErr: unknown
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (err) {
      lastErr = err
      const name = err instanceof Error ? err.name : ''
      if (/NotAllowed|PermissionDenied|SecurityError/i.test(name)) throw err
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Няма достъп до микрофона')
}

function isPhoneUa() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')
}

async function acquireCameraStream(
  started?: Promise<MediaStream>
): Promise<MediaStream> {
  if (started) {
    try {
      return await started
    } catch (err) {
      const name = err instanceof Error ? err.name : ''
      // Hard deny — don't keep probing (Chrome won't re-prompt)
      if (/NotAllowed|PermissionDenied|SecurityError/i.test(name)) throw err
    }
  }

  // Phone: front camera first. Desktop: bare video:true first (facingMode breaks many PCs).
  const phone = isPhoneUa()
  const attempts: MediaStreamConstraints[] = phone
    ? [
        { audio: false, video: { facingMode: 'user' } },
        { audio: false, video: true },
        { audio: false, video: { facingMode: { ideal: 'environment' } } },
      ]
    : [
        { audio: false, video: true },
        { audio: false, video: { facingMode: { ideal: 'user' } } },
      ]

  let lastErr: unknown
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (err) {
      lastErr = err
      const name = err instanceof Error ? err.name : ''
      if (/NotAllowed|PermissionDenied|SecurityError/i.test(name)) throw err
    }
  }

  // Last resort — pick any videoinput by deviceId (labels appear after mic Allow)
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const cam = devices.find((d) => d.kind === 'videoinput')
    if (cam?.deviceId) {
      return await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { deviceId: { ideal: cam.deviceId } },
      })
    }
  } catch (err) {
    lastErr = err
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error('Няма достъп до камерата')
}

/** Mic + camera in one prompt when video call (keeps user-gesture activation). */
async function acquireMicAndCameraStream(_opts: {
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean
}): Promise<MediaStream> {
  // Bare constraints only — installed PWA + Windows reject ideal width/facingMode
  const attempts: MediaStreamConstraints[] = [
    { audio: true, video: true },
    { audio: true, video: { facingMode: { ideal: 'user' } } },
    { audio: true, video: false },
  ]
  let lastErr: unknown
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (err) {
      lastErr = err
      const name = err instanceof Error ? err.name : ''
      if (/NotAllowed|PermissionDenied|SecurityError/i.test(name)) throw err
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error('Няма достъп до микрофон/камера')
}

function audioPresetForBitrate(kbps: number) {
  if (kbps >= 128) return { ...AudioPresets.musicHighQualityStereo, maxBitrate: kbps * 1000 }
  if (kbps >= 96) return AudioPresets.musicHighQuality
  if (kbps >= 64) return AudioPresets.music
  return AudioPresets.speech
}

function tuneLocalMicTrack(raw: MediaStreamTrack) {
  try {
    raw.contentHint = 'speech'
  } catch {
    /* ignore */
  }
  try {
    void raw.applyConstraints({
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: { ideal: 48000 },
      channelCount: 1,
    })
  } catch {
    /* ignore */
  }
}

async function queryMediaPermission(
  name: 'microphone' | 'camera'
): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  // iPhone / Huawei: permissions.query often lies as "denied" even when
  // getUserMedia would still prompt — don't trust it.
  if (isIOSUa() || isHuaweiUa()) return 'unknown'
  try {
    const nav = navigator as Navigator & {
      permissions?: {
        query: (d: { name: string }) => Promise<{ state: string }>
      }
    }
    const result = await nav.permissions?.query({ name })
    if (
      result?.state === 'granted' ||
      result?.state === 'denied' ||
      result?.state === 'prompt'
    ) {
      return result.state
    }
  } catch {
    /* iOS / older Chrome */
  }
  return 'unknown'
}

async function queryMicPermission() {
  return queryMediaPermission('microphone')
}

async function queryCameraPermission() {
  return queryMediaPermission('camera')
}

type BgProcessor = ReturnType<typeof BackgroundProcessor>

type RemoteCam = {
  identity: string
  name: string
}

function gridColsClass(count: number) {
  if (count <= 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-1 sm:grid-cols-2'
  if (count <= 4) return 'grid-cols-2'
  if (count <= 6) return 'grid-cols-2 lg:grid-cols-3'
  return 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4'
}

const LiveKitStage = forwardRef<LiveKitStageHandle, Props>(function LiveKitStage(
  {
    roomId,
    displayName,
    guestId,
    language = 'en',
    micOn,
    cameraOn,
    screenShare = false,
    studioRoomId = 'glass-office',
    customBackground = null,
    customStudioRooms = [],
    videoFilter = 'none',
    videoQuality = '1080p',
    myFaceEnabled = false,
    myFaceLook = 'soft_glow',
    mirrorVideo = true,
    cutout = 'contour',
    broadcastOverlays = false,
    lowerThird = 'LIVE · Q&A',
    noiseSuppression = true,
    echoCancellation = true,
    autoGainControl = true,
    audioBitrateKbps = 128,
    frameRate = 30,
    enableLiveKit = true,
    speakerOn = true,
    audioOnly = false,
    stageLayout = 'grid',
    pipCorner = 'br',
    contentHint = 'screenshare',
    silhouetteReactions = [],
    duckRawRemoteMic = false,
    silencePublishedMic = false,
    onVoiceBridge,
    onRemoteLanguages,
    onMicReady,
    onRemoteAudioTracks,
  },
  ref
) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const contentVideoRef = useRef<HTMLVideoElement>(null)
  const [hasScreenContent, setHasScreenContent] = useState(false)
  const remoteAudioRef = useRef<HTMLDivElement>(null)
  const speakerOnRef = useRef(speakerOn)
  speakerOnRef.current = speakerOn
  const duckRawRef = useRef(duckRawRemoteMic)
  duckRawRef.current = duckRawRemoteMic
  const silencePublishedRef = useRef(silencePublishedMic)
  silencePublishedRef.current = silencePublishedMic
  /** True after translated TTS actually played — then raw stays muted */
  const translationAudioOkRef = useRef(false)
  const onVoiceBridgeRef = useRef(onVoiceBridge)
  onVoiceBridgeRef.current = onVoiceBridge
  const onRemoteLanguagesRef = useRef(onRemoteLanguages)
  onRemoteLanguagesRef.current = onRemoteLanguages
  const onRemoteAudioTracksRef = useRef(onRemoteAudioTracks)
  onRemoteAudioTracksRef.current = onRemoteAudioTracks
  const languageRef = useRef(language)
  languageRef.current = language
  const remoteVideoEls = useRef(new Map<string, HTMLVideoElement>())
  const remoteVideoTracks = useRef(
    new Map<string, NonNullable<RemoteTrackPublication['track']>>()
  )
  /** Remote mic tracks — setVolume(0) when translation ducks raw speech */
  const remoteAudioTracks = useRef(
    new Map<string, { setVolume?: (v: number) => void; detach?: () => HTMLMediaElement[] }>()
  )
  /** Underlying MediaStreamTracks for host-side STT */
  const remoteMicStreams = useRef(new Map<string, MediaStreamTrack>())

  function notifyRemoteAudioTracks() {
    const list: Array<{ identity: string; track: MediaStreamTrack }> = []
    remoteMicStreams.current.forEach((track, identity) => {
      if (track.readyState === 'live') list.push({ identity, track })
    })
    onRemoteAudioTracksRef.current?.(list)
  }
  const roomRef = useRef<Room | null>(null)
  const duckTimers = useRef(new Map<string, number>())
  const videoTrackRef = useRef<LocalVideoTrack | null>(null)
  const audioTrackRef = useRef<LocalAudioTrack | null>(null)
  const processorRef = useRef<BgProcessor | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  /** Cache banner blob so MediaPipe switchTo skips re-download */
  const bannerCacheRef = useRef<{ url: string; path: string } | null>(null)
  /** Latest desired cutout — effect writes, applyCutout reads (serial queue) */
  const cutoutWantRef = useRef({
    mode: cutout,
    bg: '' as string,
    /** Streaming PiP: green plate + CSS chroma → floating silhouette */
    silhouette: false,
  })
  const cutoutChainRef = useRef<Promise<void>>(Promise.resolve())
  const [status, setStatus] = useState<'connecting' | 'live' | 'local' | 'error'>(
    enableLiveKit ? 'connecting' : 'local'
  )
  const [error, setError] = useState<string | null>(null)
  const [remotes, setRemotes] = useState<RemoteCam[]>([])
  const [remoteCamTick, setRemoteCamTick] = useState(0)
  const [hasLocalVideo, setHasLocalVideo] = useState(false)
  const [processorReady, setProcessorReady] = useState(false)
  const [cutoutBusy, setCutoutBusy] = useState(false)
  const [cutoutFailed, setCutoutFailed] = useState(false)
  /** Bumps when local video track is ready — drives cutout effect safely */
  const [trackReadyTick, setTrackReadyTick] = useState(0)
  /** Bumps when local mic track is ready — republish after late permission grant */
  const [audioReadyTick, setAudioReadyTick] = useState(0)
  const [micError, setMicError] = useState<string | null>(null)
  /** Always require a tap — never auto getUserMedia (Desktop-site on phone silent-denies). */
  const [mediaNeedsTap, setMediaNeedsTap] = useState(true)
  const [mediaBusy, setMediaBusy] = useState(false)
  const [cameraNeedsTap, setCameraNeedsTap] = useState(false)
  const mediaArmingRef = useRef(false)
  const mediaArmStartedRef = useRef(0)
  /** Bumps every arm attempt — stale concurrent attempts must not reset camera state */
  const mediaArmGenRef = useRef(0)
  const micOnRef = useRef(micOn)
  micOnRef.current = micOn
  const cameraOnRef = useRef(cameraOn)
  cameraOnRef.current = cameraOn
  const audioOnlyRef = useRef(audioOnly)
  audioOnlyRef.current = audioOnly

  const tileCount = 1 + remotes.length

  function collectRemoteLanguages() {
    const room = roomRef.current
    if (!room) return []
    const peers: Array<{ identity: string; language: string; name: string }> =
      []
    room.remoteParticipants.forEach((p) => {
      peers.push({
        identity: p.identity,
        language: parseParticipantLanguage(p.metadata),
        name: p.name || p.identity,
      })
    })
    return peers
  }

  function applyRemoteAudioVolume(identity: string, volume: number) {
    const v = Math.max(0, Math.min(1, volume))
    const host = remoteAudioRef.current
    if (!host) return
    host
      .querySelectorAll(`audio[data-identity="${CSS.escape(identity)}"]`)
      .forEach((node) => {
        const el = node as HTMLAudioElement
        el.volume = v
        if (v === 0) el.muted = true
      })
    try {
      remoteAudioTracks.current.get(identity)?.setVolume?.(v)
    } catch {
      /* ignore */
    }
  }

  /**
   * Translation ducking:
   * - Mute raw while TTS plays (hear only translation).
   * - After first successful TTS → mute raw for good while translating.
   * - Before that → keep raw so a missed VoiceBridge ≠ total silence.
   */
  function wantHearRawRemoteMic() {
    if (!speakerOnRef.current) return false
    if (!duckRawRef.current) return true
    if (isTtsSpeaking()) return false
    if (translationAudioOkRef.current) return false
    return true
  }

  function confirmTranslationAudio() {
    if (!duckRawRef.current) return
    translationAudioOkRef.current = true
    muteAllRemoteRawMics()
  }

  /** Chrome/iOS block WebRTC playback until startAudio() runs in a user gesture */
  async function ensureRemoteAudioPlayback() {
    const room = roomRef.current
    if (room) {
      try {
        await room.startAudio()
      } catch {
        /* ignore */
      }
    }
    // Respect translation duck — do not force volume 1 while translating
    muteAllRemoteRawMics()
    if (wantHearRawRemoteMic()) {
      remoteAudioRef.current?.querySelectorAll('audio').forEach((node) => {
        void (node as HTMLAudioElement).play().catch(() => undefined)
      })
    }
  }

  function applyRawRemotePolicy(
    el: HTMLAudioElement,
    track?: { setVolume?: (v: number) => void } | null
  ) {
    const hear = wantHearRawRemoteMic()
    el.muted = !hear
    el.volume = hear ? 1 : 0
    try {
      track?.setVolume?.(hear ? 1 : 0)
    } catch {
      /* ignore */
    }
    if (hear) void el.play().catch(() => undefined)
  }

  function muteAllRemoteRawMics() {
    const hear = wantHearRawRemoteMic()
    const host = remoteAudioRef.current
    host?.querySelectorAll('audio').forEach((node) => {
      const el = node as HTMLAudioElement
      const id = el.dataset.identity || ''
      applyRawRemotePolicy(el, remoteAudioTracks.current.get(id) || null)
    })
    // LiveKit WebAudio path ignores <audio>.volume on many phones — setVolume is required.
    // Do NOT setSubscribed(false): that caused total silence when TTS lagged.
    remoteAudioTracks.current.forEach((track) => {
      try {
        track.setVolume?.(hear ? 1 : 0)
      } catch {
        /* ignore */
      }
    })
  }

  function duckRemoteAudio(identity: string, durationMs: number) {
    if (!duckRawRef.current) return
    // Force mute now — stays muted while translation duck is on
    applyRemoteAudioVolume(identity, 0)
    const host = remoteAudioRef.current
    host
      ?.querySelectorAll(`audio[data-identity="${CSS.escape(identity)}"]`)
      .forEach((node) => {
        const el = node as HTMLAudioElement
        el.muted = true
        el.volume = 0
        try {
          remoteAudioTracks.current.get(identity)?.setVolume?.(0)
        } catch {
          /* ignore */
        }
      })
    const prev = duckTimers.current.get(identity)
    if (prev) window.clearTimeout(prev)
    const hold = Math.max(600, durationMs || 2000)
    duckTimers.current.set(
      identity,
      window.setTimeout(() => {
        duckTimers.current.delete(identity)
        muteAllRemoteRawMics()
      }, hold)
    )
  }

  const studio = getStudioRoom(studioRoomId, customStudioRooms)
  const bgUrl = customBackground || studio.imageUrl
  const filterCss = composeVideoCss(
    VIDEO_FILTERS.find((f) => f.id === videoFilter)?.css || 'none',
    myFaceCss(myFaceEnabled, myFaceLook)
  )
  const q = VIDEO_QUALITY[videoQuality] || VIDEO_QUALITY['1080p']
  const canProcess =
    typeof window !== 'undefined' && supportsBackgroundProcessors()
  const useContour = cutout === 'contour'
  const useBlur = cutout === 'blur'
  const useOval = cutout === 'oval'
  const useReal = cutout === 'real'

  function attachPreview(track: LocalVideoTrack | null) {
    const el = localVideoRef.current
    if (!el || !track) return
    track.attach(el)
    void el.play().catch(() => undefined)
    setHasLocalVideo(true)
  }

  async function adoptLocalTracks(tracks: LocalTrack[]) {
    for (const track of tracks) {
      if (track.kind === Track.Kind.Audio) {
        audioTrackRef.current = track as LocalAudioTrack
        if (micOnRef.current) await track.unmute()
        else await track.mute()
      } else if (track.kind === Track.Kind.Video) {
        videoTrackRef.current = track as LocalVideoTrack
        attachPreview(track as LocalVideoTrack)
        setTrackReadyTick((t) => t + 1)
      }
    }
    if (audioTrackRef.current) {
      setMicError(null)
      setAudioReadyTick((t) => t + 1)
      onMicReady?.()
    }
    const room = roomRef.current
    if (room && room.state === ConnectionState.Connected) {
      if (audioTrackRef.current) {
        const pub = room.localParticipant.getTrackPublication(
          Track.Source.Microphone
        )
        if (!pub) {
          await room.localParticipant
            .publishTrack(audioTrackRef.current)
            .catch(() => undefined)
        }
      }
      if (videoTrackRef.current && cameraOnRef.current) {
        const pub = room.localParticipant.getTrackPublication(
          Track.Source.Camera
        )
        if (!pub) {
          await room.localParticipant
            .publishTrack(videoTrackRef.current)
            .catch(() => undefined)
        }
      }
    }
  }

  /**
   * Must run from a real pointer/touch on the yellow button.
   * Uses raw getUserMedia — LiveKit createLocalTracks(deviceId:default)
   * often fails without a prompt on Android.
   */
  function cameraTrackIsLive() {
    const t = videoTrackRef.current
    if (!t) return false
    try {
      const media = t.mediaStreamTrack
      return Boolean(media && media.readyState === 'live')
    } catch {
      return Boolean(videoTrackRef.current)
    }
  }

  async function adoptCameraTrack(raw: MediaStreamTrack): Promise<void> {
    if (raw.readyState === 'ended') {
      throw new Error('Камерата спря веднага — опитай пак')
    }
    try {
      raw.enabled = true
      raw.contentHint = 'motion'
    } catch {
      /* ignore */
    }
    // Replace any previous local cam cleanly
    const prev = videoTrackRef.current
    if (prev) {
      try {
        await stopProcessor(prev)
      } catch {
        /* ignore */
      }
      try {
        prev.stop()
      } catch {
        /* ignore */
      }
      videoTrackRef.current = null
    }
    const track = new LocalVideoTrack(raw, undefined, true)
    track.source = Track.Source.Camera
    videoTrackRef.current = track
    attachPreview(track)
    setHasLocalVideo(true)
    setCameraNeedsTap(false)
    setTrackReadyTick((t) => t + 1)
    const room = roomRef.current
    if (room?.state === ConnectionState.Connected) {
      await room.localParticipant.publishTrack(track).catch(() => undefined)
    }
    // Re-attach on next paint — layout may remount <video> after voice→video
    requestAnimationFrame(() => {
      attachPreview(videoTrackRef.current)
    })
  }

  async function armLocalMedia(opts?: {
    wantCamera?: boolean
    streamPromise?: Promise<MediaStream>
    /** Caller already set mediaArmingRef before starting getUserMedia */
    alreadyLocked?: boolean
  }): Promise<boolean> {
    if (!opts?.alreadyLocked) {
      if (mediaArmingRef.current) {
        const stuckMs = Date.now() - (mediaArmStartedRef.current || 0)
        if (stuckMs < 45_000) {
          // Never start/stop a second GUM while Allow is open — that cancels the first
          void opts?.streamPromise?.then((s) =>
            s.getTracks().forEach((t) => t.stop())
          )
          setMicError(
            'Изчакай Allow в Chrome и не натискай бутона пак, докато диалогът е отворен.'
          )
          return false
        }
        mediaArmingRef.current = false
      }
      mediaArmingRef.current = true
      mediaArmStartedRef.current = Date.now()
    }

    const armGen = ++mediaArmGenRef.current
    const isStale = () => armGen !== mediaArmGenRef.current

    const wantCamera =
      opts?.wantCamera === true ||
      (cameraOnRef.current && !audioOnlyRef.current)
    if (opts?.wantCamera === true) {
      cameraOnRef.current = true
      audioOnlyRef.current = false
    }
    const needCamera = wantCamera && !cameraTrackIsLive()

    const md = navigator.mediaDevices
    if (!md?.getUserMedia) {
      mediaArmingRef.current = false
      setMediaBusy(false)
      setMicError(
        typeof window !== 'undefined' && !window.isSecureContext
          ? 'Трябва HTTPS · https://omnivvoice-ai.vercel.app'
          : 'Браузърът няма микрофон/камера API · ползвай Chrome'
      )
      return false
    }

    const micOpts = {
      echoCancellation,
      noiseSuppression,
      autoGainControl,
    }

    setMediaBusy(true)

    // —— Camera only (mic already live) ——
    if (audioTrackRef.current) {
      if (!needCamera) {
        mediaArmingRef.current = false
        setMediaBusy(false)
        setMediaNeedsTap(false)
        setCameraNeedsTap(false)
        setHasLocalVideo(true)
        setMicError(null)
        onMicReady?.()
        return true
      }
      const camPromise = acquireCameraStream(opts?.streamPromise)
      setMicError(null)
      try {
        const stream = await camPromise
        if (isStale()) {
          stream.getTracks().forEach((t) => t.stop())
          return false
        }
        const raw = stream.getVideoTracks()[0]
        if (!raw || raw.readyState === 'ended') {
          throw new Error('Няма жив video track от камерата')
        }
        await adoptCameraTrack(raw)
        stream.getAudioTracks().forEach((t) => t.stop())
        if (isStale()) return false
        setCameraNeedsTap(false)
        setMediaNeedsTap(false)
        setHasLocalVideo(true)
        setMicError(null)
        onMicReady?.()
        return true
      } catch (err) {
        if (isStale()) return false
        // A parallel attempt must not wipe a camera that already works
        if (cameraTrackIsLive()) {
          setHasLocalVideo(true)
          setCameraNeedsTap(false)
          setMicError(null)
          return true
        }
        const perm = await queryCameraPermission()
        setMicError(mediaPermissionHint(err, 'camera', perm))
        setCameraNeedsTap(true)
        setHasLocalVideo(false)
        return false
      } finally {
        if (!isStale()) {
          mediaArmingRef.current = false
          setMediaBusy(false)
        }
      }
    }

    // —— First arm: mic only, OR mic+camera in ONE Allow dialog ——
    const gumPromise =
      opts?.streamPromise ??
      (needCamera
        ? acquireMicAndCameraStream(micOpts)
        : acquireMicStream(micOpts))

    setMicError(null)

    /** Permission already granted — open camera without a second yellow button. */
    async function ensureCameraAfterMic(
      leftoverVideo?: MediaStreamTrack | null
    ): Promise<boolean> {
      if (!needCamera || cameraTrackIsLive() || isStale()) {
        return cameraTrackIsLive()
      }
      // Reuse the track from the first Allow if it's still live (avoids NotReadable)
      if (leftoverVideo && leftoverVideo.readyState === 'live') {
        try {
          await adoptCameraTrack(leftoverVideo)
          if (cameraTrackIsLive()) return true
        } catch {
          try {
            leftoverVideo.stop()
          } catch {
            /* ignore */
          }
        }
      }
      try {
        // Bare video:true — h720/createLocalVideoTrack caused Overconstrained on PWA
        const camStream = await md.getUserMedia({
          audio: false,
          video: true,
        })
        if (isStale()) {
          camStream.getTracks().forEach((t) => t.stop())
          return false
        }
        const raw = camStream.getVideoTracks()[0]
        if (!raw || raw.readyState === 'ended') {
          camStream.getTracks().forEach((t) => t.stop())
          return false
        }
        await adoptCameraTrack(raw)
        return cameraTrackIsLive()
      } catch {
        return false
      }
    }

    try {
      let stream: MediaStream
      try {
        stream = await gumPromise
      } catch (first) {
        if (needCamera) {
          // Combined prompt failed after Allow — take mic, then camera in-turn (no 2nd button)
          stream = await acquireMicStream(micOpts)
        } else {
          throw first
        }
      }
      if (isStale()) {
        stream.getTracks().forEach((t) => t.stop())
        return false
      }

      const rawVideo = stream.getVideoTracks()[0] || null
      const rawAudio = stream.getAudioTracks()[0]
      if (!rawAudio) throw new Error('Няма audio track')

      // Camera FIRST — before adoptLocalTracks bumps audioReadyTick (that effect
      // was re-showing „Разреши камера“ while video was still attaching).
      if (needCamera && rawVideo && rawVideo.readyState !== 'ended') {
        try {
          await adoptCameraTrack(rawVideo)
        } catch {
          // Keep leftoverVideo for ensureCameraAfterMic — do NOT leave it dangling
          // without a second open (NotReadable). Retry adopt below.
        }
      }

      tuneLocalMicTrack(rawAudio)
      const audio = new LocalAudioTrack(
        rawAudio,
        micAudioConstraints(micOpts),
        true
      )
      audio.source = Track.Source.Microphone
      ;(audio as LocalAudioTrack & { mediaStream: MediaStream }).mediaStream =
        new MediaStream([rawAudio])
      await adoptLocalTracks([audio])

      if (needCamera && !cameraTrackIsLive()) {
        const gotCam = await ensureCameraAfterMic(
          rawVideo && rawVideo.readyState === 'live' ? rawVideo : null
        )
        if (!gotCam && !isStale()) {
          // Release leftover so a later tap can open the device
          if (rawVideo && rawVideo.readyState === 'live') {
            try {
              rawVideo.stop()
            } catch {
              /* ignore */
            }
          }
          setCameraNeedsTap(true)
          setMicError(
            `Микрофонът е ОК (build ${MEDIA_BUILD}). Камерата не се закачи — натисни веднъж „Разреши камера“.`
          )
        }
      }

      if (!isStale()) {
        if (cameraTrackIsLive()) {
          setHasLocalVideo(true)
          setCameraNeedsTap(false)
          setMicError(null)
        } else if (!needCamera) {
          setCameraNeedsTap(false)
        }
      }

      await ensureRemoteAudioPlayback()
      if (!isStale()) {
        setMediaNeedsTap(false)
        onMicReady?.()
      }
      return true
    } catch (err) {
      if (isStale()) return false
      if (cameraTrackIsLive()) {
        setHasLocalVideo(true)
        setCameraNeedsTap(false)
        setMicError(null)
        return true
      }
      const perm = await queryMicPermission()
      setMicError(mediaPermissionHint(err, 'mic', perm))
      setMediaNeedsTap(true)
      return false
    } finally {
      if (!isStale()) {
        mediaArmingRef.current = false
        setMediaBusy(false)
      }
    }
  }

  useImperativeHandle(ref, () => ({
    sendVoiceBridge: ({
      text,
      lang,
      sourceLang,
      translatedText,
      v,
      voiceURI,
      voiceName,
      rate,
      pitch,
    }) => {
      const room = roomRef.current
      if (!room || room.state !== ConnectionState.Connected) return
      const packet: VoiceBridgePacket = {
        type: 'voicebridge',
        v: v ?? 2,
        text,
        lang,
        sourceLang,
        translatedText,
        from: room.localParticipant.identity,
        fromName: displayName,
        voiceURI,
        voiceName,
        rate,
        pitch,
      }
      const bytes = new TextEncoder().encode(JSON.stringify(packet))
      void room.localParticipant
        .publishData(bytes, {
          reliable: true,
          topic: 'voicebridge',
        })
        .catch(() => undefined)
    },
    duckRemoteAudio,
    getRemoteLanguages: collectRemoteLanguages,
    getLocalIdentity: () => roomRef.current?.localParticipant?.identity ?? null,
    armLocalMedia,
    unlockRemoteAudio: () => ensureRemoteAudioPlayback(),
    confirmTranslationAudio,
  }))

  async function stopProcessor(track: LocalVideoTrack | null) {
    if (!track) return
    try {
      await track.stopProcessor()
    } catch {
      // ignore
    }
    processorRef.current = null
    setProcessorReady(false)
  }

  async function resolveBannerPath(url: string): Promise<string> {
    if (bannerCacheRef.current?.url === url) {
      return bannerCacheRef.current.path
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    const path = await loadBannerBlob(url)
    blobUrlRef.current = path.startsWith('blob:') ? path : null
    bannerCacheRef.current = { url, path }
    return path
  }

  /**
   * Apply contour/blur via LiveKit BackgroundProcessor.
   * Serialized — always converges to cutoutWantRef (latest mode + banner).
   */
  async function applyCutoutOnce(track: LocalVideoTrack) {
    const {
      mode,
      bg: backgroundUrl,
      silhouette,
    } = cutoutWantRef.current
    const wantFx = mode === 'contour' || mode === 'blur'
    const stillWanted = () => {
      const w = cutoutWantRef.current
      return (
        w.mode === mode &&
        w.bg === backgroundUrl &&
        w.silhouette === silhouette
      )
    }

    if (!wantFx) {
      await stopProcessor(track)
      setCutoutFailed(false)
      return
    }

    if (!supportsBackgroundProcessors()) {
      setProcessorReady(false)
      setCutoutFailed(true)
      setError(
        'Този браузър не поддържа AI изрязване. Ползвай Chrome или Edge.'
      )
      return
    }

    setCutoutBusy(true)
    setCutoutFailed(false)
    try {
      let imagePath: string | undefined
      if (mode === 'contour') {
        if (silhouette) {
          // Green plate — CSS chroma-key punches it out over stream content
          imagePath = chromaKeyDataUrl()
        } else {
          const url = backgroundUrl || studio.imageUrl
          if (!url) {
            throw new Error('Няма избран фон — отвори Virtual Room')
          }
          imagePath = await resolveBannerPath(url)
        }
        if (!stillWanted()) return
      }

      let existing = processorRef.current
      if (existing) {
        try {
          if (mode === 'contour' && imagePath) {
            await existing.switchTo({
              mode: 'virtual-background',
              imagePath,
            })
          } else {
            await existing.switchTo({
              mode: 'background-blur',
              blurRadius: 16,
            })
          }
          if (!stillWanted()) return
          setProcessorReady(true)
          setCutoutFailed(false)
          setError(null)
          return
        } catch {
          // switchTo failed — recreate processor below
          await stopProcessor(track)
          existing = null
        }
      }

      setProcessorReady(false)
      let framesSeen = 0
      // Same-origin MediaPipe assets — avoids CDN CSP blocking WASM glue
      const mediapipeAssets = {
        tasksVisionFileSet: '/mediapipe/wasm',
        modelAssetPath: '/mediapipe/selfie_segmenter.tflite',
      }
      // Boot blur first (no image) so MediaPipe WASM init isn't blocked by banner
      const processor = BackgroundProcessor({
        mode: 'background-blur',
        blurRadius: 16,
        assetPaths: mediapipeAssets,
        onFrameProcessed: () => {
          framesSeen += 1
        },
      })

      // Ensure clean slate if a prior race left a processor attached
      try {
        await track.stopProcessor()
      } catch {
        // ignore
      }

      await track.setProcessor(processor)
      if (!stillWanted()) return
      processorRef.current = processor
      attachPreview(track)

      const deadline = Date.now() + 8000
      while (framesSeen < 1 && Date.now() < deadline) {
        await new Promise((r) => window.setTimeout(r, 40))
        if (!stillWanted()) return
      }
      // Frames optional — WASM may be slow on first load; processor is attached
      if (framesSeen < 1) {
        // Give one more second then proceed anyway
        await new Promise((r) => window.setTimeout(r, 1000))
      }
      if (!stillWanted()) return

      if (mode === 'contour' && imagePath) {
        await processor.switchTo({
          mode: 'virtual-background',
          imagePath,
        })
      }
      if (!stillWanted()) return

      setProcessorReady(true)
      setCutoutFailed(false)
      setError(null)
    } catch (err) {
      if (!stillWanted()) return
      setProcessorReady(false)
      setCutoutFailed(true)
      try {
        await track.stopProcessor()
      } catch {
        // ignore
      }
      processorRef.current = null
      const detail =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : err && typeof err === 'object' && 'message' in err
              ? String((err as { message: unknown }).message)
              : 'MediaPipe/WebGL грешка'
      setError(`Изрязването не стартира: ${detail}`)
    } finally {
      setCutoutBusy(false)
    }
  }

  /** Queue cutout applies so Strict Mode / rapid bg changes cannot double-setProcessor */
  function enqueueCutout(track: LocalVideoTrack) {
    cutoutChainRef.current = cutoutChainRef.current
      .catch(() => undefined)
      .then(async () => {
        // Loop until want matches what we just applied (handles mid-run changes)
        for (let i = 0; i < 5; i++) {
          const snapshot = { ...cutoutWantRef.current }
          await applyCutoutOnce(track)
          const now = cutoutWantRef.current
          if (
            now.mode === snapshot.mode &&
            now.bg === snapshot.bg &&
            now.silhouette === snapshot.silhouette
          ) {
            break
          }
        }
      })
    return cutoutChainRef.current
  }

  // NEVER auto createLocalTracks / getUserMedia — only mute/unmute existing tracks.
  useEffect(() => {
    void (async () => {
      try {
        if (!cameraOn || audioOnly) {
          if (videoTrackRef.current) {
            await stopProcessor(videoTrackRef.current)
            await videoTrackRef.current.mute()
            setHasLocalVideo(false)
            setProcessorReady(false)
          }
          return
        }
        if (videoTrackRef.current) {
          await videoTrackRef.current.unmute()
          attachPreview(videoTrackRef.current)
          setHasLocalVideo(true)
          setCameraNeedsTap(false)
        } else if (audioTrackRef.current && !mediaArmingRef.current) {
          // Do NOT force the camera gate while the first Allow is still finishing —
          // that was re-showing „Разреши камера“ right after mic+cam succeeded.
          setCameraNeedsTap(true)
        }
      } catch {
        /* ignore */
      }
    })()
  }, [cameraOn, audioOnly, audioReadyTick])

  // Mic toggle / translation silence — without recreating the track
  useEffect(() => {
    const audio = audioTrackRef.current
    if (!audio) return
    void (async () => {
      try {
        // Local STT still works; peers must not hear raw speech while translating
        if (micOn && !silencePublishedMic) await audio.unmute()
        else await audio.mute()
      } catch {
        /* ignore */
      }
    })()
  }, [micOn, audioReadyTick, silencePublishedMic])

  // Keep remote volumes in sync with speaker / translation / TTS gate
  useEffect(() => {
    if (!duckRawRemoteMic) {
      translationAudioOkRef.current = false
    }
    muteAllRemoteRawMics()
    if (!duckRawRemoteMic) return
    const id = window.setInterval(() => {
      muteAllRemoteRawMics()
    }, 120)
    return () => window.clearInterval(id)
  }, [duckRawRemoteMic, speakerOn])

  const showMediaGate =
    (mediaNeedsTap && !audioTrackRef.current) ||
    Boolean(micError) ||
    (!audioTrackRef.current && audioReadyTick === 0)

  const showCameraGate =
    !mediaBusy &&
    !mediaArmingRef.current &&
    (cameraNeedsTap || (cameraOn && !audioOnly && audioReadyTick > 0)) &&
    Boolean(audioTrackRef.current) &&
    cameraOn &&
    !audioOnly &&
    !hasLocalVideo &&
    !cameraTrackIsLive()

  function requestMediaFromUserTap() {
    // Phone bug: if Allow is dismissed / hangs, mediaBusy stayed true forever and
    // every later tap was ignored. After 8s force-unlock so the user can retry.
    const stuckMs = Date.now() - (mediaArmStartedRef.current || 0)
    if (mediaArmingRef.current || mediaBusy) {
      if (stuckMs < 8_000) return
      mediaArmGenRef.current += 1
      mediaArmingRef.current = false
      setMediaBusy(false)
      setMicError(
        `Предишният опит висеше (build ${MEDIA_BUILD}). Натисни пак и избери Allow.`
      )
    }
    if (cameraTrackIsLive()) {
      setHasLocalVideo(true)
      setCameraNeedsTap(false)
      setMicError(null)
      setMediaNeedsTap(false)
      return
    }

    const wantCam = Boolean(showCameraGate || (cameraOn && !audioOnly))
    const md = navigator.mediaDevices
    if (!md?.getUserMedia) {
      setMicError(
        !window.isSecureContext
          ? 'Трябва HTTPS · https://omnivvoice-ai.vercel.app'
          : 'Този браузър няма камера API · отвори в Chrome'
      )
      return
    }

    // Lock BEFORE getUserMedia so a second tap within 8s cannot cancel Allow
    mediaArmingRef.current = true
    mediaArmStartedRef.current = Date.now()
    setMediaBusy(true)
    setMicError(null)

    const phone = isPhoneUa()
    let streamPromise: Promise<MediaStream> | undefined
    if (audioTrackRef.current && wantCam) {
      // Camera-only — phone prefers front cam
      streamPromise = phone
        ? md.getUserMedia({
            audio: false,
            video: { facingMode: 'user' },
          })
        : md.getUserMedia({ audio: false, video: true })
    } else if (!audioTrackRef.current && wantCam) {
      streamPromise = md.getUserMedia({ audio: true, video: true })
    } else if (!audioTrackRef.current) {
      streamPromise = md.getUserMedia({ audio: true, video: false })
    }

    void armLocalMedia({
      wantCamera: wantCam,
      streamPromise,
      alreadyLocked: true,
    }).finally(() => {
      unlockMediaPlayback()
      // Always release UI lock — stale in-flight must not leave the button dead
      mediaArmingRef.current = false
      setMediaBusy(false)
    })
  }

  const micBanner =
    showMediaGate || showCameraGate ? (
      <div
        className={`relative z-[80] mb-2 rounded-xl border px-3 py-3 text-xs shadow-lg ${
          micError
            ? 'border-amber-400/40 bg-amber-500/15 text-amber-100'
            : 'border-[var(--accent)]/50 bg-[var(--accent)]/15 text-white'
        }`}
      >
        <p className="mb-2 leading-relaxed">
          {micError ||
            (showCameraGate
              ? 'Микрофонът е готов. Натисни за камерата — избери Allow в Chrome.'
              : cameraOn && !audioOnly
                ? 'Натисни бутона — Chrome пита за микрофон и камера (Allow и двете).'
                : 'Натисни бутона — Chrome трябва да покаже Allow за микрофона.')}
        </p>
        <p className="mb-2 text-[10px] opacity-60">build {MEDIA_BUILD} · production</p>
        <button
          type="button"
          className="relative z-[81] w-full touch-manipulation rounded-lg bg-amber-400 px-3 py-3.5 text-sm font-semibold text-black active:brightness-95"
          onClick={requestMediaFromUserTap}
        >
          {mediaBusy
            ? 'Изчакай Allow… (след 8с можеш пак)'
            : showCameraGate
              ? 'Разреши камера'
              : cameraOn && !audioOnly
                ? 'Разреши микрофон + камера'
                : 'Разреши микрофон'}
        </button>
      </div>
    ) : null

  // Cutout / banner — only after track exists (serialized; no Strict Mode race)
  useEffect(() => {
    cutoutWantRef.current = {
      mode: cutout,
      bg: bgUrl || '',
      silhouette: stageLayout === 'content-pip' && cutout === 'contour',
    }
    const track = videoTrackRef.current
    if (!track || !cameraOn || trackReadyTick < 1) return
    void enqueueCutout(track).then(() => {
      attachPreview(track)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cutout, bgUrl, cameraOn, trackReadyTick, stageLayout])

  // LiveKit publish
  useEffect(() => {
    if (!enableLiveKit) {
      setStatus('local')
      return
    }

    let cancelled = false

    async function connect() {
      setStatus((s) => (s === 'live' ? 'live' : 'connecting'))
      try {
        const res = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            roomId,
            guestId,
            displayName,
            language: languageRef.current || 'en',
          }),
        })
        const data = (await res.json()) as {
          server_url?: string
          participant_token?: string
          error?: string
          localPreview?: boolean
        }
        if (cancelled) return

        if (!res.ok || !data.server_url || !data.participant_token) {
          setError(
            data.error ||
              (res.status === 403
                ? 'Няма достъп до стаята — помоли хоста за нова покана'
                : 'Неуспешно свързване към стаята')
          )
          setStatus('local')
          return
        }

        const preset = qualityToPreset(videoQuality)
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: preset.resolution,
          } satisfies VideoCaptureOptions,
          publishDefaults: {
            videoEncoding: {
              maxBitrate: q.maxBitrate,
              maxFramerate: frameRate,
            },
            videoSimulcastLayers:
              videoQuality === '1080p'
                ? [VideoPresets.h720, VideoPresets.h360]
                : videoQuality === '720p' || videoQuality === 'auto'
                  ? [VideoPresets.h360]
                  : [],
            // Clear voice: higher Opus bitrate + packet loss resilience
            audioPreset: audioPresetForBitrate(audioBitrateKbps),
            dtx: true,
            red: true,
            forceStereo: false,
          },
          audioCaptureDefaults: {
            echoCancellation,
            noiseSuppression,
            autoGainControl,
            channelCount: 1,
            sampleRate: 48000,
            voiceIsolation: noiseSuppression,
          },
        })
        roomRef.current = room

        const syncRemotesList = () => {
          const next: RemoteCam[] = []
          room.remoteParticipants.forEach((p) => {
            next.push({
              identity: p.identity,
              name: p.name || p.identity,
            })
          })
          next.sort((a, b) => a.name.localeCompare(b.name, 'bg'))
          setRemotes(next)
        }

        const attachRemote = (
          participant: RemoteParticipant,
          publication: RemoteTrackPublication
        ) => {
          if (!publication.track) return
          if (
            publication.kind !== Track.Kind.Video &&
            publication.kind !== Track.Kind.Audio
          ) {
            return
          }

          if (publication.kind === Track.Kind.Audio) {
            const host = remoteAudioRef.current
            if (!host) return
            const track = publication.track as {
              attach: () => HTMLMediaElement
              setVolume?: (v: number) => void
              detach?: () => HTMLMediaElement[]
              mediaStreamTrack?: MediaStreamTrack
            }
            remoteAudioTracks.current.set(participant.identity, track)
            const mst = track.mediaStreamTrack
            if (mst) {
              remoteMicStreams.current.set(participant.identity, mst)
              notifyRemoteAudioTracks()
            }
            const el = track.attach() as HTMLAudioElement
            el.dataset.identity = participant.identity
            el.className = 'hidden'
            el.autoplay = true
            el.setAttribute('playsinline', 'true')
            el.setAttribute('webkit-playsinline', 'true')
            try {
              const sink = el as HTMLAudioElement & {
                setSinkId?: (id: string) => Promise<void>
              }
              if (typeof sink.setSinkId === 'function') {
                void sink.setSinkId('default')
              }
            } catch {
              /* ignore */
            }
            // Translation on → muted + volume 0 (still subscribed so TTS path stays healthy)
            applyRawRemotePolicy(el, track)
            host.appendChild(el)
            void ensureRemoteAudioPlayback()
            syncRemotesList()
            return
          }

          remoteVideoTracks.current.set(participant.identity, publication.track)
          syncRemotesList()
          setRemoteCamTick((n) => n + 1)
          // Attach after React paints the tile video element
          window.requestAnimationFrame(() => {
            const videoEl = remoteVideoEls.current.get(participant.identity)
            const track = remoteVideoTracks.current.get(participant.identity)
            if (!videoEl || !track) return
            track.attach(videoEl)
            videoEl.style.filter = filterCss
            void videoEl.play().catch(() => undefined)
          })
        }

        const detachRemoteVideo = (identity: string) => {
          const track = remoteVideoTracks.current.get(identity)
          const videoEl = remoteVideoEls.current.get(identity)
          if (track && videoEl) {
            try {
              track.detach(videoEl)
            } catch {
              // ignore
            }
          }
          remoteVideoTracks.current.delete(identity)
          remoteAudioTracks.current.delete(identity)
          remoteMicStreams.current.delete(identity)
          notifyRemoteAudioTracks()
          setRemoteCamTick((n) => n + 1)
          remoteAudioRef.current
            ?.querySelectorAll(`[data-identity="${CSS.escape(identity)}"]`)
            .forEach((node) => node.remove())
        }

        room.on(
          RoomEvent.TrackSubscribed,
          (_track, publication, participant) => {
            attachRemote(participant, publication as RemoteTrackPublication)
          }
        )
        room.on(
          RoomEvent.TrackUnsubscribed,
          (_track, publication, participant) => {
            if (publication.kind === Track.Kind.Video) {
              detachRemoteVideo(participant.identity)
              syncRemotesList()
            } else if (publication.kind === Track.Kind.Audio) {
              remoteAudioTracks.current.delete(participant.identity)
              remoteMicStreams.current.delete(participant.identity)
              notifyRemoteAudioTracks()
              remoteAudioRef.current
                ?.querySelectorAll(
                  `[data-identity="${CSS.escape(participant.identity)}"]`
                )
                .forEach((node) => node.remove())
            }
          }
        )
        const notifyLanguages = () => {
          onRemoteLanguagesRef.current?.(collectRemoteLanguages())
        }

        room.on(RoomEvent.ParticipantConnected, () => {
          syncRemotesList()
          notifyLanguages()
          // New peer in a group — keep raw mics ducked if translating
          if (duckRawRef.current) muteAllRemoteRawMics()
        })
        room.on(RoomEvent.ParticipantDisconnected, (participant) => {
          detachRemoteVideo(participant.identity)
          syncRemotesList()
          notifyLanguages()
        })
        room.on(RoomEvent.ParticipantMetadataChanged, () => {
          notifyLanguages()
        })
        room.on(RoomEvent.DataReceived, (payload, participant) => {
          try {
            const raw = new TextDecoder().decode(payload)
            const packet = JSON.parse(raw) as VoiceBridgePacket
            if (packet?.type !== 'voicebridge' || !packet.text) return
            const from = participant?.identity || packet.from
            // Ignore our own VoiceBridge echo (two-tab / loopback tests)
            if (
              from &&
              room.localParticipant?.identity &&
              from === room.localParticipant.identity
            ) {
              return
            }
            onVoiceBridgeRef.current?.({
              ...packet,
              from,
            })
            // Group-safe: keep EVERY remote raw mic silent while translating
            if (duckRawRef.current) {
              muteAllRemoteRawMics()
              if (from) duckRemoteAudio(from, 0)
            }
          } catch {
            // ignore non-json data
          }
        })

        await room.connect(data.server_url, data.participant_token)
        if (cancelled) {
          room.disconnect()
          return
        }

        // Critical: without startAudio(), Chrome/iOS keep remote mics silent
        try {
          await room.startAudio()
        } catch {
          /* need a later user tap — armLocalMedia / unlockRemoteAudio */
        }

        room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
          if (!room.canPlaybackAudio) return
          void ensureRemoteAudioPlayback()
        })

        // Ensure peers see our speaking language (needed for VoiceBridge)
        try {
          await room.localParticipant.setMetadata(
            JSON.stringify({ language: languageRef.current || 'en' })
          )
        } catch {
          /* metadata optional */
        }

        // Catch participants / tracks already in the room
        room.remoteParticipants.forEach((p) => {
          p.trackPublications.forEach((pub) => {
            if (pub.isSubscribed && pub.track) {
              attachRemote(p, pub as RemoteTrackPublication)
            }
          })
        })
        syncRemotesList()
        notifyLanguages()
        void ensureRemoteAudioPlayback()

        const video = videoTrackRef.current
        const audio = audioTrackRef.current
        if (audio) {
          await room.localParticipant
            .publishTrack(audio, {
              source: Track.Source.Microphone,
              audioPreset: audioPresetForBitrate(audioBitrateKbps),
              dtx: true,
              red: true,
              forceStereo: false,
            })
            .catch(() => undefined)
        }
        if (video && cameraOn) {
          await room.localParticipant.publishTrack(video).catch(() => undefined)
        }

        attachPreview(videoTrackRef.current)
        if (!cancelled) setStatus('live')
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'LiveKit error')
          setStatus('local')
        }
      }
    }

    void connect()
    return () => {
      cancelled = true
      duckTimers.current.forEach((id) => window.clearTimeout(id))
      duckTimers.current.clear()
      remoteVideoTracks.current.clear()
      remoteVideoEls.current.clear()
      setRemotes([])
      roomRef.current?.disconnect()
      roomRef.current = null
    }
    // Do NOT reconnect on language / AGC changes — that re-asks mic permission
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, guestId, displayName, enableLiveKit])

  useEffect(() => {
    return () => {
      void videoTrackRef.current?.stopProcessor().catch(() => undefined)
      videoTrackRef.current?.stop()
      audioTrackRef.current?.stop()
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
      videoTrackRef.current = null
      audioTrackRef.current = null
      processorRef.current = null
    }
  }, [])

  // Keep speaking language visible to peers when it changes mid-call
  useEffect(() => {
    const room = roomRef.current
    if (!room || status !== 'live') return
    void room.localParticipant
      .setMetadata(JSON.stringify({ language: language || 'en' }))
      .catch(() => undefined)
  }, [language, status])

  useEffect(() => {
    const room = roomRef.current
    if (!room || status !== 'live') return
    const video = videoTrackRef.current
    void (async () => {
      try {
        if (cameraOn && video) {
          const pub = room.localParticipant.getTrackPublication(
            Track.Source.Camera
          )
          if (!pub) await room.localParticipant.publishTrack(video)
          else await video.unmute()
          attachPreview(video)
        } else if (video) {
          await video.mute()
        }
      } catch {
        // stay
      }
    })()
  }, [cameraOn, status])

  // Publish mic AFTER late permission grant (guest Allow often finishes after connect)
  useEffect(() => {
    const room = roomRef.current
    const audio = audioTrackRef.current
    if (!room || status !== 'live' || !audio) return
    void (async () => {
      try {
        const pub = room.localParticipant.getTrackPublication(
          Track.Source.Microphone
        )
        if (!pub) {
          await room.localParticipant.publishTrack(audio, {
            source: Track.Source.Microphone,
            audioPreset: audioPresetForBitrate(audioBitrateKbps),
            dtx: true,
            red: true,
            forceStereo: false,
          })
        }
        if (micOn && !silencePublishedMic) await audio.unmute()
        else await audio.mute()
        setMicError(null)
      } catch (err) {
        setMicError(
          err instanceof Error
            ? err.message
            : 'Микрофонът не се публикува — натисни Mic отново'
        )
      }
    })()
  }, [status, audioReadyTick, micOn, silencePublishedMic, audioBitrateKbps])

  // After voice→video upgrade, remounted <video> must re-attach
  useEffect(() => {
    if (audioOnly || !cameraOn) return
    const track = videoTrackRef.current
    if (track) attachPreview(track)
  }, [audioOnly, cameraOn])

  useEffect(() => {
    const room = roomRef.current
    if (room && status === 'live') {
      void room.localParticipant
        .setScreenShareEnabled(screenShare)
        .then(() => {
          const pub = room.localParticipant.getTrackPublication(
            Track.Source.ScreenShare
          )
          const track = pub?.track
          const el = contentVideoRef.current
          if (track && el) {
            track.attach(el)
            setHasScreenContent(true)
            void el.play().catch(() => undefined)
          } else if (!screenShare) {
            setHasScreenContent(false)
          }
        })
        .catch(() => undefined)
    }
    if (!screenShare) setHasScreenContent(false)
  }, [screenShare, status])

  useEffect(() => {
    remoteVideoEls.current.forEach((video) => {
      video.style.filter = filterCss
    })
  }, [filterCss, remotes])

  useEffect(() => {
    // Keep in sync with speaker / translation — NEVER restore volume while ducking
    muteAllRemoteRawMics()
  }, [speakerOn, duckRawRemoteMic, remotes])

  // Re-attach remote tracks when tile <video> mounts
  useEffect(() => {
    remotes.forEach((r) => {
      const track = remoteVideoTracks.current.get(r.identity)
      const el = remoteVideoEls.current.get(r.identity)
      if (!track || !el) return
      track.attach(el)
      el.style.filter = filterCss
      void el.play().catch(() => undefined)
    })
  }, [remotes, filterCss])

  // Contour: never show raw cam rectangle on banner — wait for AI, or fall back to full real cam
  const fallbackNoAi =
    (useContour || useBlur) &&
    hasLocalVideo &&
    cameraOn &&
    (!canProcess || cutoutFailed)

  // Always show the live camera as soon as we have a track — cutout may still be loading
  // on top. Hiding until processorReady made it look like "камерата не става".
  const showProcessed = cameraOn && hasLocalVideo

  const showLoadingCutout =
    cameraOn &&
    hasLocalVideo &&
    (useContour || useBlur) &&
    canProcess &&
    !cutoutFailed &&
    !processorReady &&
    (cutoutBusy || !fallbackNoAi)

  // CSS banner behind: oval / loading only. When processorReady, banner is baked into the video.
  // On AI failure we fall back to full real cam (no plate) so user never sees a square on the banner.
  const showPlateBehind =
    useOval ||
    showLoadingCutout ||
    (!cameraOn && (useContour || useOval))

  const cutoutLabel = useReal
    ? 'Истинска стая'
    : useBlur
      ? processorReady
        ? 'Замъглен фон'
        : 'Замъгляване…'
      : useContour
        ? processorReady
          ? 'Изрязан върху банер'
          : 'Изрязване по контур…'
        : useOval
          ? 'Овал'
          : 'Виртуална'

  const pipMode = stageLayout === 'content-pip'
  const conferenceMode = stageLayout === 'conference'
  /** Floating host over content — chroma green punched out via SVG filter */
  const silhouettePip =
    pipMode && useContour && processorReady && !cutoutFailed
  const localTile = (
    <div
      className={`relative h-full ${
        silhouettePip
          ? 'overflow-visible bg-transparent'
          : conferenceMode
            ? 'overflow-hidden rounded-full bg-black ring-2 ring-white/25 shadow-xl'
            : `overflow-hidden rounded-2xl bg-black ${
                pipMode ? 'min-h-0' : 'min-h-[180px] sm:min-h-[220px]'
              }`
      }`}
    >
      {showPlateBehind && !silhouettePip && !conferenceMode && bgUrl ? (
        <ParallaxRoomBg
          src={bgUrl}
          className="pointer-events-none absolute inset-0 z-0"
          strength={0.04}
        />
      ) : null}
      {/* Hidden SVG chroma-key filter for streaming silhouette */}
      {pipMode && useContour ? (
        <svg width="0" height="0" className="absolute" aria-hidden>
          <defs>
            <filter
              id="ov-chroma-key"
              colorInterpolationFilters="sRGB"
              x="-8%"
              y="-8%"
              width="116%"
              height="116%"
            >
              {/* Pure green plate → alpha 0; person stays opaque */}
              <feColorMatrix
                in="SourceGraphic"
                type="matrix"
                values="
                  1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  1 -1.55 1 0 0"
                result="alphaMask"
              />
              <feComposite
                in="SourceGraphic"
                in2="alphaMask"
                operator="in"
              />
            </filter>
          </defs>
        </svg>
      ) : null}
      <div
        className={
          useOval && !silhouettePip
            ? 'absolute inset-0 z-[1] flex items-end justify-center pb-[6%] sm:pb-[4%]'
            : 'absolute inset-0 z-[1]'
        }
      >
        <div
          className={
            useOval && !silhouettePip
              ? `relative overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.45)] transition-all ${
                  showProcessed
                    ? 'h-[78%] w-[46%] max-w-[360px] min-h-[160px] min-w-[120px] rounded-[2rem] sm:h-[82%] sm:w-[36%]'
                    : 'flex h-16 w-16 items-center justify-center rounded-full bg-black/35'
                }`
              : 'relative h-full w-full'
          }
        >
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`h-full w-full object-cover ${
              showProcessed
                ? 'visible opacity-100'
                : 'invisible pointer-events-none opacity-0'
            } ${mirrorVideo ? 'scale-x-[-1]' : ''}`}
            style={{
              filter: silhouettePip
                ? `url(#ov-chroma-key)${filterCss !== 'none' ? ` ${filterCss}` : ''}`
                : filterCss,
            }}
          />

          {showLoadingCutout ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center justify-end gap-1 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-10 text-white">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-center text-[11px] font-medium">
                {pipMode
                  ? 'Камерата работи · изрязваме върху стрийма…'
                  : 'Камерата работи · изрязваме върху банера…'}
              </span>
            </div>
          ) : null}

          {!cameraOn ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 text-white/80">
              <CameraOff className="h-8 w-8" />
              <span className="text-xs">Камерата е изключена — включи Cam</span>
            </div>
          ) : null}

          {cameraOn && !audioOnly && !hasLocalVideo ? (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/70 px-3 text-center">
              <p className="text-[11px] font-medium text-amber-100">
                Камерата още не е разрешена
              </p>
              <button
                type="button"
                onClick={requestMediaFromUserTap}
                className="touch-manipulation rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-black shadow-lg active:brightness-95"
              >
                {mediaBusy
                  ? 'Изчакай Allow… (след 8с пак)'
                  : 'Разреши камера'}
              </button>
            </div>
          ) : null}

          {cameraOn &&
          (useContour || useBlur) &&
          (!canProcess || cutoutFailed) ? (
            <div className="absolute bottom-12 left-1/2 z-10 w-[min(90%,18rem)] -translate-x-1/2 rounded-xl bg-amber-500/90 px-3 py-2 text-center text-[11px] font-semibold text-black">
              {cutoutFailed
                ? 'AI изрязването не стартира — виждаш истинската камера.'
                : 'AI изрязването работи в Chrome / Edge.'}
            </div>
          ) : null}
        </div>
      </div>

      {broadcastOverlays ? (
        <>
          <div className="absolute left-3 top-3 z-10 rounded-lg border border-red-500/70 bg-black/70 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white shadow-lg">
            <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
            {lowerThird}
          </div>
          <div className="absolute bottom-3 left-3 z-10 rounded-full bg-red-600 px-3 py-1 text-[11px] font-semibold text-white shadow-lg">
            Discord
          </div>
        </>
      ) : silhouettePip ? null : (
        <div className="absolute bottom-2 left-2 z-10 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-white">
            {displayName} (ти)
          </span>
          <span className="rounded-full bg-black/45 px-2 py-0.5 text-[10px] text-white/80">
            {cutoutLabel} · {VIDEO_QUALITY[videoQuality]?.label || 'HD'}
          </span>
          {status === 'live' ? (
            <span className="rounded-full bg-emerald-500/80 px-2 py-0.5 text-[10px] font-semibold text-white">
              LIVE
            </span>
          ) : (
            <span className="rounded-full bg-amber-500/80 px-2 py-0.5 text-[10px] font-semibold text-white">
              Preview
            </span>
          )}
        </div>
      )}
    </div>
  )

  if (stageLayout === 'content-pip' && !audioOnly) {
    const contentLabel =
      contentHint === 'game'
        ? 'Игра · сподели екран / gameplay'
        : contentHint === 'movie'
          ? 'Филм · сподели плеър'
          : contentHint === 'series'
            ? 'Сериал · сподели епизод'
            : 'Screen share · филм / сериал / игра'

    return (
      <div className="space-y-2">
        {micBanner}
        <div ref={remoteAudioRef} className="hidden" aria-hidden />
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 sm:aspect-[16/9]">
          <video
            ref={contentVideoRef}
            autoPlay
            muted
            playsInline
            className={`absolute inset-0 h-full w-full object-contain bg-black ${
              hasScreenContent ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {!hasScreenContent ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black px-6 text-center text-white/75">
              <p className="text-sm font-semibold text-white">{contentLabel}</p>
              <p className="max-w-md text-xs text-white/55">
                Включи Share — контентът е fullscreen, а ти си изрязан в ъгъла
                (като при стрийм на Twitch / Kick).
              </p>
            </div>
          ) : null}

          <div
            className={`absolute z-20 h-[34%] w-[26%] min-h-[130px] min-w-[110px] max-w-[260px] sm:h-[38%] sm:w-[24%] ${pipCornerClass(pipCorner)} ${
              silhouettePip
                ? 'overflow-visible bg-transparent shadow-none'
                : 'overflow-hidden rounded-2xl border-2 border-white/30 bg-black shadow-2xl'
            }`}
          >
            {localTile}
            {silhouetteReactions.map((r, i) => (
              <span
                key={r.id}
                className="pointer-events-none absolute animate-bounce text-2xl drop-shadow-lg"
                style={{
                  left: `${12 + ((i * 37) % 70)}%`,
                  bottom: `${55 + ((i * 23) % 40)}%`,
                  animationDuration: '1.1s',
                }}
                aria-hidden
              >
                {r.emoji}
              </span>
            ))}
          </div>

          {status === 'live' ? (
            <div className="absolute left-3 top-3 z-30 rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white">
              <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
              LIVE STREAM
            </div>
          ) : null}
        </div>
        {error ? <p className="text-xs text-amber-500">{error}</p> : null}
      </div>
    )
  }

  if (audioOnly) {
    const people = [
      { id: 'you', name: `${displayName} (ти)` },
      ...remotes.map((r) => ({ id: r.identity, name: r.name })),
    ]
    return (
      <div className="space-y-2">
        {micBanner}
        <div ref={remoteAudioRef} className="hidden" aria-hidden />
        {/* Keep local video mounted so upgrade to video reuses the track */}
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-black px-4 py-10 sm:py-14">
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-wide text-white/50">
            Гласово обаждане
            {status === 'live' ? ' · LIVE' : ' · свързване…'}
            {!speakerOn ? ' · високоговорител off' : ''}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {people.map((p) => (
              <div key={p.id} className="flex w-24 flex-col items-center gap-2">
                <span
                  className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white shadow-lg ring-2 ${
                    p.id === 'you'
                      ? 'bg-gradient-to-br from-teal-400 to-emerald-700 ring-emerald-300/50'
                      : 'bg-gradient-to-br from-sky-500 to-indigo-700 ring-white/20'
                  } ${micOn && p.id === 'you' ? 'animate-pulse' : ''}`}
                >
                  {(p.name || '?').slice(0, 1).toUpperCase()}
                </span>
                <span className="truncate text-center text-[11px] text-white/80">
                  {p.name}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-[11px] text-white/45">
            Включи „Видео“ по-долу — без нова стая
          </p>
        </div>
        {error ? <p className="text-xs text-amber-500">{error}</p> : null}
      </div>
    )
  }

  /** Fixed seats around an oval conference table */
  if (conferenceMode && !audioOnly) {
    const seats = [
      { id: 'you', name: `${displayName} (ти)`, local: true as const },
      ...remotes.map((r) => ({
        id: r.identity,
        name: r.name,
        local: false as const,
      })),
    ]
    const n = Math.max(seats.length, 1)
    return (
      <div className="space-y-2">
        {micBanner}
        <div ref={remoteAudioRef} className="hidden" aria-hidden />
        <div className="relative aspect-[16/11] overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 sm:aspect-[16/10]">
          {bgUrl ? (
            <ParallaxRoomBg
              src={bgUrl}
              className="absolute inset-0"
              strength={0.05}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-zinc-900 to-black" />
          )}
          {/* Table */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-[1] h-[38%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-amber-200/25 bg-gradient-to-br from-amber-900/50 to-stone-900/70 shadow-[inset_0_0_40px_rgba(0,0,0,0.45)]" />
          <p className="absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wide text-white/40">
            Конферентна маса
          </p>
          {seats.map((s, i) => {
            const angle = (i / n) * Math.PI * 2 - Math.PI / 2
            const rx = 42
            const ry = 36
            const left = 50 + Math.cos(angle) * rx
            const top = 50 + Math.sin(angle) * ry
            return (
              <div
                key={s.id}
                className="absolute z-[2] h-[22%] w-[18%] min-h-[72px] min-w-[64px] max-w-[140px] -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                {s.local ? (
                  localTile
                ) : (
                  <div className="relative h-full w-full overflow-hidden rounded-full bg-zinc-950 ring-2 ring-white/25 shadow-xl">
                    <video
                      ref={(el) => {
                        if (el) remoteVideoEls.current.set(s.id, el)
                        else remoteVideoEls.current.delete(s.id)
                      }}
                      autoPlay
                      playsInline
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    {!remoteVideoTracks.current.has(s.id) ? (
                      <div
                        key={`wait-${remoteCamTick}`}
                        className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-white/70"
                      >
                        <span className="text-lg font-bold">
                          {(s.name || '?').slice(0, 1).toUpperCase()}
                        </span>
                      </div>
                    ) : null}
                    <span className="absolute bottom-1 left-1/2 max-w-[90%] -translate-x-1/2 truncate rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] text-white">
                      {s.name}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-[11px] text-[var(--muted)]">
          Конферентен layout · {n} места около масата · AI cutout върху залата
        </p>
        {error ? <p className="text-xs text-amber-500">{error}</p> : null}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {micBanner}
      <div ref={remoteAudioRef} className="hidden" aria-hidden />

      <div
        className={`grid gap-2 ${gridColsClass(tileCount)} ${
          tileCount === 1 ? '' : 'auto-rows-fr'
        }`}
      >
        <div
          className={
            tileCount === 1
              ? 'aspect-[16/10] sm:aspect-video'
              : tileCount === 2
                ? 'min-h-[240px] sm:min-h-[320px]'
                : 'min-h-[180px] sm:min-h-[240px]'
          }
        >
          {localTile}
        </div>

        {remotes.map((r) => (
          <div
            key={r.identity}
            className={`relative h-full overflow-hidden rounded-2xl bg-zinc-950 ${
              tileCount === 2
                ? 'min-h-[240px] sm:min-h-[320px]'
                : 'min-h-[180px] sm:min-h-[240px]'
            }`}
          >
            <video
              ref={(el) => {
                if (el) remoteVideoEls.current.set(r.identity, el)
                else remoteVideoEls.current.delete(r.identity)
              }}
              autoPlay
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            />
            {!remoteVideoTracks.current.has(r.identity) ? (
              <div
                key={`wait-${remoteCamTick}`}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-800 to-zinc-950 text-white/70"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-lg font-bold">
                  {(r.name || '?').slice(0, 1).toUpperCase()}
                </span>
                <span className="text-xs">Чака камера…</span>
              </div>
            ) : null}
            <div className="absolute bottom-2 left-2 z-10">
              <span className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-white">
                {r.name}
              </span>
            </div>
          </div>
        ))}
      </div>

      {tileCount > 1 ? (
        <p className="text-[11px] text-[var(--muted)]">
          {tileCount} камери в разговора — по една за всеки участник
        </p>
      ) : null}

      {error ? <p className="text-xs text-amber-500">{error}</p> : null}
    </div>
  )
})

export default LiveKitStage
