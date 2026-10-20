'use client'

import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Camera,
  CameraOff,
  Image as ImageIcon,
  Mic,
  MicOff,
  PhoneOff,
  Settings2,
  Sparkles,
  Subtitles,
  Video,
} from 'lucide-react'
import ChatComposer from '@/components/ChatComposer'
import LiveKitStage from '@/components/LiveKitStage'
import RichMessageBubble from '@/components/RichMessageBubble'
import SettingsPanel from '@/components/SettingsPanel'
import VirtualRoomSelector from '@/components/VirtualRoomSelector'
import { isAdminUser } from '@/lib/access'
import { isClientBackendEnabled } from '@/lib/auth-client'
import {
  clearGuestSession,
  loadGuestSession,
} from '@/lib/guest-session'
import { useRoomSync } from '@/hooks/useRoomSync'
import { getLanguage } from '@/lib/languages'
import {
  VIDEO_FILTERS,
  VIDEO_QUALITY,
  type VideoFilterId,
  type VideoQualityId,
} from '@/lib/studio-rooms'
import { useTheme } from '@/lib/theme'
import { useLiveTranslation } from '@/lib/translation'
import type { Conversation } from '@/lib/auth-types'

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
  const guest = isGuest ? loadGuestSession() : null

  const {
    room: remoteRoom,
    messages: remoteMessages,
    sendMessage,
    endSession,
    loading: roomLoading,
  } = useRoomSync(useBackendRoom ? params.id : undefined, useBackendRoom)

  const nativeLang = getLanguage(
    isGuest ? guest?.language || 'bg' : user?.nativeLanguage || 'bg'
  )
  const targetLang = getLanguage(prefs.voice.targetLanguage || 'en')

  const [micOn, setMicOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(search.get('video') === '1')
  const [translationOn, setTranslationOn] = useState(true)
  const [subtitlesOn, setSubtitlesOn] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [studioOpen, setStudioOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [screenShare, setScreenShare] = useState(false)
  const [kicked, setKicked] = useState(false)
  const [chatDraft, setChatDraft] = useState('')
  const [replyPreview, setReplyPreview] = useState<string | null>(null)
  const [localRich, setLocalRich] = useState<
    Array<{
      id: string
      fromMe: boolean
      text: string
      createdAt: string
      kind?: 'gif' | 'sticker' | 'image' | 'voice' | 'poll' | 'deal' | 'clip'
      mediaUrl?: string
      caption?: string
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

  const {
    listening,
    interimText,
    sourceText,
    translatedText,
    translating,
  } = useLiveTranslation({
    targetLanguage: targetLang.name,
    enabled: Boolean(micOn && translationOn && (user || guest)),
    sourceLang: nativeLang.speechCode,
    speakOutput: translationOn,
    voiceLang: targetLang.speechCode,
    voiceURI: prefs.voice.voiceURI,
    voiceRate: prefs.voice.rate,
    voicePitch: prefs.voice.pitch,
    emotionSafe: prefs.voice.emotionSafe,
    tone: prefs.voice.tone,
  })

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
    updatePrefs({
      conversations: prefs.conversations.map((item) =>
        item.id === conv.id ? { ...item, ...patch } : item
      ),
    })
  }

  function patchRoom(patch: Partial<typeof prefs.room>) {
    updatePrefs({ room: { ...prefs.room, ...patch } })
  }

  async function endAsHost() {
    if (useBackendRoom) {
      await endSession()
      router.push('/dashboard')
      return
    }
    if (!conv) return
    updatePrefs({
      conversations: prefs.conversations.map((item) =>
        item.id === conv.id
          ? {
              ...item,
              sessionOpen: false,
              activeGuestIds: [],
              members: item.members.filter(
                (member) => !member.id.startsWith('guest_')
              ),
              lastMessage: 'Хостът приключи разговора',
            }
          : item
      ),
    })
    router.push('/dashboard')
  }

  function leaveAsGuest() {
    if (!useBackendRoom && conv && guest) {
      updatePrefs({
        conversations: prefs.conversations.map((item) =>
          item.id === conv.id
            ? {
                ...item,
                activeGuestIds: (item.activeGuestIds || []).filter(
                  (id) => id !== guest.guestId
                ),
                members: item.members.filter((m) => m.id !== guest.guestId),
              }
            : item
        ),
      })
    }
    clearGuestSession()
    router.push('/')
  }

  async function sendRichChat(partial: {
    text: string
    kind?: 'gif' | 'sticker' | 'image' | 'voice' | 'poll' | 'deal' | 'clip'
    mediaUrl?: string
    caption?: string
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
      // Persist text (+ media caption) to backend; keep rich preview locally
      const richId = `local_${Date.now()}`
      setLocalRich((prev) => [
        ...prev,
        {
          id: richId,
          fromMe: true,
          createdAt: new Date().toISOString(),
          ...partial,
          text,
        },
      ])
      await sendMessage({
        text: partial.caption
          ? `${text} · ${partial.caption}`
          : partial.kind
            ? `[${partial.kind}] ${text}`
            : text,
        guestId: guest?.guestId,
        guestName: guest?.displayName,
      })
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

  const missingLocal = !useBackendRoom && !conv
  const missingRemote = useBackendRoom && !roomLoading && !remoteRoom

  if (missingLocal || missingRemote) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-[var(--muted)]">Разговорът не е намерен.</p>
        <Link href={isGuest ? '/join' : '/dashboard'} className="ov-btn-primary">
          Назад
        </Link>
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
        </div>
        {!isGuest ? (
          <button
            type="button"
            className="ov-icon-btn"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 className="h-4 w-4" />
          </button>
        ) : (
          <span className="w-9" />
        )}
      </header>

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

      <main className="ov-stage relative mx-auto mt-4 flex w-full max-w-6xl flex-1 flex-col gap-3 rounded-[32px] border border-[var(--panel-border)] p-4">
        {useBackendRoom ? (
          <LiveKitStage
            roomId={params.id}
            displayName={youName}
            guestId={guest?.guestId}
            micOn={micOn}
            cameraOn={cameraOn}
            screenShare={screenShare}
            studioRoomId={prefs.room.studioRoomId}
            customBackground={prefs.room.customBackground}
            customStudioRooms={prefs.room.customStudioRooms || []}
            videoFilter={prefs.room.videoFilter}
            videoQuality={prefs.room.videoQuality}
            mirrorVideo={prefs.room.mirrorVideo}
            noiseSuppression={prefs.room.noiseSuppression}
            echoCancellation={prefs.room.echoCancellation}
            autoGainControl={prefs.room.autoGainControl}
            frameRate={prefs.room.frameRate}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((person) => (
              <article
                key={person.id}
                className="relative min-h-[180px] overflow-hidden rounded-2xl border border-white/15 bg-black/30 p-3 backdrop-blur"
                style={{
                  backgroundImage: `linear-gradient(180deg,rgba(0,0,0,0.45),rgba(0,0,0,0.65)), url(${
                    prefs.room.customBackground ||
                    `https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80`
                  })`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{person.name}</p>
                    <p className="text-[11px] text-white/70">{person.lang}</p>
                  </div>
                  {person.guest ? (
                    <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] text-amber-100">
                      Guest
                    </span>
                  ) : null}
                </div>
                <div className="mx-auto mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                  {cameraOn ? (
                    <Video className="h-6 w-6 text-white" />
                  ) : (
                    <CameraOff className="h-6 w-6 text-white/50" />
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

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
                          if (m.id !== messageId || !m.poll || m.poll.votedOptionId)
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
            peerLanguage={prefs.voice.targetLanguage || 'en'}
            showDeal={!isGuest}
            showClip={!isGuest}
            placeholder="Съобщение, GIF, глас…"
            onSend={(partial) => void sendRichChat(partial)}
          />
        </div>

        {subtitlesOn && translationOn ? (
          <div className="space-y-1.5">
            <div className="rounded-xl border border-white/15 bg-black/55 px-3 py-2 text-xs text-white backdrop-blur">
              {nativeLang.flag} ·{' '}
              {interimText || sourceText || 'Говори в микрофона…'}
            </div>
            <div className="rounded-xl border border-[var(--accent)]/30 bg-black/60 px-3 py-2 text-xs text-[var(--accent)] backdrop-blur">
              {targetLang.flag} ·{' '}
              {translatedText ||
                (translating
                  ? `Превод към ${targetLang.nativeName}…`
                  : 'Чака се превод…')}
            </div>
          </div>
        ) : null}

        <div className="flex justify-center">
          <div className="relative flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/15 bg-black/70 px-3 py-2.5 backdrop-blur-xl">
            <Ctrl
              active={micOn}
              label="Mic"
              onClick={() => setMicOn((v) => !v)}
              icon={micOn ? Mic : MicOff}
            />
            <Ctrl
              active={cameraOn}
              label="Cam"
              onClick={() => setCameraOn((v) => !v)}
              icon={cameraOn ? Camera : CameraOff}
            />
            <Ctrl
              active={translationOn}
              label="Translate"
              onClick={() => setTranslationOn((v) => !v)}
              icon={Sparkles}
            />
            <Ctrl
              active={subtitlesOn}
              label="Subs"
              onClick={() => setSubtitlesOn((v) => !v)}
              icon={Subtitles}
            />
            <Ctrl
              active={studioOpen}
              label="Фон"
              onClick={() => setStudioOpen(true)}
              icon={ImageIcon}
            />
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
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-2.5 py-2 text-[11px] font-medium text-white ring-1 ring-white/15"
            >
              Филтри / HD
            </button>
            <button
              type="button"
              onClick={() => void (isGuest ? leaveAsGuest() : endAsHost())}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white"
            >
              <PhoneOff className="h-3.5 w-3.5" />
              {isGuest ? 'Leave' : 'End · kick guests'}
            </button>

            {filtersOpen ? (
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
              </div>
            ) : null}
          </div>
        </div>
      </main>

      <VirtualRoomSelector
        open={studioOpen}
        userPlan={user?.plan || 'free'}
        isAdmin={!isGuest && isAdminUser(user)}
        activeRoomId={prefs.room.studioRoomId}
        customBackground={prefs.room.customBackground}
        customRooms={prefs.room.customStudioRooms || []}
        onClose={() => setStudioOpen(false)}
        onSelect={(roomId) => {
          const custom = (prefs.room.customStudioRooms || []).find(
            (r) => r.id === roomId
          )
          patchRoom({
            studioRoomId: roomId,
            customBackground: custom ? custom.imageDataUrl : null,
          })
          setStudioOpen(false)
        }}
        onAddCustomRoom={(room) => {
          patchRoom({
            customStudioRooms: [room, ...(prefs.room.customStudioRooms || [])],
            studioRoomId: room.id,
            customBackground: room.imageDataUrl,
          })
        }}
        onDeleteCustomRoom={(roomId) => {
          const next = (prefs.room.customStudioRooms || []).filter(
            (r) => r.id !== roomId
          )
          patchRoom({
            customStudioRooms: next,
            studioRoomId:
              prefs.room.studioRoomId === roomId
                ? 'glass-office'
                : prefs.room.studioRoomId,
            customBackground:
              prefs.room.studioRoomId === roomId
                ? null
                : prefs.room.customBackground,
          })
        }}
        onUpgradeHint={() =>
          window.alert(
            'Тази стая е в Business или Podcast пакета. Надгради плана от Checkout / настройки.'
          )
        }
      />

      {!isGuest ? (
        <SettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onOpenRegister={() => undefined}
        />
      ) : null}
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
