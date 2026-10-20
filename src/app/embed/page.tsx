'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  MessageCircle,
  Mic,
  Phone,
  SendHorizontal,
  Sparkles,
  UserPlus,
  Video,
  Waves,
} from 'lucide-react'
import { getLanguage } from '@/lib/languages'
import { parseChannel } from '@/lib/website-embed'
import { translateText } from '@/lib/translation'
import { useTheme } from '@/lib/theme'

function EmbedWidgetInner() {
  const params = useSearchParams()
  const siteName = params.get('name') || 'OmniVoice'
  const domain = params.get('domain') || 'website'
  const channel = parseChannel(params.get('channel'))
  const welcome =
    params.get('welcome') ||
    'Здравей! Пиши или звънни — превеждаме на живо.'
  const hostLang = getLanguage(params.get('hostLang') || 'bg')
  const visitorLang = getLanguage(params.get('visitorLang') || 'en')
  const online = params.get('online') || 'Онлайн сега'
  const branding = params.get('branding') !== '0'
  const launcher = params.get('launcher') === '1'

  const { prefs, updatePrefs } = useTheme()
  const [mode, setMode] = useState<'chat' | 'call'>(
    channel === 'call' ? 'call' : 'chat'
  )
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [visitorName, setVisitorName] = useState('')
  const [visitorContact, setVisitorContact] = useState('')
  const [addedSub, setAddedSub] = useState(false)
  const [messages, setMessages] = useState<
    Array<{ id: string; fromMe: boolean; text: string; translated?: string }>
  >([
    {
      id: 'welcome',
      fromMe: false,
      text: welcome,
    },
  ])

  const canChat = channel === 'chat' || channel === 'both'
  const canCall = channel === 'call' || channel === 'both'

  const title = useMemo(
    () => `${siteName} · ${domain}`,
    [siteName, domain]
  )

  function addAsSubscriber() {
    if (!visitorName.trim()) return
    updatePrefs({
      subscribers: [
        {
          id: `websub_${Date.now()}`,
          name: visitorName.trim(),
          email: visitorContact.includes('@') ? visitorContact.trim() : '',
          phone: visitorContact.includes('@') ? '' : visitorContact.trim(),
          language: visitorLang.code,
          status: 'invited',
          plan: 'free',
          presence: 'online',
          source: 'website',
        },
        ...prefs.subscribers,
      ],
    })
    setAddedSub(true)
  }

  async function send() {
    const text = draft.trim()
    if (!text || busy) return
    setBusy(true)
    setDraft('')
    let translated: string | undefined
    try {
      translated = await translateText(text, hostLang.name, {
        emotionSafe: true,
        tone: 'natural',
      })
    } catch {
      translated = undefined
    }
    setMessages((prev) => [
      ...prev,
      {
        id: `m_${Date.now()}`,
        fromMe: true,
        text,
        translated,
      },
      {
        id: `r_${Date.now()}`,
        fromMe: false,
        text:
          hostLang.code === 'bg'
            ? 'Получихме съобщението. Екипът отговаря скоро.'
            : 'Got it — our team will reply shortly.',
      },
    ])
    setBusy(false)
  }

  return (
    <div
      className={`flex h-dvh flex-col bg-[var(--background)] text-[var(--foreground)] ${
        launcher ? '' : 'min-h-screen'
      }`}
    >
      <header className="border-b border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
            <Waves className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="text-[11px] text-[var(--accent)]">{online}</p>
          </div>
        </div>
        {canChat || canCall ? (
          <div className="mt-3 flex gap-1 rounded-full bg-[var(--chip)] p-1">
            {canChat ? (
              <button
                type="button"
                onClick={() => setMode('chat')}
                className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  mode === 'chat'
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                    : 'text-[var(--muted)]'
                }`}
              >
                <MessageCircle className="mr-1 inline h-3.5 w-3.5" />
                Chat
              </button>
            ) : null}
            {canCall ? (
              <button
                type="button"
                onClick={() => setMode('call')}
                className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  mode === 'call'
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                    : 'text-[var(--muted)]'
                }`}
              >
                <Phone className="mr-1 inline h-3.5 w-3.5" />
                Call
              </button>
            ) : null}
          </div>
        ) : null}
        <p className="mt-2 text-[11px] text-[var(--muted)]">
          {visitorLang.nativeName} → {hostLang.nativeName} · live translate
        </p>
      </header>

      {mode === 'chat' && canChat ? (
        <>
          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    msg.fromMe
                      ? 'rounded-br-md bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'rounded-bl-md border border-[var(--panel-border)] bg-[var(--panel)]'
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.translated ? (
                    <p className="mt-1 border-t border-black/10 pt-1 text-xs opacity-90">
                      <Sparkles className="mr-1 inline h-3 w-3" />
                      {msg.translated}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <footer className="border-t border-[var(--panel-border)] p-3">
            <div className="mb-2 grid gap-1.5">
              <input
                className="ov-field !py-1.5 text-xs"
                placeholder="Твоето име (за абонати)"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
              />
              <div className="flex gap-1.5">
                <input
                  className="ov-field !py-1.5 text-xs"
                  placeholder="Имейл или телефон"
                  value={visitorContact}
                  onChange={(e) => setVisitorContact(e.target.value)}
                />
                <button
                  type="button"
                  className="ov-btn-ghost !px-2 !py-1.5 text-[11px]"
                  onClick={addAsSubscriber}
                  title="Добави като абонат"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                </button>
              </div>
              {addedSub ? (
                <p className="text-[10px] text-[var(--accent)]">
                  Добавен към списъка с абонати на хоста.
                </p>
              ) : null}
            </div>
            <div className="flex items-end gap-2">
              <textarea
                className="ov-field max-h-24 min-h-[42px] flex-1 resize-none"
                rows={1}
                placeholder="Напиши съобщение…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void send()
                  }
                }}
              />
              <button
                type="button"
                className="ov-btn-primary !rounded-2xl !px-3"
                onClick={() => void send()}
                disabled={busy || !draft.trim()}
              >
                <SendHorizontal className="h-4 w-4" />
              </button>
            </div>
          </footer>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/30">
            <Video className="h-8 w-8 text-[var(--accent)]" />
          </div>
          <div>
            <p className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Обаждане с превод
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Посетителят говори на {visitorLang.nativeName}, ти чуваш на{' '}
              {hostLang.nativeName}.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={`/join?site=${encodeURIComponent(params.get('key') || 'site')}&channel=call&conv=${encodeURIComponent(prefs.conversations[0]?.id || 'conv-1')}`}
              target="_top"
              className="ov-btn-primary"
            >
              <Mic className="h-4 w-4" />
              Започни гласово
            </a>
            <a
              href={`/join?site=${encodeURIComponent(params.get('key') || 'site')}&channel=call&video=1&conv=${encodeURIComponent(prefs.conversations[0]?.id || 'conv-1')}`}
              target="_top"
              className="ov-btn-ghost"
            >
              <Video className="h-4 w-4" />
              Видео
            </a>
          </div>
        </div>
      )}

      {branding ? (
        <p className="border-t border-[var(--panel-border)] px-3 py-2 text-center text-[10px] text-[var(--muted)]">
          Powered by OmniVoice AI
        </p>
      ) : null}
    </div>
  )
}

export default function EmbedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center text-sm text-[var(--muted)]">
          Loading OmniVoice…
        </div>
      }
    >
      <EmbedWidgetInner />
    </Suspense>
  )
}
