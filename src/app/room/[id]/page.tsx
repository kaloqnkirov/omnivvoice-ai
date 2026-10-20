'use client'

import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  PhoneOff,
  Settings2,
  Sparkles,
  Subtitles,
  Video,
} from 'lucide-react'
import LiveKitStage from '@/components/LiveKitStage'
import SettingsPanel from '@/components/SettingsPanel'
import { isClientBackendEnabled } from '@/lib/auth-client'
import {
  clearGuestSession,
  loadGuestSession,
} from '@/lib/guest-session'
import { useRoomSync } from '@/hooks/useRoomSync'
import { getLanguage } from '@/lib/languages'
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
  const [kicked, setKicked] = useState(false)
  const [chatDraft, setChatDraft] = useState('')

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

  // Guests kicked when host ends (local or remote)
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

  async function sendChat() {
    const text = chatDraft.trim()
    if (!text || !useBackendRoom) return
    setChatDraft('')
    await sendMessage({
      text,
      guestId: guest?.guestId,
      guestName: guest?.displayName,
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
            ? 'Гост режим: чат/обаждане с превод. Без настройки и без админ права.'
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
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((person) => (
              <article
                key={person.id}
                className="relative min-h-[180px] overflow-hidden rounded-2xl border border-white/15 bg-black/30 p-3 backdrop-blur"
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

        {useBackendRoom ? (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
            <div className="mb-2 max-h-32 space-y-1 overflow-y-auto text-xs text-white/90">
              {remoteMessages.slice(-30).map((msg) => (
                <p key={msg.id}>
                  <span className="text-white/50">{msg.sender_name}: </span>
                  {msg.body}
                </p>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void sendChat()
              }}
            >
              <input
                className="ov-field flex-1 !bg-white/10 !text-white"
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                placeholder="Съобщение…"
              />
              <button type="submit" className="ov-btn-primary !px-3">
                Send
              </button>
            </form>
          </div>
        ) : null}

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
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/15 bg-black/70 px-3 py-2.5 backdrop-blur-xl">
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
            <button
              type="button"
              onClick={() => void (isGuest ? leaveAsGuest() : endAsHost())}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white"
            >
              <PhoneOff className="h-3.5 w-3.5" />
              {isGuest ? 'Leave' : 'End · kick guests'}
            </button>
          </div>
        </div>
      </main>

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
