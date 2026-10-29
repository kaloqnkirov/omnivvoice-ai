'use client'

import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from 'react'
import {
  ArrowLeft,
  Camera,
  CameraOff,
  Image as ImageIcon,
  Check,
  Link2,
  LogOut,
  Mic,
  MicOff,
  PhoneOff,
  Settings2,
  Sparkles,
  Subtitles,
  Trash2,
  UserMinus,
  UserPlus,
  Video,
  Volume2,
  VolumeX,
  Megaphone,
  X,
} from 'lucide-react'
import AdOverlay from '@/components/AdOverlay'
import CoachBubble from '@/components/CoachBubble'
import type { CoachmarkId } from '@/lib/coachmarks'
import {
  DEFAULT_ADS,
  pickNextCreative,
  type AdCreative,
  type AdPlacement,
} from '@/lib/ads'
import type { Subscriber } from '@/lib/user-store'
import { guestInviteUrl } from '@/lib/invite-url'
import { createServerGuestInvite } from '@/lib/create-guest-invite'
import BusinessIntel from '@/components/BusinessIntel'
import BusinessOverlay from '@/components/BusinessOverlay'
import ChatComposer from '@/components/ChatComposer'
import ContextMenu, { type ContextMenuItem } from '@/components/ContextMenu'
import LiveKitStage, {
  cutoutLabelBg,
  nextCutout,
  type LiveKitStageHandle,
  type VoiceBridgePacket,
} from '@/components/LiveKitStage'
import InteractiveCaptions from '@/components/InteractiveCaptions'
import PodcastLiveRail from '@/components/PodcastLiveRail'
import PodcastOverlay from '@/components/PodcastOverlay'
import StreamingOverlay from '@/components/StreamingOverlay'
import WatchTogetherDock from '@/components/WatchTogetherDock'
import {
  contentHintForScene,
  isWatchTogetherScene,
  type PipCorner,
  type StreamSceneId,
  type WatchTogetherCategory,
} from '@/lib/streaming'
import RichMessageBubble from '@/components/RichMessageBubble'
import RoomPeopleDock from '@/components/RoomPeopleDock'
import SettingsPanel from '@/components/SettingsPanel'
import VirtualRoomSelector from '@/components/VirtualRoomSelector'
import { isAdminUser } from '@/lib/access'
import { isClientBackendEnabled } from '@/lib/auth-client'
import { workspaceForPlan, workspaceForUser } from '@/lib/plan-modes'
import type { StreamPlatformId } from '@/lib/platforms'
import {
  clearGuestSession,
  getGuestStage,
  loadGuestSession,
  patchGuestStage,
  saveGuestSession,
  type GuestStagePrefs,
} from '@/lib/guest-session'
import type { StageCutout } from '@/lib/stage-cutout'
import { useRoomSync } from '@/hooks/useRoomSync'
import {
  APP_LANGUAGES,
  getLanguage,
  normalizeLangCode,
} from '@/lib/languages'
import {
  VIDEO_FILTERS,
  VIDEO_QUALITY,
  type VideoFilterId,
  type VideoQualityId,
} from '@/lib/studio-rooms'
import { MY_FACE_LOOKS, type MyFaceLookId } from '@/lib/my-face'
import { useTheme } from '@/lib/theme'
import { canSaveAiRoom, capAiRoomsForPlan } from '@/lib/ai-rooms'
import {
  resolveVoiceName,
  speakText,
  speakVoicePresetSample,
  stopSpeaking,
  translateText,
  isTtsSpeaking,
  unlockMediaPlayback,
  unlockSpeechSynthesis,
  useLiveTranslation,
} from '@/lib/translation'
import {
  VOICE_PRESETS,
  resolveVoicePreset,
  type VoicePresetId,
} from '@/lib/voice-presets'
import type { Conversation, JoinRequest } from '@/lib/auth-types'
import {
  collectIntelSources,
  DEFAULT_INTEL_OPTIONS,
  fetchBusinessIntel,
  formatAgreementForClipboard,
  formatIntelForClipboard,
  formatWrittenContractForClipboard,
  type BusinessIntelData,
  type BusinessIntelOptionId,
  type BusinessIntelTranscriptLine,
} from '@/lib/business-intel'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function RoomInner() {
  const params = useParams<{ id: string }>()
  const search = useSearchParams()
  const router = useRouter()
  const { prefs, updatePrefs, hydrated } = useTheme()
  const backend = isClientBackendEnabled()
  const useBackendRoom = backend && isUuid(params.id)

  const conv = prefs.conversations.find((item) => item.id === params.id)
  const user = prefs.user
  const isGuest = search.get('guest') === '1'
  const guestLangFromUrl = search.get('lang') || ''
  const guestIdFromUrl = search.get('gid') || ''
  const guestNameFromUrl = search.get('name') || ''
  const hostPlanFromUrl = search.get('hostPlan') || ''
  const hostIdFromUrl = search.get('hostId') || ''

  function resolveHostPlan(
    raw: string | undefined | null
  ): 'free' | 'business' | 'podcast' {
    if (raw === 'business' || raw === 'podcast') return raw
    return 'free'
  }

  function resolveTranslatePlan(
    raw: string | undefined | null
  ): 'free' | 'business' | 'podcast' {
    if (raw === 'business' || raw === 'podcast') return raw
    return 'free'
  }

  // Rebuild guest session from URL if localStorage was cleared / private mode
  const guest = useMemo(() => {
    if (!isGuest) return null
    const stored = loadGuestSession()
    const hostPlan = resolveHostPlan(hostPlanFromUrl || stored?.hostPlan)
    const hostId = hostIdFromUrl || stored?.hostId || undefined

    if (
      stored?.guestId &&
      stored.conversationId === params.id
    ) {
      const needsPatch =
        (hostPlan !== 'free' && stored.hostPlan !== hostPlan) ||
        (hostId && stored.hostId !== hostId)
      if (needsPatch) {
        const patched = { ...stored, hostPlan, hostId: hostId || stored.hostId }
        saveGuestSession(patched)
        return patched
      }
      return stored.hostPlan || stored.hostId
        ? stored
        : { ...stored, hostPlan, hostId }
    }
    if (guestIdFromUrl) {
      const rebuilt = {
        guestId: guestIdFromUrl,
        displayName: guestNameFromUrl || stored?.displayName || 'Guest',
        language: guestLangFromUrl || stored?.language || 'bg',
        hostPlan,
        hostId,
        inviteCode: stored?.inviteCode || 'url',
        conversationId: params.id,
        role: 'invite' as const,
        joinedAt: stored?.joinedAt || new Date().toISOString(),
        stage: stored?.stage,
      }
      saveGuestSession(rebuilt)
      return rebuilt
    }
    return null
  }, [
    isGuest,
    params.id,
    guestIdFromUrl,
    guestNameFromUrl,
    guestLangFromUrl,
    hostPlanFromUrl,
    hostIdFromUrl,
  ])

  const translatePlan = resolveTranslatePlan(
    isGuest ? guest?.hostPlan : user?.plan
  )
  /** Cloud quota is always on the paying host (guests inherit) */
  const billingUserId = isGuest ? guest?.hostId : user?.id
  const translateBonusChars = prefs.translateBonusChars || 0

  const [guestStage, setGuestStage] = useState<GuestStagePrefs>(() =>
    getGuestStage(isGuest ? loadGuestSession() : null)
  )

  const {
    room: remoteRoom,
    messages: remoteMessages,
    sendMessage,
    endSession,
    loading: roomLoading,
    setRoom: setRemoteRoom,
  } = useRoomSync(useBackendRoom ? params.id : undefined, useBackendRoom)

  // Speaking language: join form / profile, overridable in-room (never Settings target).
  const [speakLangCode, setSpeakLangCode] = useState<string | null>(null)
  const nativeLang = getLanguage(
    speakLangCode ||
      (isGuest
        ? guest?.language || guestLangFromUrl || 'bg'
        : user?.nativeLanguage || 'bg')
  )

  // Sync from guest URL/session once hydrated
  useEffect(() => {
    if (!isGuest) return
    const fromJoin = guest?.language || guestLangFromUrl
    if (fromJoin) setSpeakLangCode(fromJoin)
  }, [isGuest, guest?.language, guestLangFromUrl])
  const settingsTargetLang = getLanguage(prefs.voice.targetLanguage || 'en')
  /** Other person's speaking language — never default to my native language */
  const [peerLangCode, setPeerLangCode] = useState<string | null>(null)
  const [remotePeerCount, setRemotePeerCount] = useState(0)
  const [translateError, setTranslateError] = useState<string | null>(null)
  const [peerCaption, setPeerCaption] = useState<{
    source: string
    translated: string
  } | null>(null)
  // Solo preview: Settings. With peer: ONLY their language (never my Settings/native).
  const bridgeTargetLang = getLanguage(
    peerLangCode ||
      (remotePeerCount === 0 ? settingsTargetLang.code : 'en')
  )
  const peerKnown = Boolean(
    peerLangCode &&
      normalizeLangCode(peerLangCode) !== normalizeLangCode(nativeLang.code)
  )
  const stageRef = useRef<LiveKitStageHandle>(null)
  const transcriptRef = useRef<BusinessIntelTranscriptLine[]>([])
  const sessionStartedAtRef = useRef(Date.now())
  /** Dedupe VoiceBridge send/receive so translation doesn't stutter/repeat */
  const lastBridgeSentRef = useRef('')
  /** Per-speaker dedupe — group calls must not drop peer B because peer A said the same words */
  const lastBridgeHeardRef = useRef(
    new Map<string, { key: string; at: number }>()
  )
  const translationOnRef = useRef(true)
  const speakerOnRef = useRef(true)
  const remotePeerCountRef = useRef(0)
  const lastSpeechAtRef = useRef(Date.now())
  const adShownCountRef = useRef(0)
  const adCooldownUntilRef = useRef(0)
  const adIndexRef = useRef(0)
  const [activeAd, setActiveAd] = useState<{
    creative: AdCreative
    placement: AdPlacement
    endsAt: number
    showCountdown: boolean
  } | null>(null)
  const [adSecondsLeft, setAdSecondsLeft] = useState(0)
  const [voiceList, setVoiceList] = useState<SpeechSynthesisVoice[]>([])

  const [micOn, setMicOn] = useState(true)
  const [micReady, setMicReady] = useState(false)
  const [ttsUnlocked, setTtsUnlocked] = useState(false)
  const [intelOpen, setIntelOpen] = useState(false)
  const [intelSelecting, setIntelSelecting] = useState(true)
  const [intelLoading, setIntelLoading] = useState(false)
  const [intelError, setIntelError] = useState<string | null>(null)
  const [intelData, setIntelData] = useState<BusinessIntelData | null>(null)
  const [intelOptions, setIntelOptions] = useState<BusinessIntelOptionId[]>(() =>
    prefs.experience?.businessRoom?.defaultIntelOptions?.length
      ? [...prefs.experience.businessRoom.defaultIntelOptions]
      : [...DEFAULT_INTEL_OPTIONS]
  )
  const [pendingHangupAfterIntel, setPendingHangupAfterIntel] = useState(false)
  // Voice call: `?video=0`. Video call / default: camera on.
  const [cameraOn, setCameraOn] = useState(search.get('video') !== '0')
  const [speakerOn, setSpeakerOn] = useState(true)
  const [translationOn, setTranslationOn] = useState(
    () => search.get('translate') !== '0'
  )
  const [subtitlesOn, setSubtitlesOn] = useState(true)
  const [coachTrigger, setCoachTrigger] = useState<CoachmarkId | null>(null)
  const [coachTick, setCoachTick] = useState(0)

  function showCoach(id: CoachmarkId) {
    setCoachTrigger(id)
    setCoachTick((t) => t + 1)
  }

  useEffect(() => {
    if (!isGuest) return
    if (search.get('translate') === '0') setTranslationOn(false)
    if (search.get('translate') === '1') setTranslationOn(true)
  }, [isGuest, search])

  useEffect(() => {
    translationOnRef.current = translationOn
  }, [translationOn])
  useEffect(() => {
    speakerOnRef.current = speakerOn
  }, [speakerOn])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [studioOpen, setStudioOpen] = useState(false)
  const [inviteBusy, setInviteBusy] = useState(false)
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null)
  /** Voice-only UI until user upgrades to video in the same room */
  const audioOnly = !cameraOn

  const stageCutoutRaw = (
    isGuest ? guestStage.cutoutMode : prefs.room.cutoutMode || 'contour'
  ) as StageCutout
  const stageStudioId = isGuest
    ? guestStage.studioRoomId
    : prefs.room.studioRoomId
  const stageCustomBg = isGuest
    ? guestStage.customBackground
    : prefs.room.customBackground
  const stageCustomRooms = isGuest
    ? guestStage.customStudioRooms
    : prefs.room.customStudioRooms || []
  const stageMirror = isGuest
    ? guestStage.mirrorVideo
    : prefs.room.mirrorVideo
  const stageMyFaceEnabled = isGuest
    ? Boolean(guestStage.myFaceEnabled)
    : Boolean(prefs.room.myFaceEnabled)
  const stageMyFaceLook: MyFaceLookId = isGuest
    ? guestStage.myFaceLook || 'soft_glow'
    : prefs.room.myFaceLook || 'soft_glow'

  function patchStage(patch: {
    cutoutMode?: StageCutout
    studioRoomId?: string
    customBackground?: string | null
    customStudioRooms?: GuestStagePrefs['customStudioRooms']
    mirrorVideo?: boolean
    virtualBackground?: boolean
    backgroundBlur?: boolean
    myFaceEnabled?: boolean
    myFaceLook?: MyFaceLookId
  }) {
    if (isGuest) {
      const next = patchGuestStage({
        ...(patch.cutoutMode ? { cutoutMode: patch.cutoutMode } : {}),
        ...(patch.studioRoomId ? { studioRoomId: patch.studioRoomId } : {}),
        ...(patch.customBackground !== undefined
          ? { customBackground: patch.customBackground }
          : {}),
        ...(patch.customStudioRooms
          ? { customStudioRooms: patch.customStudioRooms }
          : {}),
        ...(patch.mirrorVideo !== undefined
          ? { mirrorVideo: patch.mirrorVideo }
          : {}),
        ...(patch.myFaceEnabled !== undefined
          ? { myFaceEnabled: patch.myFaceEnabled }
          : {}),
        ...(patch.myFaceLook ? { myFaceLook: patch.myFaceLook } : {}),
      })
      if (next) setGuestStage(next)
      return
    }
    updatePrefs((current) => ({
      room: {
        ...current.room,
        ...(patch.cutoutMode ? { cutoutMode: patch.cutoutMode } : {}),
        ...(patch.studioRoomId ? { studioRoomId: patch.studioRoomId } : {}),
        ...(patch.customBackground !== undefined
          ? { customBackground: patch.customBackground }
          : {}),
        ...(patch.customStudioRooms
          ? { customStudioRooms: patch.customStudioRooms }
          : {}),
        ...(patch.mirrorVideo !== undefined
          ? { mirrorVideo: patch.mirrorVideo }
          : {}),
        ...(patch.virtualBackground !== undefined
          ? { virtualBackground: patch.virtualBackground }
          : {}),
        ...(patch.backgroundBlur !== undefined
          ? { backgroundBlur: patch.backgroundBlur }
          : {}),
        ...(patch.myFaceEnabled !== undefined
          ? { myFaceEnabled: patch.myFaceEnabled }
          : {}),
        ...(patch.myFaceLook ? { myFaceLook: patch.myFaceLook } : {}),
      },
    }))
  }
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [screenShare, setScreenShare] = useState(false)
  const [kicked, setKicked] = useState(false)
  const [remoteWaitDone, setRemoteWaitDone] = useState(false)
  const [chatDraft, setChatDraft] = useState('')
  const [replyPreview, setReplyPreview] = useState<string | null>(null)
  const [dragPeople, setDragPeople] = useState(false)
  const [dropOverStage, setDropOverStage] = useState(false)
  const [peopleToast, setPeopleToast] = useState<string | null>(null)
  const [memberMenu, setMemberMenu] = useState<{
    x: number
    y: number
    memberId: string
  } | null>(null)
  const roomWorkspace = isGuest
    ? workspaceForPlan('podcast')
    : workspaceForUser(user)
  /** Podcast / Streaming UI only on Podcast plan — Normal rooms stay messenger-only */
  const showStudioModeToggle = !isGuest && roomWorkspace === 'podcast'
  const isStreamingMode =
    showStudioModeToggle && prefs.podcast?.sessionMode === 'streaming'
  const streamPrefs = prefs.podcast?.streaming
  /** Streaming always uses contour silhouette over content */
  const stageCutout = isStreamingMode ? 'contour' : stageCutoutRaw
  /** Business + Podcast (+ streaming) get live rail / overlays */
  const showBroadcastUi =
    roomWorkspace === 'podcast' ||
    roomWorkspace === 'business' ||
    isStreamingMode
  const [salesAssistOn, setSalesAssistOn] = useState(true)
  const [obsLive, setObsLive] = useState(false)
  const [shortQueued, setShortQueued] = useState(false)
  const [streamAlert, setStreamAlert] = useState<string | null>(null)
  const [pipReactions, setPipReactions] = useState<
    Array<{ id: string; emoji: string }>
  >([])

  function burstPipReaction(emoji: string) {
    const id = `rx_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
    setPipReactions((list) => [...list.slice(-8), { id, emoji }])
    window.setTimeout(() => {
      setPipReactions((list) => list.filter((r) => r.id !== id))
    }, 2200)
  }
  const [viewerCaptionLang, setViewerCaptionLang] = useState(
    prefs.voice?.targetLanguage || 'en'
  )
  const connectedPlatforms = useMemo(() => {
    return (
      Object.entries(prefs.podcast?.platforms || {}) as Array<
        [StreamPlatformId, { connected?: boolean }]
      >
    )
      .filter(([, p]) => p.connected)
      .map(([id]) => id)
  }, [prefs.podcast?.platforms])
  const [localRich, setLocalRich] = useState<
    Array<{
      id: string
      fromMe: boolean
      text: string
      createdAt: string
      kind?:
        | 'gif'
        | 'sticker'
        | 'image'
        | 'voice'
        | 'poll'
        | 'deal'
        | 'clip'
        | 'intel'
        | 'gift'
      mediaUrl?: string
      caption?: string
      giftId?: string
      voiceDurationSec?: number
      poll?: {
        question: string
        options: { id: string; label: string; votes: number }[]
        votedOptionId?: string
      }
      deal?: { title: string; value: string; stage: string }
      clip?: { label: string; atSec: number }
      replyPreview?: string
      reactions?: Record<string, number>
    }>
  >([])

  const rememberPeerLang = useCallback(
    (code: string | null | undefined) => {
      const c = normalizeLangCode(code)
      if (!c) return
      if (c === normalizeLangCode(nativeLang.code)) return
      setPeerLangCode(c)
    },
    [nativeLang.code]
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const load = () => setVoiceList(window.speechSynthesis.getVoices())
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () =>
      window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  const voicesForMyLang = useMemo(() => {
    const prefix = nativeLang.speechCode.slice(0, 2).toLowerCase()
    const matched = voiceList.filter((v) =>
      v.lang.toLowerCase().startsWith(prefix)
    )
    return matched.length ? matched : voiceList
  }, [voiceList, nativeLang.speechCode])

  // When browser voices arrive later, bind the selected preset to a real voiceURI
  useEffect(() => {
    const presetId = prefs.voice.voicePreset as VoicePresetId | ''
    if (!presetId || !voiceList.length) return
    const resolved = resolveVoicePreset(presetId, nativeLang.code, voiceList)
    if (!resolved?.voiceURI) return
    updatePrefs((current) => {
      if (
        current.voice.voiceURI === resolved.voiceURI &&
        current.voice.pitch === resolved.pitch &&
        current.voice.rate === resolved.rate
      ) {
        return {}
      }
      return {
        voice: {
          voiceURI: resolved.voiceURI,
          pitch: resolved.pitch,
          rate: resolved.rate,
        },
      }
    })
  }, [voiceList, prefs.voice.voicePreset, nativeLang.code, updatePrefs])

  /**
   * VoiceBridge: each listener hears ONLY their chosen language (any of APP_LANGUAGES).
   * Works 1:1 and in groups — every receiver maps source → MY language locally.
   * Raw remote mics stay ducked while translation is on.
   */
  const onVoiceBridgePacket = useCallback(
    (packet: VoiceBridgePacket) => {
      const source = (packet.text || '').trim()
      if (!source && !packet.translatedText?.trim()) return

      // Never play our own VoiceBridge back (loopback / two tabs)
      const localId = stageRef.current?.getLocalIdentity?.()
      if (localId && packet.from && packet.from === localId) return

      if (packet.sourceLang) rememberPeerLang(packet.sourceLang)
      if (!translationOn || !speakerOn) return

      const myCode = normalizeLangCode(nativeLang.code)
      const sourceCode = normalizeLangCode(packet.sourceLang)
      const hintCode = normalizeLangCode(packet.lang)
      const ready = (packet.translatedText || '').trim()
      const fromKey = packet.from || packet.fromName || 'peer'

      void (async () => {
        let toSpeak = ''
        try {
          // Ready text only if sender already translated INTO my language
          if (ready && hintCode && hintCode === myCode) {
            toSpeak = ready
          } else if (sourceCode && sourceCode === myCode && source) {
            // Same language as me — still TTS (raw mics are ducked in groups too)
            toSpeak = source
          } else if (source) {
            // ANY app language → mine (bg↔en↔tr↔ja↔ar…)
            toSpeak = await translateText(source, nativeLang.name, {
              emotionSafe: prefs.voice.emotionSafe,
              tone: prefs.voice.tone,
              sourceLanguage:
                sourceCode ||
                packet.sourceLang ||
                undefined,
              userKey: guest?.guestId || user?.id,
              polish: false,
              plan: translatePlan,
              billingUserId,
              bonusChars: translateBonusChars,
            })
          } else if (ready) {
            // No source — translate whatever hint text we got into my language
            toSpeak = await translateText(ready, nativeLang.name, {
              emotionSafe: prefs.voice.emotionSafe,
              tone: prefs.voice.tone,
              sourceLanguage: hintCode || undefined,
              userKey: guest?.guestId || user?.id,
              polish: false,
              plan: translatePlan,
              billingUserId,
              bonusChars: translateBonusChars,
            })
          }
        } catch (err) {
          setTranslateError(
            err instanceof Error ? err.message : 'Translation failed'
          )
          return
        }

        const spoken = toSpeak.trim()
        if (!spoken) return
        // User may have stopped translation while we were awaiting translate
        if (!translationOnRef.current || !speakerOnRef.current) return

        // Per-speaker dedupe (group: A and B can both say "ok")
        const key = spoken.toLowerCase().replace(/\s+/g, ' ').slice(0, 160)
        const now = Date.now()
        const prev = lastBridgeHeardRef.current.get(fromKey) || {
          key: '',
          at: 0,
        }
        if (key === prev.key && now - prev.at < 5000) {
          return
        }
        if (
          key.startsWith(prev.key) &&
          prev.key.length >= 8 &&
          now - prev.at < 3500
        ) {
          if (key.length - prev.key.length < 6) return
        }
        lastBridgeHeardRef.current.set(fromKey, { key, at: now })
        lastSpeechAtRef.current = now

        setPeerCaption({
          source: source || ready,
          translated: spoken,
        })
        setTranslateError(null)
        transcriptRef.current.push({
          role: 'peer',
          text: source || ready,
          translatedText: spoken,
          at: new Date().toISOString(),
        })
        // Speak MY language immediately; duck raw mic via isTtsSpeaking gate
        unlockMediaPlayback()
        stageRef.current?.duckRemoteAudio(fromKey, 8000)
        speakText(spoken, {
          lang: nativeLang.speechCode,
          voiceURI: prefs.voice.voiceURI || undefined,
          rate: prefs.voice.rate ?? 1.05,
          pitch: prefs.voice.pitch ?? 1,
          queue: false,
        })
      })()
    },
    [
      translationOn,
      speakerOn,
      nativeLang.code,
      nativeLang.name,
      nativeLang.speechCode,
      prefs.voice.emotionSafe,
      prefs.voice.tone,
      prefs.voice.rate,
      prefs.voice.pitch,
      prefs.voice.voiceURI,
      rememberPeerLang,
      guest?.guestId,
      user?.id,
      translatePlan,
      billingUserId,
      translateBonusChars,
    ]
  )

  /** Broadcast my words — each peer translates into THEIR own language */
  const sendBridgeSource = useCallback(
    (text: string, translation?: string) => {
      // Do NOT gate on isTtsSpeaking here — STT already ignores mic during TTS.
      if (!translationOn) return
      const trimmed = text.trim()
      if (!trimmed) return
      const key = trimmed.toLowerCase().replace(/\s+/g, ' ')
      if (key === lastBridgeSentRef.current) return
      if (
        lastBridgeSentRef.current &&
        key.startsWith(lastBridgeSentRef.current) &&
        key.length - lastBridgeSentRef.current.length < 4
      ) {
        return
      }
      lastBridgeSentRef.current = key
      lastSpeechAtRef.current = Date.now()
      const multiPeer = remotePeerCountRef.current > 1
      // Groups: source only so BG/EN/TR/JA listeners each map to their language.
      // 1:1: optional pre-translation into the single peer's language (fast path).
      stageRef.current?.sendVoiceBridge({
        v: 2,
        text: trimmed,
        sourceLang: nativeLang.code,
        lang: multiPeer
          ? nativeLang.code
          : peerKnown
            ? bridgeTargetLang.code
            : nativeLang.code,
        translatedText:
          multiPeer || !peerKnown
            ? undefined
            : translation?.trim() || undefined,
        voiceURI: prefs.voice.voiceURI || undefined,
        rate: prefs.voice.rate,
        pitch: prefs.voice.pitch,
      })
    },
    [
      translationOn,
      nativeLang.code,
      bridgeTargetLang.code,
      peerKnown,
      prefs.voice.voiceURI,
      prefs.voice.rate,
      prefs.voice.pitch,
    ]
  )

  const onSourceSpeech = useCallback(
    (text: string) => {
      // Fast path: source only — peer maps to their language (fixes EN→BG etc.)
      sendBridgeSource(text)
    },
    [sendBridgeSource]
  )

  const onTranscriptLine = useCallback(
    (line: { source: string; translation: string; at: string }) => {
      transcriptRef.current.push({
        role: 'you',
        text: line.source,
        translatedText: line.translation,
        at: line.at,
      })
      setPeerCaption(null)
      // May no-op if onSource already sent the same phrase
      sendBridgeSource(line.source, line.translation)
    },
    [sendBridgeSource]
  )

  const onRemoteLanguages = useCallback(
    (peers: Array<{ identity: string; language: string; name: string }>) => {
      remotePeerCountRef.current = peers.length
      setRemotePeerCount(peers.length)
      // Prefer a peer whose language differs from mine (for 1:1 caption target)
      const other = peers.find(
        (p) =>
          p.language &&
          normalizeLangCode(p.language) !== normalizeLangCode(nativeLang.code)
      )
      if (other?.language) rememberPeerLang(other.language)
      else if (peers[0]?.language) rememberPeerLang(peers[0].language)
    },
    [nativeLang.code, rememberPeerLang]
  )

  // Peer language from Supabase (guest picked Turkish on /join)
  useEffect(() => {
    const parts = remoteRoom?.room_participants
    if (!parts?.length) return
    const others = parts.filter((p) => {
      if (!p.is_active) return false
      if (guest?.guestId && p.guest_id === guest.guestId) return false
      if (user?.id && p.user_id === user.id) return false
      return Boolean(p.language)
    })
    const other =
      others.find(
        (p) =>
          normalizeLangCode(p.language) !== normalizeLangCode(nativeLang.code)
      ) || others[0]
    if (other?.language) {
      rememberPeerLang(other.language)
      remotePeerCountRef.current = Math.max(
        remotePeerCountRef.current,
        others.length
      )
      setRemotePeerCount((n) => Math.max(n, others.length))
    }
  }, [remoteRoom, guest?.guestId, user?.id, nativeLang.code, rememberPeerLang])

  // Persist guest join language onto session if URL has lang=
  useEffect(() => {
    if (!isGuest || !guestLangFromUrl || !guest) return
    if (guest.language === guestLangFromUrl) return
    saveGuestSession({ ...guest, language: guestLangFromUrl })
  }, [isGuest, guestLangFromUrl, guest])

  const {
    listening,
    interimText,
    sourceText,
    translatedText,
    translating,
  } = useLiveTranslation({
    // Translate INTO the other person's language (captions + VoiceBridge packet)
    targetLanguage: peerKnown
      ? bridgeTargetLang.name
      : settingsTargetLang.name,
    // Wait for LiveKit mic publish — otherwise SpeechRecognition steals / re-prompts
    enabled: Boolean(
      micOn && translationOn && micReady && (user || guest)
    ),
    sourceLang: nativeLang.speechCode,
    // NEVER play translation on the speaker's device — only the peer hears TTS
    speakOutput: false,
    voiceLang: bridgeTargetLang.speechCode,
    voiceURI: prefs.voice.voiceURI,
    voiceRate: prefs.voice.rate,
    voicePitch: prefs.voice.pitch,
    emotionSafe: prefs.voice.emotionSafe,
    tone: prefs.voice.tone,
    userKey: guest?.guestId || user?.id,
    polish: false,
    plan: translatePlan,
    billingUserId,
    bonusChars: translateBonusChars,
    onSource: onSourceSpeech,
    onTranscriptLine,
    onError: (message) => setTranslateError(message),
  })

  useEffect(() => {
    if (translatedText) setTranslateError(null)
  }, [translatedText])

  // Mobile/Chrome: unlock TTS after first tap in the room
  useEffect(() => {
    const unlock = () => unlockSpeechSynthesis()
    unlock()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    if (!hydrated || !isGuest) return
    if (useBackendRoom) {
      if (!roomLoading && remoteRoom && remoteRoom.session_open === false) {
        setKicked(true)
        clearGuestSession()
        const timer = window.setTimeout(() => {
          router.replace('/join?ended=1')
        }, 1800)
        return () => window.clearTimeout(timer)
      }
      return
    }
    if (!conv || conv.sessionOpen === false) {
      setKicked(true)
      clearGuestSession()
      const timer = window.setTimeout(() => {
        router.replace('/join?ended=1')
      }, 1800)
      return () => window.clearTimeout(timer)
    }
  }, [
    hydrated,
    isGuest,
    conv,
    router,
    useBackendRoom,
    remoteRoom,
    roomLoading,
  ])

  useEffect(() => {
    if (!useBackendRoom) {
      setRemoteWaitDone(false)
      return
    }
    if (remoteRoom) {
      setRemoteWaitDone(false)
      return
    }
    // Give the API time; keep local chat as fallback so we never flash "not found"
    // while loading or when an older local-only room has a UUID-looking id.
    if (roomLoading) {
      setRemoteWaitDone(false)
      return
    }
    const t = window.setTimeout(() => setRemoteWaitDone(true), 2800)
    return () => window.clearTimeout(t)
  }, [useBackendRoom, roomLoading, remoteRoom])

  // Re-open backend session when host enters — LiveKit tokens require session_open
  useEffect(() => {
    if (!useBackendRoom || isGuest || !hydrated || !user) return
    if (!remoteRoom || remoteRoom.session_open) return
    let cancelled = false
    void fetch(`/api/rooms/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ session_open: true }),
    }).then(async (res) => {
      if (cancelled || !res.ok) return
      setRemoteRoom((prev) =>
        prev ? { ...prev, session_open: true } : prev
      )
      updatePrefs((current) => ({
        conversations: current.conversations.map((c) =>
          c.id === params.id ? { ...c, sessionOpen: true } : c
        ),
      }))
    })
    return () => {
      cancelled = true
    }
  }, [
    useBackendRoom,
    isGuest,
    hydrated,
    user,
    remoteRoom,
    params.id,
    updatePrefs,
    setRemoteRoom,
  ])

  const title = useBackendRoom
    ? remoteRoom?.title || 'Room'
    : conv?.title || 'Room'

  const members = useMemo(() => {
    if (useBackendRoom && remoteRoom) {
      const youName = isGuest
        ? guest?.displayName || 'Guest'
        : user?.displayName || 'Ти'
      const parts = (remoteRoom.room_participants || []).filter(
        (p) => p.is_active && !(isGuest && p.guest_id === guest?.guestId)
      )
      return [
        {
          id: 'you',
          name: youName,
          lang: nativeLang.flag,
          guest: isGuest,
        },
        ...parts.map((p) => ({
          id: p.id,
          name: p.display_name,
          lang: getLanguage(p.language).flag,
          guest: p.role === 'guest',
        })),
      ]
    }
    if (!conv) return []
    const youName = isGuest
      ? guest?.displayName || 'Guest'
      : user?.displayName || 'Ти'
    return [
      {
        id: 'you',
        name: youName,
        lang: nativeLang.flag,
        guest: isGuest,
      },
      ...conv.members
        .filter((member) => !(isGuest && member.id === guest?.guestId))
        .map((member) => ({
          id: member.id,
          name: member.name,
          lang: getLanguage(member.language).flag,
          guest: member.id.startsWith('guest_'),
        })),
    ]
  }, [conv, user, nativeLang.flag, isGuest, guest, useBackendRoom, remoteRoom])

  function patchConv(patch: Partial<Conversation>) {
    if (!conv || isGuest) return
    const convId = conv.id
    updatePrefs((current) => ({
      conversations: current.conversations.map((item) =>
        item.id === convId ? { ...item, ...patch } : item
      ),
    }))
  }

  function patchRoom(patch: Partial<typeof prefs.room>) {
    updatePrefs(() => ({ room: patch }))
  }

  function toastPeople(text: string) {
    setPeopleToast(text)
    window.setTimeout(() => setPeopleToast(null), 2200)
  }

  /** Normal/free: save guest or any name into subscribers — no paywall */
  function addToSubscribers(name: string, fromMemberId?: string) {
    if (isGuest) return
    const trimmed = name.trim()
    if (!trimmed) return
    const key = trimmed.toLowerCase()
    const existing = prefs.subscribers.find(
      (s) =>
        s.id === fromMemberId ||
        s.name.trim().toLowerCase() === key
    )
    if (existing) {
      toastPeople(`${existing.name} вече е в абонатите`)
      return
    }
    const subscriber: Subscriber = {
      id:
        fromMemberId &&
        (fromMemberId.startsWith('guest_') || fromMemberId.startsWith('sub_'))
          ? fromMemberId
          : `sub_${Date.now()}`,
      name: trimmed,
      email: '',
      phone: '',
      language: prefs.user?.nativeLanguage || 'bg',
      status: 'active',
      plan: 'free',
      presence: 'online',
      source: 'manual',
    }
    updatePrefs((current) => ({
      subscribers: [subscriber, ...current.subscribers],
    }))
    toastPeople(`${trimmed} е в списъка с абонати`)
  }

  const joinRequests = conv?.joinRequests || []

  function ensureLocalRoom(): Conversation | null {
    if (isGuest) return null
    if (conv) return conv
    if (!useBackendRoom) return null
    const stub: Conversation = {
      id: params.id,
      title: remoteRoom?.title || title || 'Room',
      isGroup: true,
      members: [],
      lastMessage: 'Стаята е отворена',
      updatedAt: new Date().toISOString(),
      unread: 0,
      pinned: false,
      muted: false,
      messages: [],
      saveChat: true,
      disappearAfter: 'off',
      sessionOpen: true,
      activeGuestIds: [],
      joinRequests: [],
    }
    updatePrefs((current) => {
      if (current.conversations.some((c) => c.id === stub.id)) return {}
      return { conversations: [stub, ...current.conversations] }
    })
    return stub
  }

  async function inviteSubscriberByDrag(subId: string) {
    const room = ensureLocalRoom()
    if (!room || isGuest) return
    const sub = prefs.subscribers.find((s) => s.id === subId)
    if (!sub) return
    const currentRequests = room.joinRequests || []
    if (currentRequests.some((r) => r.subscriberId === subId && r.status === 'pending')) {
      toastPeople(`${sub.name} вече е поканен/а`)
      return
    }
    if (room.members.some((m) => m.id === subId)) {
      toastPeople(`${sub.name} вече е в стаята`)
      return
    }

    const result = await createServerGuestInvite({
      roomId: room.id,
      roomTitle: room.title || title || 'Guest room',
      label: `Покана · ${sub.name}`,
      channel: 'both',
      prefillName: sub.name,
      prefillLanguage: sub.language,
    })
    if (!result.ok) {
      toastPeople(result.error)
      return
    }
    if (result.roomId && result.roomId !== params.id) {
      updatePrefs((current) => ({
        conversations: current.conversations.map((c) =>
          c.id === (result.migratedFrom || params.id)
            ? { ...c, id: result.roomId, sessionOpen: true, space: 'room' as const }
            : c
        ),
      }))
      router.replace(
        `/room/${result.roomId}?video=${search.get('video') || '0'}`
      )
    }
    const inviteCode = result.code
    updatePrefs((current) => ({
      invites: [
        {
          id: result.inviteId,
          code: result.code,
          conversationId: result.roomId,
          label: result.label,
          channel: 'both' as const,
          prefillName: sub.name,
          prefillLanguage: sub.language,
          createdAt: new Date().toISOString(),
          active: true,
        },
        ...(current.invites || []),
      ],
    }))
    void navigator.clipboard.writeText(result.url)
    setLastInviteUrl(result.url)

    const req: JoinRequest = {
      id: `jr_${Date.now()}`,
      subscriberId: sub.id,
      name: sub.name,
      language: sub.language,
      kind: 'invite',
      status: 'pending',
      inviteCode,
      createdAt: new Date().toISOString(),
    }
    const now = new Date().toISOString()
    const systemMsg = {
      id: `msg_${Date.now()}`,
      fromMe: true as const,
      text: `📩 ${sub.name} е поканен/а — чака да влезе (линкът е копиран)`,
      createdAt: now,
      status: 'sent' as const,
    }
    const roomKey = result.roomId || room.id
    updatePrefs((current) => {
      const exists = current.conversations.some((c) => c.id === roomKey)
      return {
        conversations: exists
          ? current.conversations.map((item) =>
              item.id === roomKey
                ? {
                    ...item,
                    sessionOpen: true,
                    joinRequests: [req, ...(item.joinRequests || [])],
                    lastMessage: `${sub.name} е поканен/а в стаята`,
                    updatedAt: now,
                    messages: [...item.messages, systemMsg],
                  }
                : item
            )
          : [
              {
                ...room,
                id: roomKey,
                sessionOpen: true,
                joinRequests: [req],
                lastMessage: `${sub.name} е поканен/а в стаята`,
                updatedAt: now,
                messages: [systemMsg],
              },
              ...current.conversations,
            ],
      }
    })
    toastPeople(`${sub.name} поканен/а · линкът работи на iPhone`)
  }

  function admitJoinRequest(requestId: string) {
    if (!conv || isGuest) return
    const req = joinRequests.find((r) => r.id === requestId)
    if (!req) return
    const sub = prefs.subscribers.find((s) => s.id === req.subscriberId)
    const member = {
      id: req.subscriberId,
      name: req.name,
      language: req.language,
      presence: sub?.presence || 'online',
      avatarDataUrl: sub?.avatarDataUrl,
    }
    const already = conv.members.some((m) => m.id === req.subscriberId)
    const now = new Date().toISOString()
    patchConv({
      members: already ? conv.members : [...conv.members, member],
      isGroup: true,
      activeGuestIds: Array.from(
        new Set([...(conv.activeGuestIds || []), req.subscriberId])
      ),
      joinRequests: joinRequests.map((r) =>
        r.id === requestId ? { ...r, status: 'accepted' as const } : r
      ),
      lastMessage: `${req.name} влезе в стаята`,
      updatedAt: now,
      messages: [
        ...conv.messages,
        {
          id: `msg_${Date.now()}`,
          fromMe: true,
          text: `✅ ${req.name} влезе в стаята`,
          createdAt: now,
          status: 'sent',
        },
      ],
    })
    toastPeople(`${req.name} е в стаята`)
  }

  function declineJoinRequest(requestId: string) {
    if (!conv || isGuest) return
    const req = joinRequests.find((r) => r.id === requestId)
    if (!req) return
    patchConv({
      joinRequests: joinRequests.map((r) =>
        r.id === requestId ? { ...r, status: 'declined' as const } : r
      ),
      lastMessage: `${req.name} — отказ за вход`,
    })
    toastPeople(`Отказ за ${req.name}`)
  }

  function copyJoinInvite(requestId: string) {
    const req = joinRequests.find((r) => r.id === requestId)
    if (!req?.inviteCode || !conv) return
    const url = `${window.location.origin}/join?invite=${req.inviteCode}&conv=${conv.id}&name=${encodeURIComponent(req.name)}&lang=${req.language}`
    void navigator.clipboard.writeText(url)
    toastPeople('Линкът е копиран')
  }

  /** Host: create shareable guest link (works from another phone/PC). */
  async function shareGuestInvite() {
    if (isGuest || inviteBusy) return
    setInviteBusy(true)
    try {
      const result = await createServerGuestInvite({
        roomId: params.id,
        roomTitle: title || 'Guest room',
        label: `Покана · ${title}`,
        channel: 'both',
      })

      if (!result.ok) {
        toastPeople(result.error)
        return
      }

      // Always keep host on the server room UUID the guest will join
      if (result.roomId && result.roomId !== params.id) {
        const oldId = result.migratedFrom || params.id
        const newId = result.roomId
        updatePrefs((current) => ({
          conversations: current.conversations.map((c) =>
            c.id === oldId
              ? { ...c, id: newId, sessionOpen: true, space: 'room' as const }
              : c
          ),
          invites: (current.invites || []).map((i) =>
            i.conversationId === oldId
              ? { ...i, conversationId: newId }
              : i
          ),
        }))
        router.replace(
          `/room/${newId}?video=${search.get('video') || '0'}`
        )
      } else {
        // Ensure backend session is open for the guest link
        void fetch(`/api/rooms/${result.roomId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ session_open: true }),
        }).catch(() => undefined)
      }

      updatePrefs((current) => ({
        invites: [
          {
            id: result.inviteId,
            code: result.code,
            conversationId: result.roomId,
            label: result.label,
            channel: 'both' as const,
            createdAt: new Date().toISOString(),
            active: true,
          },
          ...(current.invites || []),
        ],
        room: { ...current.room, allowGuests: true },
      }))
      await navigator.clipboard.writeText(result.url).catch(() => undefined)
      setLastInviteUrl(result.url)
      toastPeople('Guest линк готов (ov_…) — работи на iPhone')
    } catch (err) {
      toastPeople(
        err instanceof Error ? err.message : 'Неуспешна покана'
      )
    } finally {
      setInviteBusy(false)
    }
  }

  function onStageDragOver(e: DragEvent) {
    if (
      !dragPeople &&
      !e.dataTransfer.types.includes('text/omnivvoice-subscriber')
    ) {
      return
    }
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDropOverStage(true)
  }

  function onStageDrop(e: DragEvent) {
    e.preventDefault()
    setDropOverStage(false)
    setDragPeople(false)
    const subId = e.dataTransfer.getData('text/omnivvoice-subscriber')
    if (subId) void inviteSubscriberByDrag(subId)
  }

  function goToChatAfterCall() {
    router.push(`/dashboard?chat=${encodeURIComponent(params.id)}`)
  }

  const canBusinessIntel =
    !isGuest &&
    roomWorkspace === 'business' &&
    Boolean(prefs.experience?.callRecap !== false)

  const adsPrefs = prefs.ads || DEFAULT_ADS
  const canBusinessAds =
    !isGuest && roomWorkspace === 'business' && adsPrefs.business.enabled
  const canPodcastAds =
    !isGuest && roomWorkspace === 'podcast' && adsPrefs.podcast.enabled

  const closeActiveAd = useCallback(() => {
    setActiveAd(null)
    setAdSecondsLeft(0)
  }, [])

  const playAd = useCallback(
    (
      creative: AdCreative,
      placement: AdPlacement,
      showCountdown: boolean
    ) => {
      const duration = Math.max(3, creative.durationSec || 8)
      const endsAt = Date.now() + duration * 1000
      setActiveAd({ creative, placement, endsAt, showCountdown })
      setAdSecondsLeft(duration)
      adShownCountRef.current += 1
      adCooldownUntilRef.current = Date.now() + Math.max(30, adsPrefs.business.cooldownSec) * 1000
      if (creative.format === 'audio' && creative.mediaUrl) {
        try {
          const audio = new Audio(creative.mediaUrl)
          void audio.play()
        } catch {
          /* ignore */
        }
      }
    },
    [adsPrefs.business.cooldownSec]
  )

  const triggerPodcastAd = useCallback(() => {
    if (!canPodcastAds || activeAd) return
    const creative = pickNextCreative(
      adsPrefs.podcast.creatives,
      adIndexRef.current++
    )
    if (!creative) return
    if (adsPrefs.podcast.duckMicDuringAd) setMicOn(false)
    playAd(
      { ...creative, format: adsPrefs.podcast.format || creative.format },
      adsPrefs.podcast.placement,
      adsPrefs.podcast.showCountdown !== false
    )
  }, [
    canPodcastAds,
    activeAd,
    adsPrefs.podcast,
    playAd,
  ])

  // Touch speech activity for Business break ads
  useEffect(() => {
    lastSpeechAtRef.current = Date.now()
  }, [peerCaption, translatedText])

  // Business: show ad after silence (почивка)
  useEffect(() => {
    if (!canBusinessAds || activeAd || isGuest) return
    const tick = window.setInterval(() => {
      const biz = adsPrefs.business
      if (adShownCountRef.current >= biz.maxAdsPerCall) return
      if (Date.now() < adCooldownUntilRef.current) return
      if (isTtsSpeaking()) {
        lastSpeechAtRef.current = Date.now()
        return
      }
      const silentFor = (Date.now() - lastSpeechAtRef.current) / 1000
      if (silentFor < biz.breakSilenceSec) return
      const creative = pickNextCreative(biz.creatives, adIndexRef.current++)
      if (!creative) return
      playAd(creative, biz.placement, true)
      lastSpeechAtRef.current = Date.now()
    }, 1500)
    return () => window.clearInterval(tick)
  }, [canBusinessAds, activeAd, isGuest, adsPrefs.business, playAd])

  // Countdown / auto-close active ad
  useEffect(() => {
    if (!activeAd) return
    const tick = window.setInterval(() => {
      const left = Math.ceil((activeAd.endsAt - Date.now()) / 1000)
      setAdSecondsLeft(Math.max(0, left))
      if (left <= 0) closeActiveAd()
    }, 250)
    return () => window.clearInterval(tick)
  }, [activeAd, closeActiveAd])

  function persistIntelToConversation(intel: BusinessIntelData) {
    if (!conv) return
    const convId = conv.id
    const summaryLine = `🧠 AI Intel: ${intel.title} — ${intel.summary.slice(0, 120)}${
      intel.summary.length > 120 ? '…' : ''
    }`
    updatePrefs((current) => ({
      conversations: current.conversations.map((item) =>
        item.id === convId
          ? {
              ...item,
              lastMessage: summaryLine,
              updatedAt: new Date().toISOString(),
              messages: [
                ...item.messages,
                {
                  id: `intel_${Date.now()}`,
                  fromMe: true,
                  text: summaryLine,
                  createdAt: new Date().toISOString(),
                  status: 'sent' as const,
                  kind: 'intel' as const,
                  intelSummary: intel.summary,
                },
              ],
            }
          : item
      ),
      snapPlus: {
        ...current.snapPlus,
        memories: [
          {
            id: `mem_intel_${Date.now()}`,
            kind: 'intel' as const,
            title: intel.title,
            body: formatIntelForClipboard(intel),
            locked: false,
            createdAt: new Date().toISOString(),
            tags: ['business', 'intel', intel.dealTerms.stage || 'deal'],
          },
          ...(current.snapPlus?.memories || []),
        ].slice(0, 80),
      },
    }))
  }

  function openIntelPicker(opts?: { afterHangup?: boolean }) {
    if (!canBusinessIntel) return
    setIntelOpen(true)
    setIntelSelecting(true)
    setIntelLoading(false)
    setIntelError(null)
    setIntelData(null)
    if (opts?.afterHangup) setPendingHangupAfterIntel(true)
  }

  /** After Stop — AI contract from the negotiation (skip picker) */
  function startPostNegotiationContract() {
    if (!canBusinessIntel) return
    setPendingHangupAfterIntel(true)
    const fromPrefs =
      prefs.experience?.businessRoom?.defaultIntelOptions?.length
        ? [...prefs.experience.businessRoom.defaultIntelOptions]
        : []
    const required: BusinessIntelOptionId[] = [
      'summary',
      'agreement',
      'writtenContract',
      'dealTerms',
      'actionItems',
      'nextSteps',
    ]
    const options = Array.from(
      new Set([
        ...required,
        ...fromPrefs.filter((id) =>
          (
            [
              'summary',
              'agreement',
              'writtenContract',
              'actionItems',
              'decisions',
              'nextSteps',
              'objections',
              'dealTerms',
              'keyQuotes',
              'sentiment',
            ] as BusinessIntelOptionId[]
          ).includes(id)
        ),
      ])
    )
    void runBusinessIntel(options)
  }

  async function runBusinessIntel(options: BusinessIntelOptionId[]) {
    if (!canBusinessIntel || !options.length) return
    setIntelOptions(options)
    setIntelSelecting(false)
    setIntelOpen(true)
    setIntelLoading(true)
    setIntelError(null)
    const minutes = Math.max(
      1,
      Math.round((Date.now() - sessionStartedAtRef.current) / 60000)
    )
    const selfName = isGuest
      ? guest?.displayName || 'Guest'
      : user?.displayName || 'Ти'
    const chatMessages = useBackendRoom
      ? remoteMessages.map((m) => ({
          fromMe: m.sender_name === selfName,
          sender_name: m.sender_name,
          body: m.body,
          translated_body: m.translated_body,
          created_at: m.created_at,
        }))
      : (conv?.messages || []).map((m) => ({
          fromMe: m.fromMe,
          text: m.text,
          translatedText: m.translatedText,
          createdAt: m.createdAt,
          kind: m.kind,
        }))
    const { messages, transcript } = collectIntelSources({
      chatMessages,
      transcript: transcriptRef.current,
      youName: selfName,
      peerName: members.find((m) => m.id !== 'you')?.name,
    })
    try {
      const intel = await fetchBusinessIntel({
        messages,
        transcript,
        sourceLang: nativeLang.name,
        targetLang: bridgeTargetLang.name,
        minutes,
        context: conv?.title || remoteRoom?.title || 'OmniVoice business call',
        options,
        contractComposeFrom:
          prefs.experience.businessRoom?.contractComposeFrom,
      })
      setIntelData(intel)
      persistIntelToConversation(intel)
    } catch (err) {
      setIntelError(err instanceof Error ? err.message : 'Intel failed')
    } finally {
      setIntelLoading(false)
    }
  }

  function closeIntelPanel() {
    setIntelOpen(false)
    setIntelSelecting(true)
    if (pendingHangupAfterIntel) {
      setPendingHangupAfterIntel(false)
      goToChatAfterCall()
    }
  }

  /** End media session but keep the conversation as a normal chat */
  async function hangUpToChat() {
    if (isGuest) {
      await leaveRoomSelf()
      return
    }
    if (useBackendRoom) {
      try {
        await endSession()
      } catch (err) {
        toastPeople(
          err instanceof Error ? err.message : 'Неуспешно приключване'
        )
        return
      }
    }
    if (conv) {
      const convId = conv.id
      updatePrefs((current) => ({
        conversations: current.conversations.map((item) =>
          item.id === convId
            ? {
                ...item,
                sessionOpen: false,
                activeGuestIds: [],
                members: item.members.filter(
                  (member) => !member.id.startsWith('guest_')
                ),
                lastMessage: 'Обаждането приключи · чатът остава',
                updatedAt: new Date().toISOString(),
                messages: [
                  ...item.messages,
                  {
                    id: `msg_${Date.now()}`,
                    fromMe: true,
                    text: '📞 Обаждането приключи — продължете в чата',
                    createdAt: new Date().toISOString(),
                    status: 'sent' as const,
                  },
                ],
              }
            : item
        ),
      }))
    }
    if (canBusinessIntel) {
      startPostNegotiationContract()
      return
    }
    goToChatAfterCall()
  }

  async function endAsHost() {
    await hangUpToChat()
  }

  function upgradeToVideo() {
    setCameraOn(true)
    // One getUserMedia per tap — stage locks internally; don't start a second prompt
    void stageRef.current?.armLocalMedia({ wantCamera: true })
    const q = new URLSearchParams(search.toString())
    q.set('video', '1')
    router.replace(`/room/${params.id}?${q.toString()}`, { scroll: false })
    toastPeople('Видео е включено · същата стая')
  }

  function switchToVoiceOnly() {
    setCameraOn(false)
    const q = new URLSearchParams(search.toString())
    q.set('video', '0')
    router.replace(`/room/${params.id}?${q.toString()}`, { scroll: false })
  }

  async function removeParticipant(memberId: string) {
    if (isGuest || memberId === 'you') return
    const person = members.find((m) => m.id === memberId)
    const name = person?.name || 'Участник'

    if (useBackendRoom && isUuid(params.id)) {
      const res = await fetch(`/api/rooms/${params.id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'remove',
          participantId: memberId,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        toastPeople(data.error || 'Премахването не успя')
        return
      }
    }

    if (conv) {
      const now = new Date().toISOString()
      const subId =
        prefs.subscribers.find((s) => s.id === memberId || s.name === name)?.id ||
        memberId
      patchConv({
        members: conv.members.filter((m) => m.id !== memberId && m.id !== subId),
        activeGuestIds: (conv.activeGuestIds || []).filter(
          (id) => id !== memberId && id !== subId
        ),
        joinRequests: (conv.joinRequests || []).map((r) =>
          r.subscriberId === memberId || r.subscriberId === subId
            ? { ...r, status: 'declined' as const }
            : r
        ),
        lastMessage: `${name} е премахнат/а от стаята`,
        updatedAt: now,
        messages: [
          ...conv.messages,
          {
            id: `msg_${Date.now()}`,
            fromMe: true,
            text: `🚪 ${name} е премахнат/а от стаята`,
            createdAt: now,
            status: 'sent',
          },
        ],
      })
    }
    setMemberMenu(null)
    toastPeople(`${name} е премахнат/а`)
  }

  function memberContextItems(memberId: string): ContextMenuItem[] {
    if (memberId === 'you') {
      return [
        {
          id: 'leave-self',
          label: 'Напусни стаята',
          icon: LogOut,
          danger: true,
          onClick: () => void leaveRoomSelf(),
        },
      ]
    }
    const pending = (conv?.joinRequests || []).find(
      (r) => r.subscriberId === memberId && r.status === 'pending'
    )
    if (pending) {
      return [
        {
          id: 'admit',
          label: 'Приеми в стаята',
          icon: Check,
          onClick: () => admitJoinRequest(pending.id),
        },
        {
          id: 'cancel-invite',
          label: 'Отмени поканата',
          icon: X,
          danger: true,
          onClick: () => declineJoinRequest(pending.id),
        },
      ]
    }
    const person = members.find((m) => m.id === memberId)
    const alreadySub = prefs.subscribers.some(
      (s) =>
        s.id === memberId ||
        (person &&
          s.name.trim().toLowerCase() === person.name.trim().toLowerCase())
    )
    const items: ContextMenuItem[] = []
    if (person && !alreadySub) {
      items.push({
        id: 'add-sub',
        label: 'Добави в абонати (безплатно)',
        icon: UserPlus,
        onClick: () => addToSubscribers(person.name, memberId),
      })
    }
    items.push(
      {
        id: 'remove',
        label: 'Премахни от стаята',
        icon: UserMinus,
        danger: true,
        onClick: () => void removeParticipant(memberId),
      },
      {
        id: 'kick',
        label: 'Изгони (kick)',
        icon: Trash2,
        danger: true,
        onClick: () => void removeParticipant(memberId),
      }
    )
    return items
  }

  async function leaveRoomSelf() {
    try {
      if (isGuest) {
        if (useBackendRoom && guest?.guestId) {
          await fetch(`/api/rooms/${params.id}/participants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'leave',
              guestId: guest.guestId,
            }),
          }).catch(() => undefined)
        }
        if (!useBackendRoom && conv && guest) {
          const convId = conv.id
          const guestId = guest.guestId
          const guestName = guest.displayName
          updatePrefs((current) => ({
            conversations: current.conversations.map((item) =>
              item.id === convId
                ? {
                    ...item,
                    activeGuestIds: (item.activeGuestIds || []).filter(
                      (id) => id !== guestId
                    ),
                    members: item.members.filter((m) => m.id !== guestId),
                    lastMessage: `${guestName} напусна`,
                    messages: [
                      ...item.messages,
                      {
                        id: `msg_${Date.now()}`,
                        fromMe: false,
                        text: `👋 ${guestName} напусна стаята`,
                        createdAt: new Date().toISOString(),
                        status: 'delivered' as const,
                      },
                    ],
                  }
                : item
            ),
          }))
        }
        clearGuestSession()
        router.push('/')
        return
      }

      // Non-host authenticated leave (if somehow co-host/member)
      if (useBackendRoom && isUuid(params.id)) {
        const res = await fetch(`/api/rooms/${params.id}/participants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action: 'leave' }),
        })
        if (!res.ok) {
          toastPeople('Като хост ползвай „Приключи“')
          return
        }
      }
      // Back to the same conversation/chat after leaving live/video
      router.push(`/dashboard?chat=${encodeURIComponent(params.id)}`)
    } catch (err) {
      toastPeople(
        err instanceof Error ? err.message : 'Напускането не успя'
      )
    }
  }

  async function sendRichChat(partial: {
    text: string
    kind?:
      | 'gif'
      | 'sticker'
      | 'image'
      | 'voice'
      | 'poll'
      | 'deal'
      | 'clip'
      | 'intel'
      | 'gift'
    mediaUrl?: string
    caption?: string
    giftId?: string
    voiceDurationSec?: number
    poll?: {
      question: string
      options: { id: string; label: string; votes: number }[]
      votedOptionId?: string
    }
    deal?: { title: string; value: string; stage: string }
    clip?: { label: string; atSec: number }
    replyPreview?: string
  }) {
    const text = partial.text.trim()
    if (!text && !partial.mediaUrl && !partial.poll) return
    setReplyPreview(null)
    setChatDraft('')

    if (useBackendRoom) {
      const richId = `local_${Date.now()}`
      const optimistic = {
        id: richId,
        fromMe: true,
        createdAt: new Date().toISOString(),
        ...partial,
        text,
      }
      setLocalRich((prev) => [...prev, optimistic])
      try {
        await sendMessage({
          text: partial.caption
            ? `${text} · ${partial.caption}`
            : partial.kind
              ? `[${partial.kind}] ${text}`
              : text,
          guestId: guest?.guestId,
          guestName: guest?.displayName,
        })
      } catch (err) {
        setLocalRich((prev) => prev.filter((m) => m.id !== richId))
        toastPeople(
          err instanceof Error ? err.message : 'Съобщението не се изпрати'
        )
      }
      return
    }
    if (!conv) return
    const msg = {
      id: `m_${Date.now()}`,
      fromMe: !isGuest,
      createdAt: new Date().toISOString(),
      status: 'sent' as const,
      ...partial,
      text,
    }
    patchConv({
      messages: [...(conv.messages || []), msg],
      lastMessage: text,
      updatedAt: new Date().toISOString(),
    })
  }

  const guestSessionOk =
    isGuest &&
    Boolean(guest?.guestId || guestIdFromUrl) &&
    (guest?.conversationId === params.id || Boolean(guestIdFromUrl))

  const missingLocal = !useBackendRoom && !conv && hydrated && !guestSessionOk
  const backendFailed =
    useBackendRoom && !roomLoading && !remoteRoom && remoteWaitDone
  // Guests who just joined must not be blocked if the first poll is slow
  const missingRemote = backendFailed && !conv && !guestSessionOk
  // LiveKit once backend room is known; guests can still preview camera locally
  const enableLiveKit = Boolean(
    useBackendRoom && (remoteRoom || guestSessionOk)
  )

  // Only block the whole page when we have nothing local to show yet
  if (
    useBackendRoom &&
    roomLoading &&
    !remoteRoom &&
    !remoteWaitDone &&
    !conv
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">
        Зареждане на стаята…
      </div>
    )
  }

  if (missingLocal || missingRemote) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-[var(--muted)]">Разговорът не е намерен.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="ov-btn-ghost"
            onClick={() => window.location.reload()}
          >
            Опитай пак
          </button>
          <Link href={isGuest ? '/join' : '/dashboard'} className="ov-btn-primary">
            Назад
          </Link>
        </div>
      </div>
    )
  }

  if (kicked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Хостът приключи разговора
        </p>
        <p className="text-sm text-[var(--muted)]">
          Гостовият достъп е спрян. Благодарим, че участва!
        </p>
      </div>
    )
  }

  const youName = isGuest
    ? guest?.displayName || 'Guest'
    : user?.displayName || 'Ти'

  const localMessages = conv?.messages || []

  return (
    <div className="flex min-h-screen flex-col px-4 py-4">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
        {isGuest ? (
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
            Guest · само участие
          </span>
        ) : (
          <Link href="/dashboard" className="ov-btn-ghost !px-3 !py-1.5 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Дашборд
          </Link>
        )}
        <div className="text-center">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-[11px] text-[var(--muted)]">
            {useBackendRoom ? 'Realtime · ' : 'Локално · '}
            {listening ? 'listening' : 'ready'}
            {members.filter((m) => m.guest).length
              ? ` · ${members.filter((m) => m.guest).length} гости`
              : ''}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <label className="inline-flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
              Чувам на
              <select
                className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--foreground)]"
                value={nativeLang.code}
                title="Само на този език чуваш отсреща (VoiceBridge)"
                onChange={(e) => {
                  const code = e.target.value
                  setSpeakLangCode(code)
                  if (isGuest && guest) {
                    saveGuestSession({ ...guest, language: code })
                  }
                  unlockSpeechSynthesis()
                  unlockMediaPlayback()
                  setTtsUnlocked(false)
                }}
              >
                {APP_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.nativeName}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
              Глас
              <select
                className="max-w-[12rem] rounded-lg border border-[var(--panel-border)] bg-[var(--panel)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--foreground)]"
                value={prefs.voice.voicePreset || ''}
                title="Избери глас: 3 женски, 3 мъжки, 2 детски"
                onChange={(e) => {
                  const presetId = e.target.value as VoicePresetId | ''
                  showCoach('voice')
                  unlockSpeechSynthesis()
                  unlockMediaPlayback()
                  const resolved = presetId
                    ? resolveVoicePreset(
                        presetId,
                        nativeLang.code,
                        voiceList.length ? voiceList : voicesForMyLang
                      )
                    : null
                  updatePrefs({
                    voice: {
                      ...prefs.voice,
                      voicePreset: presetId,
                      voiceURI: resolved?.voiceURI || '',
                      pitch: resolved?.pitch ?? 1,
                      rate: resolved?.rate ?? 1,
                    },
                  })
                  if (presetId) {
                    const sample =
                      nativeLang.code === 'bg'
                        ? 'Здравей, това е избраният глас.'
                        : nativeLang.code === 'en'
                          ? 'Hello, this is the selected voice.'
                          : 'OK'
                    unlockMediaPlayback()
                    speakVoicePresetSample(
                      presetId,
                      sample,
                      nativeLang.speechCode
                    )
                    const label =
                      VOICE_PRESETS.find((p) => p.id === presetId)?.labelBg ||
                      presetId
                    toastPeople(`Проба глас: ${label}`)
                  } else {
                    stopSpeaking()
                  }
                }}
              >
                <option value="">Авто</option>
                <optgroup label="Женски">
                  {VOICE_PRESETS.filter((p) => p.gender === 'female').map(
                    (p) => (
                      <option key={p.id} value={p.id}>
                        {p.labelBg}
                      </option>
                    )
                  )}
                </optgroup>
                <optgroup label="Мъжки">
                  {VOICE_PRESETS.filter((p) => p.gender === 'male').map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.labelBg}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Детски">
                  {VOICE_PRESETS.filter((p) => p.gender === 'child').map(
                    (p) => (
                      <option key={p.id} value={p.id}>
                        {p.labelBg}
                      </option>
                    )
                  )}
                </optgroup>
              </select>
            </label>
          </div>
        </div>
        {!isGuest ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="ov-btn-ghost !px-2.5 !py-1.5 text-[11px]"
              disabled={inviteBusy}
              title="Копирай линк за гост"
              onClick={() => {
                showCoach('invite')
                void shareGuestInvite()
              }}
            >
              <Link2 className="h-3.5 w-3.5" />
              {inviteBusy ? '…' : 'Покани'}
            </button>
            <button
              type="button"
              className="ov-icon-btn"
              onClick={() => {
                showCoach('settings')
                setSettingsOpen(true)
              }}
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <span className="w-9" />
        )}
      </header>

      {!isGuest && lastInviteUrl ? (
        <div className="mx-auto mt-3 flex w-full max-w-6xl flex-col gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2.5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-emerald-200">
              Guest линк (ov_…) — прати го на iPhone; гостът попълва име → Влез
            </p>
            <p className="mt-0.5 truncate font-mono text-[10px] text-white/70">
              {lastInviteUrl}
            </p>
            {!lastInviteUrl.includes('invite=ov_') ? (
              <p className="mt-1 text-[10px] text-amber-200">
                Внимание: линкът не е сървърен. Натисни Покани отново докато си
                вписан/а.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="rounded-xl bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-black"
              onClick={() => {
                void navigator.clipboard
                  .writeText(lastInviteUrl)
                  .catch(() => undefined)
                toastPeople('Линкът е копиран')
              }}
            >
              Копирай
            </button>
            <a
              href={lastInviteUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-white/15 px-3 py-1.5 text-[11px] font-semibold text-white"
            >
              Тест: влез като гост
            </a>
          </div>
        </div>
      ) : null}

      {!isGuest && !useBackendRoom && conv ? (
        <div className="mx-auto mt-3 flex w-full max-w-6xl flex-wrap gap-2">
          <label className="inline-flex items-center gap-2 rounded-full bg-[var(--chip)] px-3 py-1.5 text-[11px]">
            <input
              type="checkbox"
              checked={conv.saveChat}
              onChange={(e) => patchConv({ saveChat: e.target.checked })}
            />
            Запази чата след разговора
          </label>
          <select
            className="ov-field !w-auto !py-1.5 text-[11px]"
            value={conv.disappearAfter}
            onChange={(e) =>
              patchConv({
                disappearAfter: e.target.value as Conversation['disappearAfter'],
              })
            }
          >
            <option value="off">Чатът остава</option>
            <option value="1h">Изтрий след 1 час</option>
            <option value="24h">Изтрий след 24 часа</option>
            <option value="7d">Изтрий след 7 дни</option>
          </select>
        </div>
      ) : (
        <p className="mx-auto mt-3 w-full max-w-6xl text-xs text-[var(--muted)]">
          {isGuest
            ? 'Гост режим: чат/обаждане с превод. Без админ права.'
            : 'Сървърна стая — гостите се синхронизират в реално време.'}
        </p>
      )}

      <div className="mx-auto mt-4 flex w-full max-w-7xl flex-col gap-3 lg:flex-row lg:items-start">
        {!isGuest && !showBroadcastUi ? (
          <RoomPeopleDock
            subscribers={prefs.subscribers}
            members={members}
            joinRequests={joinRequests}
            dropActive={dragPeople}
            onDropSubscriber={(id) => void inviteSubscriberByDrag(id)}
            onAdmit={admitJoinRequest}
            onDecline={declineJoinRequest}
            onCopyInvite={copyJoinInvite}
            onInviteGuest={() => void shareGuestInvite()}
            inviteBusy={inviteBusy}
            onAddSubscriber={addToSubscribers}
            onRemoveMember={(id) => void removeParticipant(id)}
            onMemberContextMenu={(memberId, e) =>
              setMemberMenu({ x: e.clientX, y: e.clientY, memberId })
            }
            onDragActiveChange={setDragPeople}
          />
        ) : null}

        <main
          className={`ov-stage relative flex min-w-0 flex-1 flex-col gap-3 rounded-[32px] border p-4 transition ${
            dropOverStage
              ? 'border-[var(--accent)] bg-[var(--accent)]/10 ring-2 ring-[var(--accent)]/50'
              : 'border-[var(--panel-border)]'
          }`}
          onDragOver={isGuest ? undefined : onStageDragOver}
          onDragLeave={() => setDropOverStage(false)}
          onDrop={isGuest ? undefined : onStageDrop}
        >
          {dropOverStage ? (
            <div className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-3xl border-2 border-dashed border-[var(--accent)] bg-black/50 text-sm font-semibold text-[var(--accent)]">
              Пусни абоната тук — покана за вход в стаята
            </div>
          ) : null}

          {showStudioModeToggle ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-full bg-black/5 p-0.5 dark:bg-white/10">
                <button
                  type="button"
                  onClick={() =>
                    updatePrefs((current) => ({
                      podcast: {
                        ...current.podcast,
                        sessionMode: 'podcast',
                      },
                    }))
                  }
                  className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                    !isStreamingMode
                      ? 'bg-rose-500 text-white'
                      : 'text-[var(--muted)]'
                  }`}
                >
                  Podcast стая
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updatePrefs((current) => ({
                      podcast: {
                        ...current.podcast,
                        sessionMode: 'streaming',
                      },
                      room: {
                        ...current.room,
                        cutoutMode: 'contour',
                      },
                    }))
                  }}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                    isStreamingMode
                      ? 'bg-violet-500 text-white'
                      : 'text-[var(--muted)]'
                  }`}
                >
                  Streaming
                </button>
              </div>
              {isStreamingMode ? (
                <span className="text-[10px] text-[var(--muted)]">
                  Сериал / филм / игра fullscreen · ти си PiP cutout ·
                  интерактивни субтитри
                </span>
              ) : null}
            </div>
          ) : null}

          {!isGuest && roomWorkspace === 'business' ? (
            <BusinessOverlay
              visible
              salesAssistOn={salesAssistOn}
              prompt="Попитай за budget и decision maker. Предложи VoiceBridge демо."
              sentiment={0.68}
              battleCards={[
                'Конкурентът няма live dual-track превод',
                'ROI: по-бърз international close',
                'Пилот 14 дни',
              ]}
              crmStatus={{ salesforce: 'synced', hubspot: 'syncing' }}
            />
          ) : null}
          {!isGuest && !isStreamingMode && showStudioModeToggle ? (
            <PodcastOverlay
              visible
              obsLive={obsLive}
              shortQueued={shortQueued}
              showTitle={conv?.title || remoteRoom?.title || 'Live show'}
              layout={prefs.podcast.layout}
              resolution={prefs.podcast.resolution}
              connectedPlatforms={connectedPlatforms}
              multistream={prefs.podcast.multistream}
              onToggleObs={() => {
                showCoach('go_live')
                setObsLive((v) => !v)
              }}
              onCaptureShort={() => {
                setShortQueued(true)
                toastPeople('9:16 short + VoiceBridge captions')
                window.setTimeout(() => setShortQueued(false), 3500)
              }}
            />
          ) : null}

        <div className="relative">
          {isStreamingMode && streamPrefs ? (
            <StreamingOverlay
              visible
              live={obsLive || Boolean(enableLiveKit)}
              settings={streamPrefs}
              showTitle={conv?.title || remoteRoom?.title || 'Live stream'}
              viewers={Math.max(0, members.length - 1)}
              lastAlert={streamAlert}
              onSceneChange={(scene: StreamSceneId) => {
                updatePrefs((current) => ({
                  podcast: {
                    ...current.podcast,
                    streaming: {
                      ...current.podcast.streaming,
                      scene,
                      contentHint: contentHintForScene(scene),
                    },
                  },
                }))
                if (
                  scene === 'gaming' ||
                  scene === 'movies' ||
                  scene === 'series' ||
                  scene === 'watch_party' ||
                  scene === 'sports'
                ) {
                  setScreenShare(true)
                  toastPeople('Включи Share за контента · ти си PiP')
                }
              }}
              adBreakEnabled={
                canPodcastAds && adsPrefs.podcast.manualTrigger !== false
              }
              onProducerAction={(action) => {
                if (action === 'shield') {
                  updatePrefs((current) => ({
                    podcast: {
                      ...current.podcast,
                      streaming: {
                        ...current.podcast.streaming,
                        shieldMode: !current.podcast.streaming.shieldMode,
                      },
                    },
                  }))
                  toastPeople(
                    streamPrefs?.shieldMode
                      ? 'Shield mode OFF'
                      : 'Shield mode ON'
                  )
                  return
                }
                if (action === 'ad_break') {
                  triggerPodcastAd()
                  setStreamAlert('Спонсорска реклама')
                  window.setTimeout(() => setStreamAlert(null), 2400)
                  return
                }
                const labels: Record<string, string> = {
                  raid: 'Raid outgoing…',
                  poll: 'Live poll стартирана',
                  prediction: 'Prediction отворена',
                  clip: '9:16 clip + VoiceBridge captions',
                  marker: 'Stream marker записан',
                  shoutout: 'Shoutout изпратен',
                  hype: 'Hype train charging…',
                  moment: 'AI Moment маркиран',
                }
                setStreamAlert(labels[action] || action)
                if (action === 'clip') {
                  setShortQueued(true)
                  window.setTimeout(() => setShortQueued(false), 3500)
                }
                window.setTimeout(() => setStreamAlert(null), 2400)
                toastPeople(labels[action] || action)
              }}
              onPipFlip={() => {
                const order: PipCorner[] = ['br', 'bl', 'tl', 'tr']
                const cur = streamPrefs.pipCorner
                const next = order[(order.indexOf(cur) + 1) % order.length]
                updatePrefs((current) => ({
                  podcast: {
                    ...current.podcast,
                    streaming: {
                      ...current.podcast.streaming,
                      pipCorner: next,
                    },
                  },
                }))
              }}
              onToggleCaptions={() =>
                updatePrefs((current) => ({
                  podcast: {
                    ...current.podcast,
                    streaming: {
                      ...current.podcast.streaming,
                      interactiveCaptions:
                        !current.podcast.streaming.interactiveCaptions,
                    },
                  },
                }))
              }
              onReaction={(emoji) => {
                burstPipReaction(emoji)
                setStreamAlert(`${emoji} reaction wave`)
                window.setTimeout(() => setStreamAlert(null), 2200)
              }}
            />
          ) : null}

          {isStreamingMode &&
          streamPrefs?.watchTogetherLive &&
          isWatchTogetherScene(streamPrefs.scene) ? (
            <WatchTogetherDock
              visible
              category={streamPrefs.watchTogetherCategory || 'series'}
              live={obsLive || Boolean(enableLiveKit)}
              viewers={Math.max(0, members.length - 1)}
              hostControls={streamPrefs.watchTogetherHostControls}
              onCategoryChange={(category: WatchTogetherCategory) => {
                const scene: StreamSceneId =
                  category === 'football'
                    ? 'football'
                    : category === 'sports'
                      ? 'sports'
                      : category === 'movies'
                        ? 'movies'
                        : category === 'series' || category === 'anime'
                          ? 'series'
                          : 'watch_party'
                updatePrefs((current) => ({
                  podcast: {
                    ...current.podcast,
                    streaming: {
                      ...current.podcast.streaming,
                      watchTogetherCategory: category,
                      scene,
                      contentHint: contentHintForScene(scene),
                    },
                  },
                }))
                setScreenShare(true)
              }}
              onSyncNudge={(action) => {
                const labels = {
                  play: 'Sync PLAY · всички заедно',
                  pause: 'Sync PAUSE',
                  resync: 'Resync playhead',
                }
                setStreamAlert(labels[action])
                window.setTimeout(() => setStreamAlert(null), 2000)
                toastPeople(labels[action])
              }}
              onReaction={(emoji) => {
                burstPipReaction(emoji)
                setStreamAlert(`${emoji} watch reaction`)
                window.setTimeout(() => setStreamAlert(null), 1800)
              }}
            />
          ) : null}

          <LiveKitStage
            ref={stageRef}
            roomId={params.id}
            displayName={youName}
            guestId={guest?.guestId || guestIdFromUrl || undefined}
            language={nativeLang.code}
            micOn={micOn}
            cameraOn={cameraOn}
            screenShare={screenShare}
            enableLiveKit={enableLiveKit}
            speakerOn={speakerOn}
            audioOnly={audioOnly}
            stageLayout={
              isStreamingMode
                ? 'content-pip'
                : conv?.roomKind === 'meeting' ||
                    roomWorkspace === 'business'
                  ? 'conference'
                  : 'grid'
            }
            pipCorner={streamPrefs?.pipCorner || 'br'}
            contentHint={streamPrefs?.contentHint || 'screenshare'}
            silhouetteReactions={isStreamingMode ? pipReactions : []}
            // Duck OFF until startAudio + VoiceBridge are solid — permanent
            // mute caused "no sound at all". TTS still speaks BG on top.
            duckRawRemoteMic={false}
            silencePublishedMic={false}
            onVoiceBridge={onVoiceBridgePacket}
            onRemoteLanguages={onRemoteLanguages}
            onMicReady={() => {
              setMicReady(true)
              void stageRef.current?.unlockRemoteAudio?.()
            }}
            studioRoomId={stageStudioId}
            customBackground={stageCustomBg}
            customStudioRooms={stageCustomRooms}
            videoFilter={prefs.room.videoFilter}
            videoQuality={prefs.room.videoQuality}
            myFaceEnabled={stageMyFaceEnabled}
            myFaceLook={stageMyFaceLook}
            mirrorVideo={stageMirror}
            cutout={stageCutout}
            broadcastOverlays={
              showBroadcastUi && !audioOnly && !isStreamingMode
            }
            lowerThird={
              roomWorkspace === 'business'
                ? 'LIVE · Meeting'
                : isStreamingMode
                  ? 'LIVE · STREAM'
                  : 'LIVE · Q&A'
            }
            noiseSuppression={prefs.room.noiseSuppression}
            echoCancellation={prefs.room.echoCancellation}
            autoGainControl={prefs.room.autoGainControl}
            audioBitrateKbps={
              (prefs.podcast.audioBitrateKbps >= 128
                ? prefs.podcast.audioBitrateKbps
                : 128) as 128 | 192 | 256 | 320
            }
            frameRate={prefs.room.frameRate}
          />

          {activeAd ? (
            <AdOverlay
              creative={activeAd.creative}
              placement={activeAd.placement}
              secondsLeft={adSecondsLeft}
              showCountdown={activeAd.showCountdown}
              onSkip={
                roomWorkspace === 'podcast' ? closeActiveAd : undefined
              }
              onClose={closeActiveAd}
            />
          ) : null}

          {isStreamingMode &&
          streamPrefs?.interactiveCaptions &&
          (interimText || sourceText || translatedText) ? (
            <InteractiveCaptions
              sourceText={interimText || sourceText}
              translatedText={translatedText}
              sourceFlag={nativeLang.flag}
              targetFlag={bridgeTargetLang.flag}
              style={streamPrefs.captionStyle}
              dualLang={streamPrefs.dualLangCaptions}
              viewerLangPicker={streamPrefs.viewerLangPicker}
              viewerLang={viewerCaptionLang}
              onViewerLangChange={setViewerCaptionLang}
              onStyleChange={(style) =>
                updatePrefs((current) => ({
                  podcast: {
                    ...current.podcast,
                    streaming: {
                      ...current.podcast.streaming,
                      captionStyle: style,
                    },
                  },
                }))
              }
            />
          ) : null}
        </div>

        {members.length > 1 ||
        (conv?.joinRequests || []).some((r) => r.status === 'pending') ? (
          <div className="flex flex-wrap gap-2">
            {members
              .filter((p) => p.id !== 'you')
              .map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-left text-xs text-white"
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setMemberMenu({
                      x: e.clientX,
                      y: e.clientY,
                      memberId: person.id,
                    })
                  }}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold">
                    {person.name.slice(0, 1)}
                  </span>
                  {person.name}
                  {person.guest ? (
                    <span className="text-[10px] text-amber-200">Guest</span>
                  ) : null}
                </button>
              ))}
            {(conv?.joinRequests || [])
              .filter((r) => r.status === 'pending')
              .map((req) => (
                <button
                  key={req.id}
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-dashed border-sky-300/40 bg-sky-500/15 px-3 py-1.5 text-xs text-sky-100"
                  onContextMenu={(e) => {
                    e.preventDefault()
                    if (isGuest) return
                    setMemberMenu({
                      x: e.clientX,
                      y: e.clientY,
                      memberId: req.subscriberId,
                    })
                  }}
                >
                  {req.name} · {req.kind === 'knock' ? 'чука' : 'поканен'}
                </button>
              ))}
          </div>
        ) : null}

        {!showBroadcastUi ? (
          <div className="relative rounded-2xl border border-white/10 bg-black/40 p-3">
            <div className="mb-2 max-h-40 space-y-2 overflow-y-auto">
              {useBackendRoom
                ? [
                    ...remoteMessages.slice(-20).map((msg) => ({
                      id: msg.id,
                      fromMe: msg.sender_name === youName,
                      text: msg.body,
                      createdAt: msg.created_at || new Date().toISOString(),
                    })),
                    ...localRich.filter((m) => m.kind),
                  ].map((msg) => (
                    <RichMessageBubble
                      key={msg.id}
                      msg={msg}
                      enableReactions
                      onReply={(_id, preview) => setReplyPreview(preview)}
                      onReact={(messageId, emoji) => {
                        setLocalRich((prev) =>
                          prev.map((m) => {
                            if (m.id !== messageId) return m
                            const reactions = { ...(m.reactions || {}) }
                            reactions[emoji] = (reactions[emoji] || 0) + 1
                            return { ...m, reactions }
                          })
                        )
                      }}
                    />
                  ))
                : localMessages.slice(-30).map((msg) => (
                    <RichMessageBubble
                      key={msg.id}
                      msg={msg}
                      enableReactions
                      onReply={(_id, preview) => setReplyPreview(preview)}
                      onReact={(messageId, emoji) => {
                        if (!conv) return
                        patchConv({
                          messages: conv.messages.map((m) => {
                            if (m.id !== messageId) return m
                            const reactions = { ...(m.reactions || {}) }
                            reactions[emoji] = (reactions[emoji] || 0) + 1
                            return { ...m, reactions }
                          }),
                        })
                      }}
                      onVote={(messageId, optionId) => {
                        if (!conv) return
                        patchConv({
                          messages: conv.messages.map((m) => {
                            if (
                              m.id !== messageId ||
                              !m.poll ||
                              m.poll.votedOptionId
                            )
                              return m
                            return {
                              ...m,
                              poll: {
                                ...m.poll,
                                votedOptionId: optionId,
                                options: m.poll.options.map((o) =>
                                  o.id === optionId
                                    ? { ...o, votes: o.votes + 1 }
                                    : o
                                ),
                              },
                            }
                          }),
                        })
                      }}
                    />
                  ))}
            </div>
            <ChatComposer
              draft={chatDraft}
              onDraftChange={setChatDraft}
              replyPreview={replyPreview}
              onClearReply={() => setReplyPreview(null)}
              peerLanguage={peerLangCode || bridgeTargetLang.code}
              showDeal={!isGuest}
              showClip={!isGuest}
              placeholder="Съобщение, GIF, глас…"
              onSend={(partial) => void sendRichChat(partial)}
            />
          </div>
        ) : null}

        {translationOn && !ttsUnlocked && micReady ? (
          <button
            type="button"
            className="w-full rounded-xl bg-[var(--accent)] px-3 py-3 text-sm font-semibold text-[var(--accent-ink)]"
            onClick={() => {
              unlockMediaPlayback()
              unlockSpeechSynthesis()
              void stageRef.current?.unlockRemoteAudio?.()
              void speakText(
                nativeLang.code === 'bg'
                  ? 'Готово. Ще чуваш превод на български.'
                  : nativeLang.code === 'en'
                    ? 'Ready. You will hear English.'
                    : 'OK',
                { lang: nativeLang.speechCode }
              )
              setTtsUnlocked(true)
            }}
          >
            Докосни за звук + превод ({nativeLang.flag} {nativeLang.nativeName})
          </button>
        ) : null}

        {subtitlesOn && translationOn ? (
          <div className="space-y-1.5">
            <p className="text-[10px] text-white/55">
              Концепция: всеки чува само своя език · Ти чуваш{' '}
              {nativeLang.flag} {nativeLang.nativeName}
              {peerKnown
                ? ` · отсреща говори ${bridgeTargetLang.flag}`
                : ''}
            </p>
            {peerCaption ? (
              <>
                <div className="rounded-xl border border-white/15 bg-black/55 px-3 py-2 text-sm text-white backdrop-blur">
                  {bridgeTargetLang.flag} · {peerCaption.source}
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-sky-300">
                    отсреща
                  </span>
                </div>
                <div className="rounded-xl border border-[var(--accent)]/40 bg-black/70 px-3 py-2.5 text-sm font-medium text-[var(--accent)] backdrop-blur">
                  {nativeLang.flag} · {peerCaption.translated}
                  <span className="ml-2 text-[10px] font-normal uppercase tracking-wide text-white/50">
                    към теб
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-white/15 bg-black/55 px-3 py-2 text-sm text-white backdrop-blur">
                  {nativeLang.flag} ·{' '}
                  {interimText || sourceText || 'Говори в микрофона…'}
                  {listening ? (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-emerald-300">
                      listening
                    </span>
                  ) : null}
                </div>
                <div className="rounded-xl border border-[var(--accent)]/40 bg-black/70 px-3 py-2.5 text-sm font-medium text-[var(--accent)] backdrop-blur">
                  {bridgeTargetLang.flag} ·{' '}
                  {translateError
                    ? `Грешка: ${translateError}`
                    : translatedText ||
                      (translating
                        ? `Превод към ${bridgeTargetLang.nativeName}…`
                        : peerKnown
                          ? `Превод към ${bridgeTargetLang.nativeName} (за отсреща)…`
                          : 'Чака се езикът на отсреща…')}
                  <span className="ml-2 text-[10px] font-normal uppercase tracking-wide text-white/50">
                    за отсреща · не се чува при теб
                  </span>
                </div>
              </>
            )}
          </div>
        ) : null}

        <div className="relative flex justify-center pb-2">
          {coachTrigger ? (
            <CoachBubble
              key={`${coachTrigger}-${coachTick}`}
              id={coachTrigger}
              trigger
              forceOnTrigger
              className="bottom-full left-1/2 mb-2 -translate-x-1/2"
              onClose={() => setCoachTrigger(null)}
            />
          ) : null}
          <div className="relative flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/15 bg-black/70 px-3 py-2.5 backdrop-blur-xl">
            <Ctrl
              active={micOn}
              label="Mic"
              onClick={() => {
                showCoach('mic')
                setMicOn((v) => !v)
              }}
              icon={micOn ? Mic : MicOff}
            />
            <Ctrl
              active={speakerOn}
              label="Говорител"
              onClick={() => {
                setSpeakerOn((v) => {
                  if (v) stopSpeaking()
                  else void stageRef.current?.unlockRemoteAudio?.()
                  return !v
                })
              }}
              icon={speakerOn ? Volume2 : VolumeX}
            />
            {audioOnly ? (
              <button
                type="button"
                onClick={() => {
                  showCoach('camera')
                  upgradeToVideo()
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-[11px] font-semibold text-black"
                title="Включи видео в същата стая"
              >
                <Video className="h-3.5 w-3.5" />
                Видео
              </button>
            ) : (
              <>
                <Ctrl
                  active={cameraOn}
                  label="Cam"
                  onClick={() => {
                    showCoach('camera')
                    if (cameraOn) switchToVoiceOnly()
                    else upgradeToVideo()
                  }}
                  icon={cameraOn ? Camera : CameraOff}
                />
                <Ctrl
                  active={translationOn}
                  label={translationOn ? 'Превод' : 'Спрян'}
                  onClick={() => {
                    showCoach('translate')
                    setTranslationOn((v) => {
                      if (v) {
                        stopSpeaking()
                        setPeerCaption(null)
                      }
                      return !v
                    })
                  }}
                  icon={Sparkles}
                />
                <Ctrl
                  active={subtitlesOn}
                  label="Subs"
                  onClick={() => setSubtitlesOn((v) => !v)}
                  icon={Subtitles}
                />
                <button
                  type="button"
                  title="Цикъл: Банер+ → Замъглен → Овал → Истинска стая"
                  onClick={() => {
                    const next = nextCutout(stageCutout)
                    patchStage({
                      cutoutMode: next,
                      virtualBackground: next !== 'real',
                      backgroundBlur: next === 'blur',
                    })
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-medium ring-1 ${
                    stageCutout === 'real'
                      ? 'bg-emerald-500/30 text-white ring-emerald-300/40'
                      : 'bg-indigo-500/35 text-white ring-indigo-300/40'
                  }`}
                >
                  {cutoutLabelBg(stageCutout)}
                </button>
                <Ctrl
                  active={studioOpen}
                  label="Фон"
                  onClick={() => setStudioOpen(true)}
                  icon={ImageIcon}
                />
                {useBackendRoom ? (
                  <button
                    type="button"
                    onClick={() => setScreenShare((v) => !v)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-medium ring-1 ${
                      screenShare
                        ? 'bg-emerald-500/30 text-white ring-emerald-300/40'
                        : 'bg-white/10 text-white ring-white/15'
                    }`}
                  >
                    Share
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setFiltersOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-2.5 py-2 text-[11px] font-medium text-white ring-1 ring-white/15"
                >
                  Филтри / HD
                </button>
              </>
            )}
            {audioOnly ? (
              <Ctrl
                active={translationOn}
                label={translationOn ? 'Превод' : 'Спрян'}
                onClick={() => {
                  showCoach('translate')
                  setTranslationOn((v) => {
                    if (v) {
                      stopSpeaking()
                      setPeerCaption(null)
                    }
                    return !v
                  })
                }}
                icon={Sparkles}
              />
            ) : null}
            {canBusinessIntel ? (
              <button
                type="button"
                onClick={() => {
                  showCoach('ai_intel')
                  openIntelPicker()
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/90 px-2.5 py-2 text-[11px] font-semibold text-black"
                title="Избери AI опции: резюме, писмен договор, tasks…"
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI Intel
              </button>
            ) : null}
            {canPodcastAds && adsPrefs.podcast.manualTrigger !== false ? (
              <button
                type="button"
                onClick={() => {
                  showCoach('ads')
                  triggerPodcastAd()
                }}
                disabled={Boolean(activeAd)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-2.5 py-2 text-[11px] font-semibold text-black disabled:opacity-50"
                title="Пусни спонсорска реклама сега"
              >
                <Megaphone className="h-3.5 w-3.5" />
                Реклама
              </button>
            ) : null}
            {isGuest ? (
              <button
                type="button"
                onClick={() => void leaveRoomSelf()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white"
                title="Напусни"
              >
                <PhoneOff className="h-3.5 w-3.5" />
                Затвори
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void hangUpToChat()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white"
                title="Затвори обаждането — чатът остава"
              >
                <PhoneOff className="h-3.5 w-3.5" />
                Затвори
              </button>
            )}

            {filtersOpen && !audioOnly ? (
              <div className="absolute bottom-full left-1/2 z-20 mb-2 w-[min(92vw,420px)] -translate-x-1/2 space-y-3 rounded-2xl border border-white/15 bg-[#0d121c] p-3 shadow-2xl">
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Видео качество
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(VIDEO_QUALITY) as VideoQualityId[]).map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => patchRoom({ videoQuality: id })}
                        className={`rounded-full px-2.5 py-1 text-[11px] ${
                          prefs.room.videoQuality === id
                            ? 'bg-indigo-500 text-white'
                            : 'bg-white/5 text-slate-300'
                        }`}
                      >
                        {VIDEO_QUALITY[id].label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Филтър
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {VIDEO_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() =>
                          patchRoom({ videoFilter: f.id as VideoFilterId })
                        }
                        className={`rounded-full px-2.5 py-1 text-[11px] ${
                          prefs.room.videoFilter === f.id
                            ? 'bg-indigo-500 text-white'
                            : 'bg-white/5 text-slate-300'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      MyFace
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        patchStage({ myFaceEnabled: !stageMyFaceEnabled })
                      }
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        stageMyFaceEnabled
                          ? 'bg-rose-500 text-white'
                          : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {stageMyFaceEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <p className="mb-1.5 text-[10px] text-slate-500">
                    По желание — като AI фон. Само ако искаш polish на лицето.
                  </p>
                  {stageMyFaceEnabled ? (
                    <div className="flex flex-wrap gap-1.5">
                      {MY_FACE_LOOKS.map((look) => (
                        <button
                          key={look.id}
                          type="button"
                          title={look.hint}
                          onClick={() => patchStage({ myFaceLook: look.id })}
                          className={`rounded-full px-2.5 py-1 text-[11px] ${
                            stageMyFaceLook === look.id
                              ? 'bg-rose-500 text-white'
                              : 'bg-white/5 text-slate-300'
                          }`}
                        >
                          {look.labelBg}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>

        {showBroadcastUi ? (
          <PodcastLiveRail
            showTitle={title}
            live={obsLive || Boolean(remoteRoom?.session_open ?? conv?.sessionOpen)}
            streaming={isStreamingMode}
            viewers={members.map((m) => ({
              id: m.id,
              name: m.name,
              lang: m.lang,
              role: m.guest ? 'guest' : m.id === 'you' ? 'host' : 'viewer',
              live: true,
            }))}
            messages={
              useBackendRoom
                ? remoteMessages.slice(-40).map((msg) => ({
                    id: msg.id,
                    fromMe: msg.sender_name === youName,
                    name: msg.sender_name || 'Гост',
                    text: msg.body,
                    createdAt: msg.created_at || new Date().toISOString(),
                  }))
                : localMessages.slice(-40).map((msg) => ({
                    id: msg.id,
                    fromMe: Boolean(msg.fromMe),
                    name: msg.fromMe ? youName : 'Гост',
                    text: msg.text,
                    createdAt: msg.createdAt,
                  }))
            }
            draft={chatDraft}
            onDraftChange={setChatDraft}
            onSend={() => {
              const text = chatDraft.trim()
              if (!text) return
              void sendRichChat({ text })
            }}
          />
        ) : null}
      </div>

      {peopleToast ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black shadow-lg">
          {peopleToast}
        </div>
      ) : null}

      <ContextMenu
        open={Boolean(memberMenu)}
        x={memberMenu?.x || 0}
        y={memberMenu?.y || 0}
        items={
          memberMenu ? memberContextItems(memberMenu.memberId) : []
        }
        onClose={() => setMemberMenu(null)}
      />

      <VirtualRoomSelector
        open={studioOpen}
        userPlan={
          isGuest
            ? 'podcast'
            : user?.plan || 'free'
        }
        isAdmin={!isGuest && isAdminUser(user)}
        activeRoomId={stageStudioId}
        customBackground={stageCustomBg}
        customRooms={stageCustomRooms}
        aiRooms={isGuest ? undefined : prefs.aiRooms}
        onSaveAiRoom={
          isGuest
            ? undefined
            : (aiRoom) => {
                const plan = isAdminUser(user) ? 'podcast' : user?.plan || 'free'
                if (!canSaveAiRoom(plan, (prefs.aiRooms || []).length)) {
                  toastPeople('Лимитът за AI стаи е изчерпан')
                  return
                }
                updatePrefs((current) => ({
                  aiRooms: capAiRoomsForPlan(
                    [aiRoom, ...(current.aiRooms || [])],
                    plan
                  ),
                }))
                patchStage({
                  studioRoomId: aiRoom.id,
                  customBackground: aiRoom.imageUrl,
                  cutoutMode: 'contour',
                })
                setStudioOpen(false)
                toastPeople('AI стая запазена · AI cutout')
              }
        }
        onDeleteAiRoom={(roomId) => {
          updatePrefs((current) => ({
            aiRooms: (current.aiRooms || []).filter((r) => r.id !== roomId),
          }))
          if (stageStudioId === roomId) {
            patchStage({ studioRoomId: 'carlsberg-bar', customBackground: null })
          }
        }}
        onClose={() => setStudioOpen(false)}
        onSelect={(roomId) => {
          const custom = stageCustomRooms.find((r) => r.id === roomId)
          const savedAi = isGuest
            ? undefined
            : (prefs.aiRooms || []).find((r) => r.id === roomId)
          patchStage({
            studioRoomId: roomId,
            // Prefer studioRoomId lookup — avoid duplicating huge data URLs
            customBackground: custom
              ? custom.imageDataUrl
              : savedAi
                ? savedAi.imageUrl
                : null,
            // AI virtual background needs contour mode
            cutoutMode: 'contour',
          })
          setStudioOpen(false)
          toastPeople('Фон приложен · AI cutout')
        }}
        onAddCustomRooms={(rooms) => {
          if (!rooms.length) return
          patchStage({
            customStudioRooms: [...rooms, ...stageCustomRooms].slice(0, 40),
            studioRoomId: rooms[0].id,
            customBackground: rooms[0].imageDataUrl,
            cutoutMode: 'contour',
          })
          toastPeople('Твоят фон е качен · AI cutout')
        }}
        onDeleteCustomRoom={(roomId) => {
          const doomed = stageCustomRooms.find((r) => r.id === roomId)
          if (doomed?.imageDataUrl?.startsWith('idb:')) {
            void import('@/lib/banner-idb').then(({ idbDeleteBanner, idbBannerId }) =>
              idbDeleteBanner(idbBannerId(doomed.imageDataUrl))
            )
          }
          const next = stageCustomRooms.filter((r) => r.id !== roomId)
          patchStage({
            customStudioRooms: next,
            studioRoomId:
              stageStudioId === roomId ? 'carlsberg-bar' : stageStudioId,
            customBackground:
              stageStudioId === roomId ? null : stageCustomBg,
          })
        }}
        onUpgradeHint={() =>
          window.alert(
            isGuest
              ? 'Гостите могат да ползват вградените банери. Качи свой от Unsplash/Canva (линковете в селектора).'
              : 'Тази стая е в Business или Podcast пакета. Надгради плана от Checkout / настройки.'
          )
        }
        myFaceEnabled={stageMyFaceEnabled}
        myFaceLook={stageMyFaceLook}
        onMyFaceChange={(enabled, look) => {
          patchStage({ myFaceEnabled: enabled, myFaceLook: look })
          toastPeople(
            enabled ? `MyFace · ${look}` : 'MyFace изключен'
          )
        }}
      />

      {!isGuest ? (
        <SettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onOpenRegister={() => undefined}
        />
      ) : null}

      <BusinessIntel
        open={intelOpen}
        data={intelData}
        loading={intelLoading}
        error={intelError}
        selecting={intelSelecting}
        selectedOptions={intelOptions}
        onSelectedOptionsChange={setIntelOptions}
        onClose={closeIntelPanel}
        onGenerate={(opts) => void runBusinessIntel(opts)}
        onTabCoach={(tabId) => {
          if (tabId === 'contract') showCoach('contract')
          else if (tabId === 'summary' || tabId === 'agreement')
            showCoach('ai_intel')
        }}
        onChangeOptions={() => {
          setIntelSelecting(true)
          setIntelData(null)
          setIntelError(null)
        }}
        onCopyAll={() => {
          if (!intelData) return
          void navigator.clipboard.writeText(
            formatIntelForClipboard(intelData, intelOptions)
          )
          toastPeople('Intel копиран')
        }}
        onCopyAgreement={() => {
          if (!intelData) return
          void navigator.clipboard.writeText(
            formatAgreementForClipboard(intelData)
          )
          toastPeople('Устен договор копиран')
        }}
        onCopyContract={() => {
          if (!intelData) return
          void navigator.clipboard.writeText(
            formatWrittenContractForClipboard(intelData)
          )
          toastPeople('Писмен договор копиран')
        }}
        onSave={() => {
          if (!intelData) return
          if (prefs.experience?.businessRoom?.saveToCrm === false) {
            toastPeople('CRM запис е изключен в настройките')
            return
          }
          persistIntelToConversation(intelData)
          toastPeople('Запазено в чат + Memories')
        }}
        youName={isGuest ? guest?.displayName || 'Guest' : user?.displayName}
        peerName={members.find((m) => m.id !== 'you')?.name}
        youEmail={user?.email}
        participants={members.map((m) => ({
          id: m.id,
          name: m.name || (m.id === 'you' ? user?.displayName || 'Ти' : m.id),
          email: m.id === 'you' ? user?.email : undefined,
        }))}
        postNegotiation={pendingHangupAfterIntel}
        requireSignConsent={
          prefs.experience?.businessRoom?.requireSignConsent !== false
        }
        sealOnFirstSign={
          prefs.experience?.businessRoom?.sealOnFirstSign !== false
        }
        autoOpenSigner={Boolean(
          prefs.experience?.businessRoom?.autoOpenSigner
        )}
        legalBinding={
          prefs.experience?.businessRoom?.signatureMode !== 'acknowledgment'
        }
        preferredLegalProvider={
          prefs.experience?.businessRoom?.preferredLegalProvider || 'yousign'
        }
      />
    </div>
  )
}

function Ctrl({
  active,
  label,
  onClick,
  icon: Icon,
}: {
  active: boolean
  label: string
  onClick: () => void
  icon: typeof Mic
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-medium ${
        active
          ? 'bg-white/15 text-white ring-1 ring-white/20'
          : 'bg-white/5 text-white/60 ring-1 ring-white/10'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

export default function RoomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">
          Opening room…
        </div>
      }
    >
      <RoomInner />
    </Suspense>
  )
}
