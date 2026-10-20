'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  Ban,
  BellOff,
  ChevronDown,
  Copy,
  Headphones,
  Link2,
  LogOut,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Pencil,
  Phone,
  Pin,
  Search,
  Settings2,
  Sun,
  Trash2,
  UserPlus,
  Users,
  Video,
  Volume2,
  Waves,
} from 'lucide-react'
import ChatComposer from '@/components/ChatComposer'
import ContactImportModal from '@/components/ContactImportModal'
import ContextMenu, { type ContextMenuItem } from '@/components/ContextMenu'
import ProfileHub from '@/components/ProfileHub'
import RichMessageBubble from '@/components/RichMessageBubble'
import SettingsPanel from '@/components/SettingsPanel'
import type { Conversation, ConversationMessage, InviteLink } from '@/lib/auth-types'
import { hasFullAccess, isAdminUser, needsCheckout } from '@/lib/access'
import {
  fetchBackendUser,
  isClientBackendEnabled,
  signOutBackend,
} from '@/lib/auth-client'
import { activeStories, getMood } from '@/lib/profile-social'
import { presenceLabel } from '@/lib/smart-replies'
import { useTheme } from '@/lib/theme'

export default function DashboardPage() {
  const router = useRouter()
  const { theme, toggleTheme, prefs, updatePrefs, hydrated } = useTheme()
  const user = prefs.user
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState(prefs.conversations[0]?.id || '')
  const [draft, setDraft] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [tab, setTab] = useState<'chats' | 'subscribers' | 'blocked'>('chats')
  const [inboxFilter, setInboxFilter] = useState<
    'all' | 'unread' | 'groups' | 'archived'
  >('all')
  const [replyPreview, setReplyPreview] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [ctxMenu, setCtxMenu] = useState<{
    x: number
    y: number
    type: 'room' | 'subscriber'
    id: string
  } | null>(null)
  const admin = isAdminUser(user)
  const fullAccess = hasFullAccess(user)
  const mood = getMood(prefs.profileSocial?.moodId)
  const myStories = activeStories(prefs.profileSocial?.stories || [])

  useEffect(() => {
    if (!hydrated) return
    if (!isClientBackendEnabled()) {
      if (!user) {
        router.replace('/register')
        return
      }
      if (needsCheckout(user)) {
        router.replace(`/checkout?plan=${user.plan}`)
      }
      return
    }
    void fetchBackendUser().then((backendUser) => {
      if (!backendUser) {
        if (!user) router.replace('/login')
        return
      }
      updatePrefs({ user: { ...backendUser, password: '' } })
      if (needsCheckout(backendUser)) {
        router.replace(`/checkout?plan=${backendUser.plan}`)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once
  }, [hydrated, router])

  useEffect(() => {
    if (!activeId && prefs.conversations[0]) {
      setActiveId(prefs.conversations[0].id)
    }
  }, [prefs.conversations, activeId])

  const conversations = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = [...prefs.conversations].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.updatedAt.localeCompare(a.updatedAt)
    })
    if (inboxFilter === 'archived') {
      list = list.filter((c) => c.archived)
    } else {
      list = list.filter((c) => !c.archived)
      if (inboxFilter === 'unread') list = list.filter((c) => c.unread > 0)
      if (inboxFilter === 'groups') list = list.filter((c) => c.isGroup)
    }
    if (!q) return list
    return list.filter((item) => item.title.toLowerCase().includes(q))
  }, [prefs.conversations, query, inboxFilter])

  const active = prefs.conversations.find((item) => item.id === activeId)
  const subscribers = prefs.subscribers.filter((sub) => sub.status !== 'blocked')

  function patchConversation(id: string, patch: Partial<Conversation>) {
    updatePrefs({
      conversations: prefs.conversations.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    })
  }

  function appendMessage(
    partial: Omit<ConversationMessage, 'id' | 'createdAt' | 'fromMe' | 'status'>
  ) {
    if (!active) return
    const msg: ConversationMessage = {
      id: `msg_${Date.now()}`,
      fromMe: true,
      createdAt: new Date().toISOString(),
      status: 'sent',
      ...partial,
    }
    patchConversation(active.id, {
      lastMessage: msg.text,
      updatedAt: msg.createdAt,
      unread: 0,
      messages: [...active.messages, msg],
    })
  }

  function reactToMessage(messageId: string, emoji: string) {
    if (!active) return
    patchConversation(active.id, {
      messages: active.messages.map((m) => {
        if (m.id !== messageId) return m
        const reactions = { ...(m.reactions || {}) }
        reactions[emoji] = (reactions[emoji] || 0) + 1
        return { ...m, reactions }
      }),
    })
  }

  function votePoll(messageId: string, optionId: string) {
    if (!active) return
    patchConversation(active.id, {
      messages: active.messages.map((m) => {
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
      }),
    })
  }

  function startConversationFromSubscriber(subId: string) {
    const sub = prefs.subscribers.find((item) => item.id === subId)
    if (!sub) return
    const existing = prefs.conversations.find(
      (conv) => !conv.isGroup && conv.title === sub.name
    )
    if (existing) {
      setActiveId(existing.id)
      setTab('chats')
      return
    }
    const conv: Conversation = {
      id: `conv_${Date.now()}`,
      title: sub.name,
      isGroup: false,
      members: [
        {
          id: sub.id,
          name: sub.name,
          language: sub.language,
          presence: sub.presence || 'offline',
          avatarDataUrl: sub.avatarDataUrl,
        },
      ],
      lastMessage: 'Нов разговор',
      updatedAt: '2026-10-19T15:00:00.000Z',
      unread: 0,
      pinned: false,
      muted: false,
      saveChat: true,
      disappearAfter: 'off',
      sessionOpen: true,
      activeGuestIds: [],
      messages: [],
    }
    updatePrefs({ conversations: [conv, ...prefs.conversations] })
    setActiveId(conv.id)
    setTab('chats')
  }

  function blockSubscriber(subId: string) {
    const sub = prefs.subscribers.find((item) => item.id === subId)
    if (!sub) return
    updatePrefs({
      subscribers: prefs.subscribers.map((item) =>
        item.id === subId ? { ...item, status: 'blocked' } : item
      ),
      blocked: [
        {
          id: sub.id,
          name: sub.name,
          reason: 'Ръчно блокиран',
          blockedAt: new Date().toISOString(),
        },
        ...prefs.blocked,
      ],
    })
  }

  function removeSubscriber(subId: string) {
    if (!window.confirm('Премахни абоната от списъка?')) return
    updatePrefs({
      subscribers: prefs.subscribers.filter((item) => item.id !== subId),
    })
  }

  async function deleteRoom(roomId: string) {
    if (!window.confirm('Изтрий стаята завинаги? Това маха чата и поканите.')) {
      return
    }
    if (isClientBackendEnabled() && /^[0-9a-f-]{36}$/i.test(roomId)) {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        window.alert(data.error || 'Неуспешно изтриване от сървъра')
        return
      }
    }
    const next = prefs.conversations.filter((c) => c.id !== roomId)
    updatePrefs({
      conversations: next,
      invites: (prefs.invites || []).filter((i) => i.conversationId !== roomId),
    })
    if (activeId === roomId) setActiveId(next[0]?.id || '')
  }

  async function renameRoom(roomId: string) {
    const conv = prefs.conversations.find((c) => c.id === roomId)
    if (!conv) return
    const title = window.prompt('Ново име на стаята', conv.title)
    if (!title?.trim()) return
    patchConversation(roomId, { title: title.trim() })
    if (isClientBackendEnabled() && /^[0-9a-f-]{36}$/i.test(roomId)) {
      await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: title.trim() }),
      })
    }
  }

  async function endRoomSession(roomId: string) {
    patchConversation(roomId, { sessionOpen: false, activeGuestIds: [] })
    if (isClientBackendEnabled() && /^[0-9a-f-]{36}$/i.test(roomId)) {
      await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ session_open: false }),
      })
    }
  }

  function roomContextItems(roomId: string): ContextMenuItem[] {
    const conv = prefs.conversations.find((c) => c.id === roomId)
    if (!conv) return []
    return [
      {
        id: 'open',
        label: 'Отвори',
        icon: MessageCircle,
        onClick: () => {
          setActiveId(roomId)
          setTab('chats')
        },
      },
      {
        id: 'enter',
        label: 'Влез в стаята',
        icon: Video,
        onClick: () => router.push(`/room/${roomId}?video=1`),
      },
      {
        id: 'invite',
        label: 'Покани гост',
        icon: Link2,
        onClick: () => void createInvite(undefined, roomId),
      },
      { id: 'sep1', label: '', separator: true },
      {
        id: 'pin',
        label: conv.pinned ? 'Unpin' : 'Pin',
        icon: Pin,
        onClick: () => patchConversation(roomId, { pinned: !conv.pinned }),
      },
      {
        id: 'mute',
        label: conv.muted ? 'Unmute' : 'Mute',
        icon: BellOff,
        onClick: () => patchConversation(roomId, { muted: !conv.muted }),
      },
      {
        id: 'unread',
        label: 'Маркирай като непрочетено',
        icon: MessageCircle,
        onClick: () => patchConversation(roomId, { unread: Math.max(1, conv.unread) }),
      },
      {
        id: 'rename',
        label: 'Преименувай',
        icon: Pencil,
        onClick: () => void renameRoom(roomId),
      },
      {
        id: 'archive',
        label: conv.archived ? 'Извади от архив' : 'Архивирай',
        icon: Archive,
        onClick: () =>
          patchConversation(roomId, { archived: !conv.archived }),
      },
      { id: 'sep2', label: '', separator: true },
      {
        id: 'end',
        label: 'Приключи сесия (kick гости)',
        icon: Phone,
        onClick: () => void endRoomSession(roomId),
      },
      {
        id: 'copy',
        label: 'Копирай room id',
        icon: Copy,
        onClick: () => void navigator.clipboard.writeText(roomId),
      },
      {
        id: 'delete',
        label: 'Изтрий стаята',
        icon: Trash2,
        danger: true,
        onClick: () => void deleteRoom(roomId),
      },
    ]
  }

  function subscriberContextItems(subId: string): ContextMenuItem[] {
    const sub = prefs.subscribers.find((s) => s.id === subId)
    if (!sub) return []
    return [
      {
        id: 'msg',
        label: 'Отвори чат',
        icon: MessageCircle,
        onClick: () => startConversationFromSubscriber(subId),
      },
      {
        id: 'invite',
        label: 'Покани с линк',
        icon: Link2,
        onClick: () => {
          startConversationFromSubscriber(subId)
          const existing = prefs.conversations.find(
            (c) => !c.isGroup && c.title === sub.name
          )
          void createInvite(subId, existing?.id)
        },
      },
      {
        id: 'call',
        label: 'Гласово обаждане',
        icon: Phone,
        onClick: () => {
          startConversationFromSubscriber(subId)
          const existing = prefs.conversations.find(
            (c) => !c.isGroup && c.title === sub.name
          )
          if (existing) router.push(`/room/${existing.id}`)
        },
      },
      {
        id: 'video',
        label: 'Видео обаждане',
        icon: Video,
        onClick: () => {
          startConversationFromSubscriber(subId)
          const existing = prefs.conversations.find(
            (c) => !c.isGroup && c.title === sub.name
          )
          if (existing) router.push(`/room/${existing.id}?video=1`)
        },
      },
      { id: 'sep1', label: '', separator: true },
      {
        id: 'copy-email',
        label: 'Копирай email',
        icon: Copy,
        onClick: () => void navigator.clipboard.writeText(sub.email || ''),
      },
      {
        id: 'pause',
        label: sub.status === 'paused' ? 'Активирай' : 'Пауза',
        icon: BellOff,
        onClick: () =>
          updatePrefs({
            subscribers: prefs.subscribers.map((s) =>
              s.id === subId
                ? {
                    ...s,
                    status: s.status === 'paused' ? 'active' : 'paused',
                  }
                : s
            ),
          }),
      },
      { id: 'sep2', label: '', separator: true },
      {
        id: 'block',
        label: 'Блокирай',
        icon: Ban,
        danger: true,
        onClick: () => blockSubscriber(subId),
      },
      {
        id: 'remove',
        label: 'Премахни от списъка',
        icon: Trash2,
        danger: true,
        onClick: () => removeSubscriber(subId),
      },
    ]
  }

  async function createInvite(forSubscriberId?: string, conversationId?: string) {
    if (!user) return
    const targetId = conversationId || activeId
    const target = prefs.conversations.find((item) => item.id === targetId)
    const sub = forSubscriberId
      ? prefs.subscribers.find((item) => item.id === forSubscriberId)
      : undefined

    if (isClientBackendEnabled()) {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          roomId: target && /^[0-9a-f-]{36}$/i.test(target.id) ? target.id : undefined,
          createRoom: true,
          roomTitle: target?.title || sub?.name || 'Guest room',
          label: `Покана за ${target?.title || sub?.name || 'гост'}`,
          channel: 'both',
          prefillName: sub?.name,
          prefillLanguage: sub?.language,
        }),
      })
      const data = (await res.json()) as {
        url?: string
        error?: string
        roomId?: string
        invite?: { id: string; code: string; room_id: string; label: string }
      }
      if (!res.ok || !data.url || !data.invite) {
        window.alert(data.error || 'Неуспешна покана — провери Supabase.')
        return
      }
      const invite: InviteLink = {
        id: data.invite.id,
        code: data.invite.code,
        conversationId: data.invite.room_id,
        label: data.invite.label,
        channel: 'both',
        prefillName: sub?.name,
        prefillLanguage: sub?.language,
        createdAt: new Date().toISOString(),
        active: true,
      }
      updatePrefs({
        invites: [invite, ...(prefs.invites || [])],
        conversations: [
          {
            id: data.invite.room_id,
            title: target?.title || sub?.name || 'Guest room',
            isGroup: false,
            members: [],
            lastMessage: 'Сървърна стая създадена',
            updatedAt: new Date().toISOString(),
            unread: 0,
            pinned: false,
            muted: false,
            messages: [],
            saveChat: true,
            disappearAfter: 'off',
            sessionOpen: true,
            activeGuestIds: [],
          },
          ...prefs.conversations.filter((c) => c.id !== data.invite!.room_id),
        ],
      })
      setActiveId(data.invite.room_id)
      void navigator.clipboard.writeText(data.url)
      setInviteCopied(true)
      window.setTimeout(() => setInviteCopied(false), 1800)
      return
    }

    if (!target) return
    const code = `inv_${Math.random().toString(36).slice(2, 8)}`
    const invite: InviteLink = {
      id: `invite_${Date.now()}`,
      code,
      conversationId: target.id,
      label: `Покана за ${target.title}`,
      channel: 'both',
      prefillName: sub?.name,
      prefillLanguage: sub?.language,
      createdAt: new Date().toISOString(),
      active: true,
    }
    updatePrefs({
      invites: [invite, ...(prefs.invites || [])],
      conversations: prefs.conversations.map((item) =>
        item.id === target.id ? { ...item, sessionOpen: true } : item
      ),
    })
    const origin = window.location.origin
    const urlParams = new URLSearchParams({
      invite: code,
      conv: target.id,
      channel: 'both',
    })
    if (sub?.name) urlParams.set('name', sub.name)
    if (sub?.language) urlParams.set('lang', sub.language)
    const url = `${origin}/join?${urlParams.toString()}`
    void navigator.clipboard.writeText(url)
    setInviteCopied(true)
    window.setTimeout(() => setInviteCopied(false), 1800)
  }

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">
        Зареждане…
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--panel-border)] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={`relative h-11 w-11 overflow-hidden rounded-full bg-[var(--accent-soft)] ${
              myStories.length
                ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[var(--background)]'
                : 'ring-1 ring-[var(--panel-border)]'
            }`}
            onClick={() => setProfileOpen(true)}
            title="Профил · Stories · настроение"
          >
            {user.avatarDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarDataUrl}
                alt={user.displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm font-bold text-[var(--accent)]">
                {user.displayName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-[var(--panel)] px-0.5 text-[10px] shadow">
              {mood.emoji}
            </span>
          </button>
          <button
            type="button"
            className="min-w-0 text-left"
            onClick={() => setProfileOpen(true)}
          >
            <p className="truncate text-sm font-semibold">{user.displayName}</p>
            <p className="truncate text-[11px] text-[var(--muted)]">
              {mood.labelBg} · {admin ? 'Admin' : user.plan}
              {fullAccess ? ' · active' : ' · unpaid'}
            </p>
          </button>
        </div>

        <div className="relative flex items-center gap-2">
          <button type="button" className="ov-icon-btn" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="ov-btn-ghost !px-3 !py-1.5 text-xs"
            onClick={() => setMenuOpen((v) => !v)}
          >
            Меню <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {menuOpen ? (
            <div className="ov-panel absolute right-0 top-12 z-40 w-64 rounded-2xl p-2 shadow-2xl">
              <MenuItem
                icon={Headphones}
                label="Настройки на стая"
                onClick={() => {
                  setMenuOpen(false)
                  setSettingsOpen(true)
                }}
              />
              <MenuItem
                icon={Volume2}
                label="Звук / музика"
                onClick={() => {
                  setMenuOpen(false)
                  setSettingsOpen(true)
                }}
              />
              <MenuItem
                icon={Ban}
                label="Блокирани абонати"
                onClick={() => {
                  setMenuOpen(false)
                  setTab('blocked')
                }}
              />
              <MenuItem
                icon={UserPlus}
                label="Импорт контакти"
                onClick={() => {
                  setMenuOpen(false)
                  setImportOpen(true)
                }}
              />
              <MenuItem
                icon={Link2}
                label={inviteCopied ? 'Линкът е копиран' : 'Покани с линк'}
                onClick={() => {
                  createInvite()
                  setMenuOpen(false)
                }}
              />
              <MenuItem
                icon={Settings2}
                label="Всички фини настройки"
                onClick={() => {
                  setMenuOpen(false)
                  setSettingsOpen(true)
                }}
              />
              <MenuItem
                icon={LogOut}
                label="Изход"
                onClick={() => {
                  void signOutBackend().finally(() => {
                    updatePrefs({ user: null })
                    router.push('/login')
                  })
                }}
              />
            </div>
          ) : null}
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 overflow-hidden lg:grid-cols-[340px_1fr]">
        <aside className="flex flex-col border-r border-[var(--panel-border)] bg-[var(--chip)]/40">
          <div className="border-b border-[var(--panel-border)] p-3">
            <div className="flex items-center gap-2">
              <Waves className="h-4 w-4 text-[var(--accent)]" />
              <p className="text-sm font-semibold">Messenger dashboard</p>
            </div>
            <div className="ov-input-wrap mt-3">
              <Search className="h-4 w-4 opacity-50" />
              <input
                className="ov-input"
                placeholder="Търси…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="mt-3 flex gap-1 rounded-full bg-[var(--chip)] p-1">
              {(
                [
                  ['chats', 'Чатове'],
                  ['subscribers', 'Абонати'],
                  ['blocked', 'Блокирани'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex-1 rounded-full px-2 py-1.5 text-[11px] font-semibold ${
                    tab === id
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'text-[var(--muted)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === 'chats' ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {(
                  [
                    ['all', 'Всички'],
                    ['unread', 'Непрочетени'],
                    ['groups', 'Групи'],
                    ['archived', 'Архив'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setInboxFilter(id)}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      inboxFilter === id
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'text-[var(--muted)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {tab === 'chats' &&
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setActiveId(conv.id)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setCtxMenu({
                      x: e.clientX,
                      y: e.clientY,
                      type: 'room',
                      id: conv.id,
                    })
                  }}
                  onTouchStart={(e) => {
                    const touch = e.touches[0]
                    const timer = window.setTimeout(() => {
                      setCtxMenu({
                        x: touch.clientX,
                        y: touch.clientY,
                        type: 'room',
                        id: conv.id,
                      })
                    }, 550)
                    const clear = () => window.clearTimeout(timer)
                    e.currentTarget.addEventListener('touchend', clear, {
                      once: true,
                    })
                    e.currentTarget.addEventListener('touchmove', clear, {
                      once: true,
                    })
                  }}
                  className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ${
                    activeId === conv.id
                      ? 'bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/30'
                      : 'hover:bg-[var(--chip)]'
                  }`}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-700 text-sm font-bold text-white">
                    {conv.isGroup ? <Users className="h-4 w-4" /> : conv.title.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">
                        {conv.title}
                      </span>
                      <span className="flex items-center gap-1">
                        {conv.muted ? (
                          <BellOff className="h-3 w-3 text-[var(--muted)]" />
                        ) : null}
                        {conv.pinned ? (
                          <Pin className="h-3 w-3 text-[var(--accent)]" />
                        ) : null}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
                      {conv.lastMessage}
                    </span>
                  </span>
                  {conv.unread > 0 ? (
                    <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent-ink)]">
                      {conv.unread}
                    </span>
                  ) : null}
                </button>
              ))}

            {tab === 'subscribers' &&
              subscribers.map((sub) => (
                <div
                  key={sub.id}
                  className="mb-1 flex items-center gap-2 rounded-2xl px-3 py-2.5 hover:bg-[var(--chip)]"
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setCtxMenu({
                      x: e.clientX,
                      y: e.clientY,
                      type: 'subscriber',
                      id: sub.id,
                    })
                  }}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => startConversationFromSubscriber(sub.id)}
                  >
                    <p className="truncate text-sm font-semibold">{sub.name}</p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {presenceLabel(sub.presence || 'offline')} ·{' '}
                      {sub.source || 'manual'}
                    </p>
                  </button>
                  <button
                    type="button"
                    className="ov-icon-btn"
                    title="Покани с линк"
                    onClick={() => {
                      const existing = prefs.conversations.find(
                        (conv) => !conv.isGroup && conv.title === sub.name
                      )
                      if (existing) {
                        setActiveId(existing.id)
                        createInvite(sub.id, existing.id)
                        return
                      }
                      const convId = `conv_${Date.now()}`
                      const conv: Conversation = {
                        id: convId,
                        title: sub.name,
                        isGroup: false,
                        members: [
                          {
                            id: sub.id,
                            name: sub.name,
                            language: sub.language,
                            presence: sub.presence || 'offline',
                            avatarDataUrl: sub.avatarDataUrl,
                          },
                        ],
                        lastMessage: 'Нов разговор',
                        updatedAt: '2026-10-19T15:00:00.000Z',
                        unread: 0,
                        pinned: false,
                        muted: false,
                        saveChat: true,
                        disappearAfter: 'off',
                        sessionOpen: true,
                        activeGuestIds: [],
                        messages: [],
                      }
                      updatePrefs({
                        conversations: [conv, ...prefs.conversations],
                      })
                      setActiveId(convId)
                      setTab('chats')
                      window.setTimeout(
                        () => createInvite(sub.id, convId),
                        0
                      )
                    }}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="ov-icon-btn"
                    title="Блокирай"
                    onClick={() => blockSubscriber(sub.id)}
                  >
                    <Ban className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

            {tab === 'blocked' &&
              (prefs.blocked.length ? (
                prefs.blocked.map((item) => (
                  <div
                    key={item.id}
                    className="mb-1 rounded-2xl px-3 py-2.5 text-sm hover:bg-[var(--chip)]"
                  >
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-[var(--muted)]">{item.reason}</p>
                  </div>
                ))
              ) : (
                <p className="px-3 py-6 text-center text-xs text-[var(--muted)]">
                  Няма блокирани абонати
                </p>
              ))}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          {active ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-[var(--panel-border)] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{active.title}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {active.isGroup
                      ? `${active.members.length} участници`
                      : presenceLabel(active.members[0]?.presence || 'online')}
                    {' · '}
                    чат {active.saveChat ? 'се пази' : 'не се пази'}
                    {active.disappearAfter !== 'off'
                      ? ` · изчезва след ${active.disappearAfter}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/room/${active.id}`}
                    className="ov-icon-btn"
                    title="Гласово в стая"
                  >
                    <Phone className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/room/${active.id}?video=1`}
                    className="ov-icon-btn"
                    title="Видео стая"
                  >
                    <Video className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    className="ov-icon-btn"
                    title="Опции за стаята"
                    onClick={(e) =>
                      setCtxMenu({
                        x: e.clientX,
                        y: e.clientY,
                        type: 'room',
                        id: active.id,
                      })
                    }
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-b border-[var(--panel-border)] px-4 py-2">
                <label className="inline-flex items-center gap-2 rounded-full bg-[var(--chip)] px-3 py-1 text-[11px]">
                  <input
                    type="checkbox"
                    checked={active.saveChat}
                    onChange={(e) =>
                      patchConversation(active.id, {
                        saveChat: e.target.checked,
                      })
                    }
                  />
                  Запази чата
                </label>
                <select
                  className="ov-field !w-auto !py-1 text-[11px]"
                  value={active.disappearAfter}
                  onChange={(e) =>
                    patchConversation(active.id, {
                      disappearAfter: e.target
                        .value as Conversation['disappearAfter'],
                    })
                  }
                >
                  <option value="off">Без изчезване</option>
                  <option value="1h">Изчезване 1ч</option>
                  <option value="24h">Изчезване 24ч</option>
                  <option value="7d">Изчезване 7д</option>
                </select>
                <button
                  type="button"
                  className="ov-btn-ghost !px-3 !py-1 text-[11px]"
                  onClick={() => createInvite()}
                >
                  <Link2 className="h-3 w-3" />
                  {inviteCopied ? 'Копирано' : 'Покани гост'}
                </button>
                <Link
                  href={`/room/${active.id}`}
                  className="ov-btn-primary !px-3 !py-1 text-[11px]"
                  onClick={() =>
                    patchConversation(active.id, { sessionOpen: true })
                  }
                >
                  Влез в стаята
                </Link>
              </div>

              <div className="flex gap-2 overflow-x-auto border-b border-[var(--panel-border)] px-4 py-2">
                <button
                  type="button"
                  className="flex shrink-0 flex-col items-center gap-1"
                  onClick={() => setProfileOpen(true)}
                  title="Добави Story"
                >
                  <span
                    className={`relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-700 text-xs font-bold text-white ${
                      myStories.length
                        ? 'ring-2 ring-amber-400'
                        : 'ring-2 ring-[var(--accent)]/40'
                    }`}
                  >
                    {user.displayName.slice(0, 1)}
                    <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-[var(--accent)] px-1 text-[9px] text-[var(--accent-ink)]">
                      +
                    </span>
                  </span>
                  <span className="text-[10px] text-[var(--muted)]">Моята</span>
                </button>
                {myStories.slice(0, 6).map((story) => (
                  <button
                    key={story.id}
                    type="button"
                    className="flex shrink-0 flex-col items-center gap-1"
                    onClick={() => setProfileOpen(true)}
                  >
                    <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full ring-2 ring-amber-400">
                      {story.type === 'image' && story.imageDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={story.imageDataUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="bg-gradient-to-br from-indigo-500 to-fuchsia-600 px-1 text-center text-[8px] text-white">
                          {story.text?.slice(0, 10)}
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">24ч</span>
                  </button>
                ))}
                {[
                  { name: 'Live', tone: 'from-rose-400 to-orange-500', label: 'ON AIR' },
                  { name: 'Deal', tone: 'from-amber-400 to-yellow-600', label: 'CRM' },
                ].map((story) => (
                  <button
                    key={story.name}
                    type="button"
                    className="flex shrink-0 flex-col items-center gap-1"
                    onClick={() =>
                      appendMessage({ text: `📡 Status: ${story.label}` })
                    }
                  >
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${story.tone} text-xs font-bold text-white`}
                    >
                      {story.name.slice(0, 1)}
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">
                      {story.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {active.messages.map((msg) => (
                  <RichMessageBubble
                    key={msg.id}
                    msg={msg}
                    enableReactions={prefs.chat.reactions}
                    onReact={reactToMessage}
                    onReply={(_id, preview) => setReplyPreview(preview)}
                    onVote={votePoll}
                  />
                ))}
              </div>

              <footer className="border-t border-[var(--panel-border)] p-3">
                <ChatComposer
                  draft={draft}
                  onDraftChange={setDraft}
                  enterToSend={prefs.chat.enterToSend}
                  peerLanguage={active.members[0]?.language || user?.nativeLanguage || 'bg'}
                  replyPreview={replyPreview}
                  onClearReply={() => setReplyPreview(null)}
                  showDeal={user?.plan === 'business' || admin}
                  showClip={user?.plan === 'podcast' || admin}
                  onSend={(partial) => appendMessage(partial)}
                />
              </footer>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <MessageCircle className="h-8 w-8 text-[var(--accent)]" />
              <p className="mt-3 text-sm font-semibold">Избери разговор</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Или отвори абонат и започни нов чат
              </p>
            </div>
          )}
        </section>
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenRegister={() => router.push('/register')}
      />
      <ContactImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      <ProfileHub
        open={profileOpen}
        user={user}
        social={prefs.profileSocial || { moodId: 'focused', bio: '', locationLabel: '', streakDays: 0, stories: [], showOnMap: false, publicProfile: true }}
        presence={prefs.presence}
        onClose={() => setProfileOpen(false)}
        onUpdateUser={(patch) => updatePrefs({ user: { ...user, ...patch } })}
        onUpdateSocial={(patch) =>
          updatePrefs({
            profileSocial: { ...prefs.profileSocial, ...patch },
          })
        }
        onPresenceChange={(presence) => updatePrefs({ presence })}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <ContextMenu
        open={Boolean(ctxMenu)}
        x={ctxMenu?.x || 0}
        y={ctxMenu?.y || 0}
        onClose={() => setCtxMenu(null)}
        items={
          ctxMenu?.type === 'room'
            ? roomContextItems(ctxMenu.id)
            : ctxMenu?.type === 'subscriber'
              ? subscriberContextItems(ctxMenu.id)
              : []
        }
      />
    </div>
  )
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Settings2
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--chip)]"
    >
      <Icon className="h-4 w-4 text-[var(--muted)]" />
      {label}
    </button>
  )
}
