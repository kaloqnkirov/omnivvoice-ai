'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  MoreHorizontal,
  Phone,
  Search,
  Sparkles,
  Video,
} from 'lucide-react'
import ChatComposer from '@/components/ChatComposer'
import RichMessageBubble, {
  type RichMessage,
} from '@/components/RichMessageBubble'
import { APP_LANGUAGES, getLanguage } from '@/lib/languages'
import { buildSmartReplies, presenceLabel } from '@/lib/smart-replies'
import { translateText } from '@/lib/translation'
import type { Phrase, PresenceStatus } from '@/lib/user-store'

export type ChatContact = {
  id: string
  name: string
  language: string
  presence: PresenceStatus
  avatarTone: string
  lastPreview: string
}

const DEFAULT_CONTACTS: ChatContact[] = [
  {
    id: 'c1',
    name: 'Мария Петрова',
    language: 'bg',
    presence: 'online',
    avatarTone: 'from-teal-400 to-emerald-700',
    lastPreview: 'Да се чуем след малко?',
  },
  {
    id: 'c2',
    name: 'Alex Rivera',
    language: 'es',
    presence: 'writing',
    avatarTone: 'from-sky-400 to-blue-700',
    lastPreview: '¿Hablamos en 10?',
  },
  {
    id: 'c3',
    name: 'Yuki Tanaka',
    language: 'ja',
    presence: 'in_studio',
    avatarTone: 'from-violet-400 to-fuchsia-700',
    lastPreview: 'Shorts pipeline ready',
  },
]

type InternalMessage = RichMessage & { contactId: string }

const SEED_MESSAGES: InternalMessage[] = [
  {
    id: 'm1',
    contactId: 'c1',
    fromMe: false,
    text: 'Здравей! Готови ли сте за демото?',
    createdAt: '2026-10-19T14:00:00.000Z',
    status: 'read',
  },
  {
    id: 'm2',
    contactId: 'c1',
    fromMe: true,
    text: 'Да — пускам превода на живо.',
    createdAt: '2026-10-19T14:02:00.000Z',
    status: 'read',
  },
  {
    id: 'm3',
    contactId: 'c2',
    fromMe: false,
    text: '¿Podemos hablar mañana?',
    createdAt: '2026-10-19T13:40:00.000Z',
    status: 'delivered',
  },
]

type MessengerChatProps = {
  myLanguage: string
  displayName: string
  emotionSafe: boolean
  tone: 'natural' | 'formal' | 'casual'
  smartRepliesEnabled: boolean
  showPresence: boolean
  ephemeral: boolean
  enterToSend: boolean
  readReceipts: boolean
  typingIndicators: boolean
  phrasebook: Phrase[]
  onPresenceChange: (presence: PresenceStatus) => void
  onStartVoiceCall: (contactName: string) => void
  onStartVideoCall: (contactName: string) => void
}

export default function MessengerChat({
  myLanguage,
  displayName,
  emotionSafe,
  tone,
  smartRepliesEnabled,
  showPresence,
  ephemeral,
  enterToSend,
  readReceipts,
  typingIndicators,
  phrasebook,
  onPresenceChange,
  onStartVoiceCall,
  onStartVideoCall,
}: MessengerChatProps) {
  const [contacts, setContacts] = useState(DEFAULT_CONTACTS)
  const [activeId, setActiveId] = useState(DEFAULT_CONTACTS[0].id)
  const [messages, setMessages] = useState<InternalMessage[]>(SEED_MESSAGES)
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [translateLive, setTranslateLive] = useState(true)
  const [showPhrases, setShowPhrases] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [replyPreview, setReplyPreview] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const active = contacts.find((c) => c.id === activeId) || contacts[0]
  const myLang = getLanguage(myLanguage)
  const peerLang = getLanguage(active.language)

  const thread = useMemo(
    () =>
      messages
        .filter((m) => m.contactId === activeId)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ),
    [messages, activeId]
  )

  const lastIncoming =
    [...thread].reverse().find((m) => !m.fromMe)?.text ||
    thread[thread.length - 1]?.text ||
    ''

  const smartReplies = useMemo(() => {
    if (!smartRepliesEnabled || !lastIncoming) return []
    return buildSmartReplies(lastIncoming, myLanguage)
  }, [smartRepliesEnabled, lastIncoming, myLanguage])

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter((c) => c.name.toLowerCase().includes(q))
  }, [contacts, query])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread.length, activeId])

  useEffect(() => {
    if (!ephemeral) return
    return () => {
      setMessages([])
    }
  }, [ephemeral])

  async function pushOutgoing(
    partial: Omit<RichMessage, 'id' | 'createdAt' | 'fromMe' | 'status'>
  ) {
    if (sending) return
    setSending(true)
    setError(null)
    setReplyPreview(null)
    onPresenceChange('writing')

    let translatedText = partial.translatedText
    if (translateLive && partial.text && !partial.kind) {
      try {
        translatedText = await translateText(partial.text, peerLang.name, {
          emotionSafe,
          tone,
        })
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Преводът не успя — изпратих оригинала.'
        )
      }
    }

    const mine: InternalMessage = {
      ...partial,
      id: `m_${Date.now()}`,
      contactId: activeId,
      fromMe: true,
      createdAt: new Date().toISOString(),
      status: readReceipts ? 'read' : 'sent',
      translatedText,
    }
    setMessages((prev) => [...prev, mine])
    setContacts((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, lastPreview: partial.text, presence: 'online' }
          : c
      )
    )

    window.setTimeout(() => {
      const replySource =
        active.language === 'bg'
          ? 'Супер, получих го. Продължаваме в чата или да звъннем?'
          : active.language === 'es'
            ? 'Perfecto, lo tengo. ¿Seguimos por chat o llamamos?'
            : 'Got it — stay in chat or hop on a call?'
      setMessages((prev) => [
        ...prev,
        {
          id: `m_reply_${Date.now()}`,
          contactId: activeId,
          fromMe: false,
          text: replySource,
          createdAt: new Date().toISOString(),
          status: 'delivered',
        },
      ])
      setSending(false)
      onPresenceChange('online')
    }, 700)
  }

  function reactToMessage(messageId: string, emoji: string) {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m
        const reactions = { ...(m.reactions || {}) }
        reactions[emoji] = (reactions[emoji] || 0) + 1
        return { ...m, reactions }
      })
    )
  }

  function votePoll(messageId: string, optionId: string) {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || !m.poll || m.poll.votedOptionId) return m
        return {
          ...m,
          poll: {
            ...m.poll,
            votedOptionId: optionId,
            options: m.poll.options.map((o) =>
              o.id === optionId ? { ...o, votes: o.votes + 1 } : o
            ),
          },
        }
      })
    )
  }

  return (
    <div className="ov-panel flex min-h-[640px] overflow-hidden rounded-[32px] lg:min-h-[720px]">
      <aside className="flex w-full max-w-[300px] flex-col border-r border-[var(--panel-border)] bg-[var(--chip)]/60">
        <div className="border-b border-[var(--panel-border)] p-4">
          <p className="ov-kicker">Messenger</p>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Чатове
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            GIF · стикери · глас · анкети · превод
            {ephemeral ? ' · ephemeral' : ''}
          </p>
          <div className="ov-input-wrap mt-3">
            <Search className="h-4 w-4 opacity-50" />
            <input
              className="ov-input"
              placeholder="Търси контакти"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto p-2">
          {filteredContacts.map((contact) => {
            const activeContact = contact.id === activeId
            return (
              <li key={contact.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(contact.id)}
                  className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                    activeContact
                      ? 'bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/35'
                      : 'hover:bg-[var(--chip)]'
                  }`}
                >
                  <span
                    className={`relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${contact.avatarTone} text-sm font-bold text-white`}
                  >
                    {contact.name.slice(0, 1)}
                    <span
                      className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--panel)] ${
                        contact.presence === 'offline'
                          ? 'bg-slate-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">
                        {contact.name}
                      </span>
                      <span className="text-[10px] text-[var(--muted)]">
                        {APP_LANGUAGES.find((l) => l.code === contact.language)
                          ?.flag || contact.language.toUpperCase()}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
                      {showPresence
                        ? `${presenceLabel(contact.presence)} · `
                        : ''}
                      {contact.lastPreview}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--panel-border)] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${active.avatarTone} text-sm font-bold text-white`}
            >
              {active.name.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{active.name}</p>
              <p className="text-xs text-[var(--muted)]">
                {myLang.flag}↔{peerLang.flag}
                {showPresence ? ` · ${presenceLabel(active.presence)}` : ''}
                {typingIndicators ? ' · typing on' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <select
              className="ov-field !w-auto !py-1.5 text-[11px]"
              value={active.language}
              onChange={(e) =>
                setContacts((prev) =>
                  prev.map((c) =>
                    c.id === activeId
                      ? { ...c, language: e.target.value }
                      : c
                  )
                )
              }
            >
              {APP_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="ov-icon-btn"
              title="Гласово обаждане"
              onClick={() => onStartVoiceCall(active.name)}
            >
              <Phone className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="ov-icon-btn"
              title="Видео обаждане"
              onClick={() => onStartVideoCall(active.name)}
            >
              <Video className="h-4 w-4" />
            </button>
            <button type="button" className="ov-icon-btn" title="Още">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          <div className="mx-auto max-w-[85%] rounded-2xl border border-[var(--panel-border)] bg-[var(--chip)] px-3 py-2 text-center text-[11px] text-[var(--muted)]">
            Auto-translate · GIF с двуезичен caption · deal cards · voice notes
          </div>

          {thread.map((msg) => (
            <RichMessageBubble
              key={msg.id}
              msg={msg}
              onReact={reactToMessage}
              onReply={(_id, preview) => setReplyPreview(preview)}
              onVote={votePoll}
            />
          ))}
          <div ref={endRef} />
        </div>

        {smartRepliesEnabled && smartReplies.length ? (
          <div className="flex flex-wrap gap-1.5 px-4 pb-2">
            {smartReplies.map((reply) => (
              <button
                key={reply}
                type="button"
                className="rounded-full bg-[var(--chip)] px-3 py-1 text-[11px] font-medium ring-1 ring-[var(--panel-border)] hover:bg-[var(--accent-soft)]"
                onClick={() => void pushOutgoing({ text: reply })}
              >
                {reply}
              </button>
            ))}
          </div>
        ) : null}

        {error ? (
          <p className="mx-4 mb-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-200">
            {error}
          </p>
        ) : null}

        <footer className="border-t border-[var(--panel-border)] p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTranslateLive((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                translateLive
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]/30'
                  : 'bg-[var(--chip)] text-[var(--muted)]'
              }`}
            >
              <Sparkles className="h-3 w-3" />
              Auto-translate {translateLive ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={() => setShowPhrases((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--chip)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)]"
            >
              <BookOpen className="h-3 w-3" />
              Phrasebook
            </button>
            <span className="text-[11px] text-[var(--muted)]">{displayName}</span>
          </div>

          {showPhrases ? (
            <div className="mb-2 flex flex-wrap gap-1.5 rounded-xl bg-[var(--chip)] p-2">
              {phrasebook.map((phrase) => (
                <button
                  key={phrase.id}
                  type="button"
                  className="rounded-lg bg-[var(--panel)] px-2 py-1 text-left text-[11px] hover:ring-1 hover:ring-[var(--accent)]/40"
                  onClick={() => void pushOutgoing({ text: phrase.text })}
                >
                  {phrase.text}
                </button>
              ))}
            </div>
          ) : null}

          <ChatComposer
            draft={draft}
            onDraftChange={setDraft}
            enterToSend={enterToSend}
            peerLanguage={active.language}
            replyPreview={replyPreview}
            onClearReply={() => setReplyPreview(null)}
            showDeal
            showClip
            onSend={(partial) => void pushOutgoing(partial)}
          />
        </footer>
      </section>
    </div>
  )
}
