'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type DragEvent } from 'react'
import {
  Archive,
  Ban,
  BellOff,
  Camera,
  ChevronDown,
  Copy,
  DoorOpen,
  Headphones,
  Link2,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Pencil,
  Phone,
  Pin,
  Plus,
  Radio,
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
import AppearancePanel from '@/components/AppearancePanel'
import ChatComposer from '@/components/ChatComposer'
import CreateRoomWizard, {
  type CreateRoomDraft,
} from '@/components/CreateRoomWizard'
import ContactImportModal from '@/components/ContactImportModal'
import ContextMenu, { type ContextMenuItem } from '@/components/ContextMenu'
import FriendshipProfile from '@/components/FriendshipProfile'
import MemoriesVault from '@/components/MemoriesVault'
import MoodAvatar from '@/components/MoodAvatar'
import ProfileHub from '@/components/ProfileHub'
import QuickCapture from '@/components/QuickCapture'
import RichMessageBubble from '@/components/RichMessageBubble'
import SettingsPanel from '@/components/SettingsPanel'
import SpotlightFeed from '@/components/SpotlightFeed'
import StudioMap from '@/components/StudioMap'
import type {
  Conversation,
  ConversationMessage,
  InviteLink,
  JoinRequest,
} from '@/lib/auth-types'
import { hasFullAccess, isAdminUser, needsCheckout } from '@/lib/access'
import {
  fetchBackendUser,
  isClientBackendEnabled,
  signOutBackend,
} from '@/lib/auth-client'
import { activeStories, createStory, getMood } from '@/lib/profile-social'
import {
  DEFAULT_SNAP_PLUS,
  buildMapNodes,
  bumpFriendship,
  ensureFriendship,
} from '@/lib/snap-plus'
import { presenceLabel } from '@/lib/smart-replies'
import { useTheme } from '@/lib/theme'

export default function DashboardPage() {
  const router = useRouter()
  const {
    theme,
    toggleTheme,
    prefs,
    updatePrefs,
    hydrated,
    appearance,
    setAppearance,
  } = useTheme()
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [createRoomOpen, setCreateRoomOpen] = useState(false)
  const [creatingRoom, setCreatingRoom] = useState(false)
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
  const [captureOpen, setCaptureOpen] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [memoriesOpen, setMemoriesOpen] = useState(false)
  const [spotlightOpen, setSpotlightOpen] = useState(false)
  const [friendshipId, setFriendshipId] = useState<string | null>(null)
  const [ctxMenu, setCtxMenu] = useState<{
    x: number
    y: number
    type: 'room' | 'subscriber'
    id: string
  } | null>(null)
  const [dragSubId, setDragSubId] = useState<string | null>(null)
  const [dropOverId, setDropOverId] = useState<string | null>(null)
  const [dragToast, setDragToast] = useState<string | null>(null)
  const admin = isAdminUser(user)
  const fullAccess = hasFullAccess(user)
  const mood = getMood(prefs.profileSocial?.moodId)
  const snap = prefs.snapPlus || DEFAULT_SNAP_PLUS
  const [myStories, setMyStories] = useState(
    () => prefs.profileSocial?.stories || []
  )
  useEffect(() => {
    setMyStories(activeStories(prefs.profileSocial?.stories || []))
  }, [prefs.profileSocial?.stories])

  const mapNodes = useMemo(() => {
    if (!user) return []
    return buildMapNodes({
      meName: user.displayName,
      meMood: prefs.profileSocial?.moodId || 'focused',
      mePresence: prefs.presence,
      meLocation: prefs.profileSocial?.locationLabel || 'Studio',
      showMe: Boolean(prefs.profileSocial?.showOnMap ?? true),
      people: prefs.subscribers
        .filter((s) => s.status !== 'blocked')
        .slice(0, 6)
        .map((s) => ({
          id: s.id,
          name: s.name,
          presence: s.presence || 'offline',
          language: s.language,
        })),
    })
  }, [user, prefs.profileSocial, prefs.presence, prefs.subscribers])

  const friendshipTarget = useMemo(() => {
    if (!friendshipId) return null
    const sub = prefs.subscribers.find((s) => s.id === friendshipId)
    if (sub) {
      return {
        id: sub.id,
        name: sub.name,
        language: sub.language,
        presence: sub.presence || 'offline',
        avatarUrl: sub.avatarDataUrl,
      }
    }
    const conv = prefs.conversations.find((c) => c.id === friendshipId)
    if (conv) {
      return {
        id: conv.id,
        name: conv.title,
        language: conv.members[0]?.language || 'bg',
        presence: conv.members[0]?.presence || 'online',
        avatarUrl: conv.members[0]?.avatarDataUrl,
      }
    }
    return null
  }, [friendshipId, prefs.subscribers, prefs.conversations])

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
    const contactKey = active.members[0]?.id || active.id
    const prev = ensureFriendship(snap, contactKey)
    updatePrefs({
      snapPlus: bumpFriendship(snap, contactKey, {
        messagesExchanged: prev.messagesExchanged + 1,
        lastInteractionAt: msg.createdAt,
        streakDays: Math.max(prev.streakDays, 1),
        languagesUsed: Array.from(
          new Set([
            ...prev.languagesUsed,
            user?.nativeLanguage || 'bg',
            active.members[0]?.language || 'en',
          ])
        ),
      }),
    })
  }

  function patchSnap(patch: Partial<typeof snap>) {
    updatePrefs({ snapPlus: { ...snap, ...patch } })
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

  function showDragToast(text: string) {
    setDragToast(text)
    window.setTimeout(() => setDragToast(null), 2200)
  }

  function addSubscriberToConversation(subId: string, conversationId: string) {
    const sub = prefs.subscribers.find((item) => item.id === subId)
    const conv = prefs.conversations.find((item) => item.id === conversationId)
    if (!sub || !conv) return

    if (conv.members.some((m) => m.id === sub.id)) {
      setActiveId(conversationId)
      setTab('chats')
      showDragToast(`${sub.name} вече е в стаята`)
      return
    }

    const member = {
      id: sub.id,
      name: sub.name,
      language: sub.language,
      presence: sub.presence || 'offline',
      avatarDataUrl: sub.avatarDataUrl,
    }
    const nextMembers = [...conv.members, member]
    const becomesGroup = nextMembers.length > 1 || conv.isGroup
    const now = new Date().toISOString()

    updatePrefs({
      conversations: prefs.conversations.map((item) =>
        item.id === conversationId
          ? {
              ...item,
              members: nextMembers,
              isGroup: becomesGroup,
              lastMessage: `${sub.name} е добавен/а в стаята`,
              updatedAt: now,
              messages: [
                ...item.messages,
                {
                  id: `msg_${Date.now()}`,
                  fromMe: true,
                  text: `👤 ${sub.name} е добавен/а чрез плъзгане`,
                  createdAt: now,
                  status: 'sent' as const,
                },
              ],
            }
          : item
      ),
    })
    setActiveId(conversationId)
    setTab('chats')
    showDragToast(`${sub.name} → ${conv.title}`)
  }

  function onSubscriberDragStart(subId: string, e: DragEvent) {
    setDragSubId(subId)
    e.dataTransfer.setData('text/omnivvoice-subscriber', subId)
    e.dataTransfer.effectAllowed = 'copy'
  }

  function onSubscriberDragEnd() {
    setDragSubId(null)
    setDropOverId(null)
  }

  function roomDropHandlers(conversationId: string) {
    return {
      onDragOver: (e: DragEvent) => {
        if (
          !dragSubId &&
          !e.dataTransfer.types.includes('text/omnivvoice-subscriber')
        ) {
          return
        }
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
        setDropOverId(conversationId)
      },
      onDragLeave: (e: DragEvent) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setDropOverId((id) => (id === conversationId ? null : id))
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault()
        const subId =
          e.dataTransfer.getData('text/omnivvoice-subscriber') || dragSubId
        setDropOverId(null)
        setDragSubId(null)
        if (subId) addSubscriberToConversation(subId, conversationId)
      },
    }
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
        id: 'friendship',
        label: 'Friendship Profile',
        icon: Users,
        onClick: () => setFriendshipId(roomId),
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

  function openRoomForSubscriberKnock(subId?: string) {
    if (active && active.sessionOpen !== false) return active
    const open = prefs.conversations.find((c) => c.sessionOpen !== false)
    if (open) {
      setActiveId(open.id)
      return open
    }
    if (subId) {
      startConversationFromSubscriber(subId)
      return prefs.conversations.find(
        (c) =>
          !c.isGroup &&
          c.title === prefs.subscribers.find((s) => s.id === subId)?.name
      )
    }
    return undefined
  }

  /** Subscriber asks to enter an open room (knock) — host admits in the live room */
  function subscriberRequestEnter(subId: string) {
    const sub = prefs.subscribers.find((s) => s.id === subId)
    const room = openRoomForSubscriberKnock(subId)
    if (!sub || !room) {
      showDragToast('Няма отворена стая')
      return
    }
    const pending = (room.joinRequests || []).find(
      (r) => r.subscriberId === subId && r.status === 'pending'
    )
    if (pending?.kind === 'invite') {
      // Already invited — they can enter now
      subscriberEnterRoom(subId, room.id)
      return
    }
    if (pending?.kind === 'knock') {
      showDragToast(`${sub.name} вече почуква`)
      router.push(`/room/${room.id}`)
      return
    }

    // Direct enter when knock is off and guests allowed
    if (!prefs.room.knockToEnter && !prefs.room.waitingRoom) {
      subscriberEnterRoom(subId, room.id)
      return
    }

    const req: JoinRequest = {
      id: `jr_${Date.now()}`,
      subscriberId: sub.id,
      name: sub.name,
      language: sub.language,
      kind: 'knock',
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    const now = new Date().toISOString()
    patchConversation(room.id, {
      joinRequests: [req, ...(room.joinRequests || [])],
      lastMessage: `${sub.name} иска да влезе`,
      updatedAt: now,
      messages: [
        ...room.messages,
        {
          id: `msg_${Date.now()}`,
          fromMe: false,
          text: `🚪 ${sub.name} почуква — иска да влезе в стаята`,
          createdAt: now,
          status: 'delivered',
        },
      ],
    })
    showDragToast(`${sub.name} почуква на вратата`)
    router.push(`/room/${room.id}`)
  }

  /** Subscriber enters after invite / when allowed */
  function subscriberEnterRoom(subId: string, roomId?: string) {
    const sub = prefs.subscribers.find((s) => s.id === subId)
    const room =
      (roomId
        ? prefs.conversations.find((c) => c.id === roomId)
        : undefined) || openRoomForSubscriberKnock(subId)
    if (!sub || !room) {
      showDragToast('Няма стая за вход')
      return
    }
    const invite = (room.joinRequests || []).find(
      (r) =>
        r.subscriberId === subId &&
        r.status === 'pending' &&
        r.kind === 'invite' &&
        r.inviteCode
    )
    if (invite?.inviteCode) {
      router.push(
        `/join?invite=${invite.inviteCode}&conv=${room.id}&name=${encodeURIComponent(sub.name)}&lang=${sub.language}`
      )
      return
    }
    const already = room.members.some((m) => m.id === subId)
    const now = new Date().toISOString()
    patchConversation(room.id, {
      members: already
        ? room.members
        : [
            ...room.members,
            {
              id: sub.id,
              name: sub.name,
              language: sub.language,
              presence: sub.presence || 'online',
              avatarDataUrl: sub.avatarDataUrl,
            },
          ],
      isGroup: true,
      activeGuestIds: Array.from(
        new Set([...(room.activeGuestIds || []), subId])
      ),
      joinRequests: (room.joinRequests || []).map((r) =>
        r.subscriberId === subId && r.status === 'pending'
          ? { ...r, status: 'accepted' as const }
          : r
      ),
      lastMessage: `${sub.name} влезе в стаята`,
      updatedAt: now,
      messages: [
        ...room.messages,
        {
          id: `msg_${Date.now()}`,
          fromMe: false,
          text: `✅ ${sub.name} влезе в стаята`,
          createdAt: now,
          status: 'delivered',
        },
      ],
    })
    showDragToast(`${sub.name} влиза…`)
    router.push(`/room/${room.id}?video=1`)
  }

  function subscriberContextItems(subId: string): ContextMenuItem[] {
    const sub = prefs.subscribers.find((s) => s.id === subId)
    if (!sub) return []
    return [
      {
        id: 'friendship',
        label: 'Friendship Profile',
        icon: Users,
        onClick: () => setFriendshipId(subId),
      },
      {
        id: 'msg',
        label: 'Отвори чат',
        icon: MessageCircle,
        onClick: () => startConversationFromSubscriber(subId),
      },
      {
        id: 'knock',
        label: 'Иска да влезе / почукай',
        icon: DoorOpen,
        onClick: () => subscriberRequestEnter(subId),
      },
      {
        id: 'enter-room',
        label: 'Влез в отворена стая',
        icon: Video,
        onClick: () => subscriberEnterRoom(subId),
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

  async function createRoomFromDraft(draft: CreateRoomDraft) {
    if (!user) return
    setCreatingRoom(true)
    try {
      let roomId = `conv_${Date.now()}`
      let inviteUrl: string | null = null
      let newInvite: InviteLink | null = null

      if (isClientBackendEnabled()) {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title: draft.title,
            channel: draft.channel,
          }),
        })
        const data = (await res.json()) as {
          room?: { id: string; title: string }
          error?: string
        }
        if (!res.ok || !data.room) {
          window.alert(data.error || 'Неуспешно създаване на стая')
          return
        }
        roomId = data.room.id

        if (draft.allowGuests && draft.copyInvite) {
          const inv = await fetch('/api/invites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              roomId,
              createRoom: false,
              label: `Покана · ${draft.title}`,
              channel: draft.channel,
              prefillLanguage: draft.guestLanguage,
            }),
          })
          const invData = (await inv.json()) as {
            url?: string
            invite?: { id: string; code: string; room_id: string; label: string }
            error?: string
          }
          if (inv.ok && invData.url && invData.invite) {
            inviteUrl = invData.url
            newInvite = {
              id: invData.invite.id,
              code: invData.invite.code,
              conversationId: invData.invite.room_id,
              label: invData.invite.label,
              channel: draft.channel,
              prefillLanguage: draft.guestLanguage,
              createdAt: new Date().toISOString(),
              active: true,
            }
            void navigator.clipboard.writeText(invData.url)
            setInviteCopied(true)
            window.setTimeout(() => setInviteCopied(false), 2000)
          }
        }
      } else if (draft.allowGuests && draft.copyInvite) {
        const code = `inv_${Math.random().toString(36).slice(2, 8)}`
        newInvite = {
          id: `invite_${Date.now()}`,
          code,
          conversationId: roomId,
          label: `Покана · ${draft.title}`,
          channel: draft.channel,
          prefillLanguage: draft.guestLanguage,
          createdAt: new Date().toISOString(),
          active: true,
        }
        inviteUrl = `${window.location.origin}/join?invite=${code}&conv=${roomId}&channel=${draft.channel}&lang=${draft.guestLanguage}`
        void navigator.clipboard.writeText(inviteUrl)
        setInviteCopied(true)
        window.setTimeout(() => setInviteCopied(false), 2000)
      }

      const conv: Conversation = {
        id: roomId,
        title: draft.title,
        isGroup: draft.isGroup,
        members: [],
        lastMessage: draft.allowGuests
          ? 'Стаята е готова · покани гости'
          : 'Стаята е създадена',
        updatedAt: new Date().toISOString(),
        unread: 0,
        pinned: false,
        muted: false,
        messages: [],
        saveChat: draft.saveChat,
        disappearAfter: draft.disappearAfter,
        sessionOpen: true,
        activeGuestIds: [],
      }

      updatePrefs({
        room: {
          ...prefs.room,
          studioRoomId: draft.studioRoomId,
          videoQuality: draft.videoQuality,
          waitingRoom: draft.waitingRoom,
          allowGuests: draft.allowGuests,
          customBackground: null,
        },
        conversations: [
          conv,
          ...prefs.conversations.filter((c) => c.id !== roomId),
        ],
        ...(newInvite
          ? { invites: [newInvite, ...(prefs.invites || [])] }
          : {}),
      })
      setActiveId(roomId)
      setTab('chats')
      setInboxFilter('all')
      setCreateRoomOpen(false)

      if (draft.enterNow) {
        const video =
          draft.videoOnJoin &&
          (draft.channel === 'both' || draft.channel === 'call')
        router.push(`/room/${roomId}?video=${video ? '1' : '0'}`)
      } else if (inviteUrl) {
        window.alert('Стаята е създадена. Invite линкът е копиран.')
      }
    } finally {
      setCreatingRoom(false)
    }
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
            onClick={() => setProfileOpen(true)}
            title="Профил · Stories · настроение"
          >
            <MoodAvatar
              moodId={prefs.profileSocial?.moodId || 'focused'}
              name={user.displayName}
              imageUrl={user.avatarDataUrl}
              size="md"
              ring={myStories.length > 0}
            />
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
          <button
            type="button"
            className="ov-icon-btn"
            title="Quick Capture"
            onClick={() => setCaptureOpen(true)}
          >
            <Camera className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="ov-icon-btn"
            title="Studio Map"
            onClick={() => setMapOpen(true)}
          >
            <MapPin className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="ov-icon-btn"
            title="Memories / Eyes Only"
            onClick={() => setMemoriesOpen(true)}
          >
            <Lock className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="ov-icon-btn"
            title="Spotlight+"
            onClick={() => setSpotlightOpen(true)}
          >
            <Radio className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="ov-icon-btn"
            title="Смени тема (клик) · всички теми (двоен клик)"
            onClick={toggleTheme}
            onDoubleClick={(e) => {
              e.preventDefault()
              setAppearanceOpen(true)
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              setAppearanceOpen(true)
            }}
          >
            {theme === 'light' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
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
                icon={Plus}
                label="Създай стая"
                onClick={() => {
                  setMenuOpen(false)
                  setCreateRoomOpen(true)
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
                icon={Sun}
                label="Теми и тапети"
                onClick={() => {
                  setMenuOpen(false)
                  setAppearanceOpen(true)
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
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Waves className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                <p className="truncate text-sm font-semibold">
                  Messenger dashboard
                </p>
              </div>
              <button
                type="button"
                className="ov-btn-primary !px-2.5 !py-1.5 text-[11px]"
                onClick={() => setCreateRoomOpen(true)}
                title="Създай стая"
              >
                <Plus className="h-3.5 w-3.5" />
                Стая
              </button>
            </div>
            <button
              type="button"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 py-2.5 text-xs font-semibold text-[var(--accent)] hover:brightness-105"
              onClick={() => setCreateRoomOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Създай стая
            </button>
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
            {dragSubId ? (
              <div className="mb-2 rounded-xl border border-dashed border-[var(--accent)]/45 bg-[var(--accent-soft)] px-3 py-2 text-[11px] text-[var(--accent)]">
                Пусни абоната върху стая по-долу или вдясно
              </div>
            ) : null}

            {(tab === 'chats' || dragSubId) &&
              conversations.map((conv) => {
                const drop = roomDropHandlers(conv.id)
                const isDrop = dropOverId === conv.id
                return (
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
                    onDragOver={drop.onDragOver}
                    onDragLeave={drop.onDragLeave}
                    onDrop={drop.onDrop}
                    className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                      isDrop
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)] ring-2 ring-[var(--accent)]'
                        : activeId === conv.id
                          ? 'bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/30'
                          : dragSubId
                            ? 'border border-dashed border-[var(--accent)]/35 hover:bg-[var(--accent-soft)]'
                            : 'hover:bg-[var(--chip)]'
                    }`}
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-700 text-sm font-bold text-white">
                      {conv.isGroup ? (
                        <Users className="h-4 w-4" />
                      ) : (
                        conv.title.slice(0, 1)
                      )}
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
                      <span
                        className={`mt-0.5 block truncate text-xs ${
                          isDrop ? 'opacity-90' : 'text-[var(--muted)]'
                        }`}
                      >
                        {isDrop
                          ? 'Пусни тук, за да добавиш'
                          : dragSubId
                            ? `${conv.members.length} участници · пусни тук`
                            : conv.lastMessage}
                      </span>
                    </span>
                    {conv.unread > 0 && !dragSubId ? (
                      <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent-ink)]">
                        {conv.unread}
                      </span>
                    ) : null}
                  </button>
                )
              })}

            {tab === 'subscribers' &&
              subscribers.map((sub) => (
                <div
                  key={sub.id}
                  draggable
                  onDragStart={(e) => onSubscriberDragStart(sub.id, e)}
                  onDragEnd={onSubscriberDragEnd}
                  className={`mb-1 flex cursor-grab items-center gap-2 rounded-2xl px-3 py-2.5 active:cursor-grabbing hover:bg-[var(--chip)] ${
                    dragSubId === sub.id ? 'opacity-50 ring-1 ring-[var(--accent)]' : ''
                  }`}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setCtxMenu({
                      x: e.clientX,
                      y: e.clientY,
                      type: 'subscriber',
                      id: sub.id,
                    })
                  }}
                  title="Плъзни към стая, за да добавиш"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => startConversationFromSubscriber(sub.id)}
                  >
                    <p className="truncate text-sm font-semibold">{sub.name}</p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {presenceLabel(sub.presence || 'offline')} · плъзни → стая
                    </p>
                  </button>
                  <button
                    type="button"
                    className="ov-icon-btn"
                    title="Иска да влезе в отворена стая"
                    onClick={() => subscriberRequestEnter(sub.id)}
                  >
                    <DoorOpen className="h-3.5 w-3.5" />
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

        <section
          className={`flex min-w-0 flex-col ${
            dragSubId && active && dropOverId === active.id
              ? 'ring-2 ring-inset ring-[var(--accent)]'
              : ''
          }`}
          {...(active ? roomDropHandlers(active.id) : {})}
        >
          {active ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-[var(--panel-border)] px-4 py-3">
                <button
                  type="button"
                  className="min-w-0 text-left"
                  onClick={() =>
                    setFriendshipId(active.members[0]?.id || active.id)
                  }
                  title="Friendship Profile"
                >
                  <p className="truncate text-sm font-semibold">{active.title}</p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {dragSubId
                      ? 'Пусни абоната тук, за да го добавиш'
                      : active.isGroup
                        ? `${active.members.length} участници`
                        : presenceLabel(active.members[0]?.presence || 'online')}
                    {!dragSubId ? (
                      <>
                        {' · '}
                        чат {active.saveChat ? 'се пази' : 'не се пази'}
                        {active.disappearAfter !== 'off'
                          ? ` · изчезва след ${active.disappearAfter}`
                          : ''}
                      </>
                    ) : null}
                  </p>
                </button>
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

              {active.members.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--panel-border)] px-4 py-2">
                  <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Участници
                  </span>
                  {active.members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full bg-[var(--chip)] px-2 py-0.5 text-[11px]"
                      onClick={() => setFriendshipId(m.id)}
                      title={m.name}
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-700 text-[9px] font-bold text-white">
                        {m.name.slice(0, 1)}
                      </span>
                      {m.name.split(' ')[0]}
                    </button>
                  ))}
                  {dragSubId ? (
                    <span className="rounded-full border border-dashed border-[var(--accent)]/50 px-2 py-0.5 text-[10px] text-[var(--accent)]">
                      + пусни тук
                    </span>
                  ) : null}
                </div>
              ) : dragSubId ? (
                <div className="border-b border-dashed border-[var(--accent)]/40 bg-[var(--accent-soft)] px-4 py-2 text-center text-[11px] text-[var(--accent)]">
                  Пусни абоната тук, за да го добавиш в стаята
                </div>
              ) : null}

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
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <MessageCircle className="h-8 w-8 text-[var(--accent)]" />
              <p className="mt-3 text-sm font-semibold">Няма избрана стая</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {dragSubId
                  ? 'Пусни абоната върху стая вляво'
                  : 'Създай нова стая с богатите опции или избери разговор вляво'}
              </p>
              <button
                type="button"
                className="ov-btn-primary mt-4 !px-4 !py-2 text-xs"
                onClick={() => setCreateRoomOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Създай стая
              </button>
            </div>
          )}
        </section>
      </div>

      {dragToast ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-[var(--foreground)] px-4 py-2 text-xs font-semibold text-[var(--background)] shadow-lg">
          {dragToast}
        </div>
      ) : null}

      <CreateRoomWizard
        open={createRoomOpen}
        userPlan={user.plan}
        isAdmin={admin}
        customRooms={prefs.room.customStudioRooms || []}
        defaultLanguage={user.nativeLanguage || 'bg'}
        busy={creatingRoom}
        onClose={() => setCreateRoomOpen(false)}
        onCreate={(draft) => void createRoomFromDraft(draft)}
      />
      <AppearancePanel
        open={appearanceOpen}
        appearance={appearance}
        onClose={() => setAppearanceOpen(false)}
        onChange={setAppearance}
      />
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

      <QuickCapture
        open={captureOpen}
        peerLanguage={active?.members[0]?.language || prefs.voice.targetLanguage}
        onClose={() => setCaptureOpen(false)}
        onSendToChat={({ imageDataUrl, caption, captionTranslated }) => {
          appendMessage({
            text: caption,
            kind: 'image',
            mediaUrl: imageDataUrl,
            caption: captionTranslated,
            translatedText: captionTranslated,
          })
        }}
        onPostStory={({ imageDataUrl, caption }) => {
          const story = createStory({
            type: 'image',
            imageDataUrl,
            text: caption,
          })
          updatePrefs({
            profileSocial: {
              ...prefs.profileSocial,
              stories: [story, ...(prefs.profileSocial?.stories || [])],
            },
          })
        }}
        onSaveMemory={({ imageDataUrl, caption, locked }) => {
          patchSnap({
            memories: [
              {
                id: `mem_${Date.now()}`,
                kind: 'photo',
                title: caption,
                body: caption,
                mediaUrl: imageDataUrl,
                locked,
                createdAt: new Date().toISOString(),
                tags: locked ? ['eyes-only'] : ['snap'],
              },
              ...snap.memories,
            ],
          })
        }}
      />

      <StudioMap
        open={mapOpen}
        nodes={mapNodes}
        onClose={() => setMapOpen(false)}
        onSelect={(nodeId) => {
          setMapOpen(false)
          if (nodeId === 'me') {
            setProfileOpen(true)
            return
          }
          setFriendshipId(nodeId)
        }}
      />

      <MemoriesVault
        open={memoriesOpen}
        memories={snap.memories}
        vaultPin={snap.vaultPin}
        unlockedUntil={snap.vaultUnlockedUntil}
        onClose={() => setMemoriesOpen(false)}
        onUnlock={(until) => patchSnap({ vaultUnlockedUntil: until })}
        onLock={() => patchSnap({ vaultUnlockedUntil: 0 })}
        onDelete={(id) =>
          patchSnap({ memories: snap.memories.filter((m) => m.id !== id) })
        }
        onChangePin={(pin) => patchSnap({ vaultPin: pin || '1234' })}
      />

      <SpotlightFeed
        open={spotlightOpen}
        items={snap.spotlight}
        onClose={() => setSpotlightOpen(false)}
        onToggleLike={(id) =>
          patchSnap({
            spotlight: snap.spotlight.map((item) =>
              item.id === id
                ? {
                    ...item,
                    likedByMe: !item.likedByMe,
                    likes: item.likedByMe ? item.likes - 1 : item.likes + 1,
                  }
                : item
            ),
          })
        }
        onPublishMine={() => {
          if (!user) return
          patchSnap({
            spotlight: [
              {
                id: `sp_${Date.now()}`,
                authorName: user.displayName,
                title: 'My OmniVoice highlight',
                caption: prefs.profileSocial?.bio || 'Live multilingual moment',
                captionTranslated: 'Момент на живо с превод',
                kind: 'highlight',
                likes: 1,
                likedByMe: true,
                language: user.nativeLanguage || 'bg',
                createdAt: new Date().toISOString(),
              },
              ...snap.spotlight,
            ],
          })
          setSpotlightOpen(false)
          window.alert('Highlight-ът е в Spotlight+')
        }}
      />

      {friendshipTarget ? (
        <FriendshipProfile
          open={Boolean(friendshipId)}
          name={friendshipTarget.name}
          language={friendshipTarget.language}
          presence={friendshipTarget.presence}
          avatarUrl={friendshipTarget.avatarUrl}
          stats={ensureFriendship(snap, friendshipTarget.id, {
            languagesUsed: [
              user.nativeLanguage || 'bg',
              friendshipTarget.language,
            ],
            bestFriendRank:
              prefs.subscribers.findIndex((s) => s.id === friendshipTarget.id) +
                1 || undefined,
          })}
          onClose={() => setFriendshipId(null)}
          onMessage={() => {
            const sub = prefs.subscribers.find(
              (s) => s.id === friendshipTarget.id
            )
            if (sub) startConversationFromSubscriber(sub.id)
            else setActiveId(friendshipTarget.id)
            setFriendshipId(null)
            setTab('chats')
          }}
          onCall={() => {
            const sub = prefs.subscribers.find(
              (s) => s.id === friendshipTarget.id
            )
            if (sub) startConversationFromSubscriber(sub.id)
            const conv =
              prefs.conversations.find(
                (c) =>
                  c.id === friendshipTarget.id ||
                  (!c.isGroup && c.title === friendshipTarget.name)
              ) || active
            if (conv) router.push(`/room/${conv.id}`)
            setFriendshipId(null)
          }}
          onVideo={() => {
            const sub = prefs.subscribers.find(
              (s) => s.id === friendshipTarget.id
            )
            if (sub) startConversationFromSubscriber(sub.id)
            const conv =
              prefs.conversations.find(
                (c) =>
                  c.id === friendshipTarget.id ||
                  (!c.isGroup && c.title === friendshipTarget.name)
              ) || active
            if (conv) router.push(`/room/${conv.id}?video=1`)
            setFriendshipId(null)
          }}
          onNoteChange={(note) =>
            updatePrefs({
              snapPlus: bumpFriendship(snap, friendshipTarget.id, { note }),
            })
          }
        />
      ) : null}
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
