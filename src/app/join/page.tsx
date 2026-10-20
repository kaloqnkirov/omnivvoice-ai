'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { Waves } from 'lucide-react'
import { APP_LANGUAGES } from '@/lib/languages'
import {
  createGuestId,
  saveGuestSession,
} from '@/lib/guest-session'
import { isClientBackendEnabled } from '@/lib/auth-client'
import { useTheme } from '@/lib/theme'

function JoinInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { prefs, updatePrefs, hydrated } = useTheme()
  const backend = isClientBackendEnabled()

  const inviteCode = params.get('invite') || params.get('code') || ''
  const convId = params.get('conv') || ''
  const siteKey = params.get('site') || ''
  const channel = params.get('channel') || 'both'
  const prefillName = params.get('name') || ''
  const prefillLang = params.get('lang') || 'bg'
  const role = siteKey ? 'website' : 'invite'

  const invite = useMemo(
    () => prefs.invites.find((item) => item.code === inviteCode && item.active),
    [prefs.invites, inviteCode]
  )

  const conversationId = invite?.conversationId || convId || prefs.conversations[0]?.id || ''
  const conversation = prefs.conversations.find((item) => item.id === conversationId)

  const [displayName, setDisplayName] = useState(
    invite?.prefillName || prefillName
  )
  const [language, setLanguage] = useState(
    invite?.prefillLanguage || prefillLang
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [remoteTitle, setRemoteTitle] = useState<string | null>(null)

  const fromContacts = Boolean(invite?.prefillName || prefillName)
  const ended = params.get('ended') === '1'

  useEffect(() => {
    if (!backend || !inviteCode) return
    void fetch(`/api/invites/join?code=${encodeURIComponent(inviteCode)}`)
      .then((r) => r.json())
      .then((data: {
        invite?: {
          prefill_name?: string | null
          prefill_language?: string | null
          rooms?: { title?: string; session_open?: boolean } | Array<{ title?: string }>
        }
      }) => {
        const inv = data.invite
        if (!inv) return
        if (inv.prefill_name) setDisplayName(inv.prefill_name)
        if (inv.prefill_language) setLanguage(inv.prefill_language)
        const rooms = inv.rooms
        const title = Array.isArray(rooms) ? rooms[0]?.title : rooms?.title
        if (title) setRemoteTitle(title)
      })
      .catch(() => undefined)
  }, [backend, inviteCode])

  async function enter(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!displayName.trim()) {
      setError('Въведи име или псевдоним.')
      return
    }

    setBusy(true)
    try {
      if (backend && (inviteCode || siteKey)) {
        const guestId = createGuestId()
        const res = await fetch('/api/invites/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: inviteCode || undefined,
            siteKey: siteKey || undefined,
            displayName: displayName.trim(),
            language,
            guestId,
          }),
        })
        const data = (await res.json()) as {
          error?: string
          roomId?: string
          guestId?: string
          channel?: string
        }
        if (!res.ok || !data.roomId) {
          setError(data.error || 'Невалидна покана')
          return
        }
        saveGuestSession({
          guestId: data.guestId || guestId,
          displayName: displayName.trim(),
          language,
          inviteCode: inviteCode || 'website',
          conversationId: data.roomId,
          hostSiteKey: siteKey || undefined,
          role: role as 'invite' | 'website',
          joinedAt: new Date().toISOString(),
        })
        const video =
          (data.channel || channel) === 'call' || params.get('video') === '1'
        router.push(`/room/${data.roomId}?guest=1&video=${video ? '1' : '0'}`)
        return
      }

      if (!conversationId) {
        setError('Невалиден линк — липсва разговор/стая.')
        return
      }
      if (conversation && conversation.sessionOpen === false) {
        setError('Хостът е приключил сесията. Линкът вече не е активен.')
        return
      }
      if (inviteCode && !invite && role === 'invite') {
        setError('Поканата е невалидна или деактивирана.')
        return
      }

      const guestId = createGuestId()
      saveGuestSession({
        guestId,
        displayName: displayName.trim(),
        language,
        inviteCode: inviteCode || 'website',
        conversationId,
        hostSiteKey: siteKey || undefined,
        role: role as 'invite' | 'website',
        joinedAt: new Date().toISOString(),
      })

      if (conversation) {
        updatePrefs({
          conversations: prefs.conversations.map((item) =>
            item.id === conversationId
              ? {
                  ...item,
                  sessionOpen: true,
                  activeGuestIds: Array.from(
                    new Set([...(item.activeGuestIds || []), guestId])
                  ),
                  members: item.members.some((m) => m.id === guestId)
                    ? item.members
                    : [
                        ...item.members,
                        {
                          id: guestId,
                          name: displayName.trim(),
                          language,
                          presence: 'online',
                        },
                      ],
                  lastMessage: `${displayName.trim()} се включи като гост`,
                }
              : item
          ),
        })
      }

      const video = channel === 'call' || params.get('video') === '1'
      router.push(
        `/room/${conversationId}?guest=1&video=${video ? '1' : '0'}`
      )
    } finally {
      setBusy(false)
    }
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">
        Зареждане…
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-10">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--muted)]">
        <Waves className="h-4 w-4 text-[var(--accent)]" />
        OmniVoice AI
      </Link>

      <div className="ov-panel rounded-[28px] p-6">
        <p className="ov-kicker">Guest вход</p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          Включи се без абонамент
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Можеш само да участваш в чат или видео разговор. Нямаш админ права.
          Когато хостът приключи — сесията ти спира.
        </p>
        {ended ? (
          <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-200">
            Хостът затвори разговора. Можеш да влезеш отново само с нова покана.
          </p>
        ) : null}

        {(conversation || remoteTitle) ? (
          <p className="mt-3 rounded-xl bg-[var(--chip)] px-3 py-2 text-xs text-[var(--muted)]">
            Стая:{' '}
            <strong className="text-[var(--foreground)]">
              {remoteTitle || conversation?.title}
            </strong>
            {siteKey ? ` · сайт ${siteKey}` : ''}
          </p>
        ) : null}

        <form className="mt-5 space-y-3" onSubmit={(e) => void enter(e)}>
          <label className="block">
            <span className="mb-1.5 block text-xs text-[var(--muted)]">
              Име или псевдоним
              {fromContacts ? ' (от контакти)' : ''}
            </span>
            <input
              className="ov-field"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="напр. Кало / Guest"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-[var(--muted)]">
              Говорим език
            </span>
            <select
              className="ov-field"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {APP_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} · {lang.nativeName}
                </option>
              ))}
            </select>
          </label>
          {error ? (
            <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-500">
              {error}
            </p>
          ) : null}
          <button type="submit" className="ov-btn-primary w-full" disabled={busy}>
            {busy ? '…' : 'Влез в разговора'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">
          Loading…
        </div>
      }
    >
      <JoinInner />
    </Suspense>
  )
}
