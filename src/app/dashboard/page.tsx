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
  ChevronLeft,
  Copy,
  DoorOpen,
  Flag,
  Headphones,
  Heart,
  Link2,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Newspaper,
  Pencil,
  Phone,
  Pin,
  Plus,
  Radio,
  Search,
  Settings2,
  Share2,
  Sun,
  Trash2,
  UserPlus,
  Users,
  Video,
  Volume2,
  Waves,
} from 'lucide-react'
import type { CustomStudioRoom } from '@/lib/studio-rooms'
import {
  formatLiveQuotaLabel,
  recordLiveStart,
  recordLiveStop,
} from '@/lib/live-quota'
import OnboardingTour from '@/components/OnboardingTour'
import CoachBubble from '@/components/CoachBubble'
import type { CoachmarkId } from '@/lib/coachmarks'

const EMPTY_CUSTOM_ROOMS: CustomStudioRoom[] = []
import AppearancePanel from '@/components/AppearancePanel'
import {
  BusinessAside,
  BusinessToolRail,
  extractPipelineDeals,
} from '@/components/BusinessWorkspace'
import CallRecap from '@/components/CallRecap'
import {
  collectIntelSources,
  DEFAULT_INTEL_OPTIONS,
  fetchBusinessIntel,
  formatAgreementForClipboard,
  formatIntelForClipboard,
  formatWrittenContractForClipboard,
  type BusinessIntelData,
  type BusinessIntelOptionId,
} from '@/lib/business-intel'
import ChatComposer from '@/components/ChatComposer'
import CreateRoomWizard, {
  type CreateRoomDraft,
} from '@/components/CreateRoomWizard'
import ContactImportModal from '@/components/ContactImportModal'
import LiveGoPanel from '@/components/LiveGoPanel'
import ContextMenu, { type ContextMenuItem } from '@/components/ContextMenu'
import FriendshipProfile from '@/components/FriendshipProfile'
import MemoriesVault from '@/components/MemoriesVault'
import MoodAvatar from '@/components/MoodAvatar'
import {
  PodcastAside,
  PodcastToolRail,
} from '@/components/PodcastWorkspace'
import ProfileHub from '@/components/ProfileHub'
import QuickCapture from '@/components/QuickCapture'
import RichMessageBubble from '@/components/RichMessageBubble'
import SettingsPanel from '@/components/SettingsPanel'
import SpotlightFeed from '@/components/SpotlightFeed'
import PageWall from '@/components/PageWall'
import SpaceAdminBar from '@/components/SpaceAdminBar'
import { canManageSpace } from '@/lib/social-spaces'
import {
  AI_BUILTIN_ROOMS,
  canSaveAiRoom,
  capAiRoomsForPlan,
  pickAiRoomImage,
  type AiRoomSaved,
} from '@/lib/ai-rooms'
import ProfilePageCard from '@/components/ProfilePageCard'
import DiscoverPagesPanel from '@/components/DiscoverPagesPanel'
import InviteShareSheet from '@/components/InviteShareSheet'
import FriendSearchPanel from '@/components/FriendSearchPanel'
import MeetMatchModal from '@/components/MeetMatchModal'
import MeetMatchRoom from '@/components/MeetMatchRoom'
import InstallAppButton from '@/components/InstallAppButton'
import HomeFeed from '@/components/HomeFeed'
import FeedNotificationsBell from '@/components/FeedNotificationsBell'
import FeedRightRail from '@/components/FeedRightRail'
import SocialSpaceViewer from '@/components/SocialSpaceViewer'
import PlanGrowthCoach from '@/components/PlanGrowthCoach'
import FriendActionSheet from '@/components/FriendActionSheet'
import OperatorVoiceCall from '@/components/OperatorVoiceCall'
import HelpReportModal from '@/components/HelpReportModal'
import ReportIssueNotice from '@/components/ReportIssueNotice'
import {
  BusinessAiCoachPanel,
  FeatureSuggestionsBanner,
} from '@/components/AiAssistPanels'
import { bumpFeatureUse } from '@/lib/feature-suggest'
import ShareGrowPanel from '@/components/ShareGrowPanel'
import {
  hasPendingFollowOrJoin,
  isGroupSpace,
  makeFollowOrJoinRequest,
} from '@/lib/social-access'
import { pushFeedNotification, topEngagedIds } from '@/lib/feed-social'
import {
  resolveStartupPlan,
  saveLastActivePlan,
} from '@/lib/last-plan'
import {
  maxLiveParticipants,
  roomCapacityLabel,
  roomIsFull,
} from '@/lib/room-capacity'
import { applyAdminGrantsToUser } from '@/lib/admin-grants'
import {
  bonusLabel,
  claimInstallBonus,
  claimReferralBonuses,
  INSTALL_BONUS_CHARS,
  REFERRAL_BONUS_CHARS,
} from '@/lib/referral-bonus'
import { isStandaloneDisplay } from '@/lib/pwa'
import type { FriendHit } from '@/lib/friend-directory'
import {
  DEFAULT_MEET_MATCH,
  bumpMeetStreak,
  type MeetMatchCandidate,
  type MeetMatchProfile,
  type MeetRoomMeta,
} from '@/lib/meet-match'
import { isMeetConversationId, meetConversationId } from '@/lib/meet-gifts'
import {
  allowedPageFormatsForUser,
  canCreateOwnedPage,
  canSeeConversation,
  defaultFollowPolicy,
  pageSlotSummary,
  planPageQuotaLabel,
} from '@/lib/social-privacy'
import type { SpaceFormat } from '@/lib/social-spaces'
import WorldPresenceMap from '@/components/WorldPresenceMap'
import {
  workspaceChrome,
  workspaceForUser,
  type DealStageId,
} from '@/lib/plan-modes'
import type { StreamPlatformId } from '@/lib/platforms'
import type {
  Conversation,
  ConversationMessage,
  InviteLink,
  JoinRequest,
} from '@/lib/auth-types'
import { conversationSpace } from '@/lib/auth-types'
import { appInviteUrl, guestInviteUrl } from '@/lib/invite-url'
import { createServerGuestInvite } from '@/lib/create-guest-invite'
import {
  getUnlockedPlans,
  hasFullAccess,
  isAdminUser,
  needsCheckout,
  withUnlockedPlan,
} from '@/lib/access'
import { useAmbientMusic } from '@/hooks/useAmbientMusic'
import { PLANS, getLanguage, type PlanId } from '@/lib/languages'
import { parseSpotifyUrl } from '@/lib/spotify'
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
  const [newSubName, setNewSubName] = useState('')
  const [newSubContact, setNewSubContact] = useState('')
  const [activeId, setActiveId] = useState('')
  /** Facebook-style: thread/page only after explicit click */
  const [threadOpen, setThreadOpen] = useState(false)
  /** Dedicated page/group viewer from feed */
  const [socialView, setSocialView] = useState<{
    id: string
    postId?: string
  } | null>(null)
  const [contactsOpen, setContactsOpen] = useState(false)
  const [friendSheetId, setFriendSheetId] = useState<string | null>(null)
  const [operatorCall, setOperatorCall] = useState<{
    name: string
    convId?: string
  } | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [draft, setDraft] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [dealStageFilter, setDealStageFilter] = useState<DealStageId | 'all'>(
    'all'
  )
  const [voiceBridgeOn, setVoiceBridgeOn] = useState(true)
  const [salesAssistOn, setSalesAssistOn] = useState(true)
  const [obsLive, setObsLive] = useState(false)
  const [shortQueued, setShortQueued] = useState(false)
  const [recapOpen, setRecapOpen] = useState(false)
  const [intelSelecting, setIntelSelecting] = useState(true)
  const [intelLoading, setIntelLoading] = useState(false)
  const [intelError, setIntelError] = useState<string | null>(null)
  const [intelData, setIntelData] = useState<BusinessIntelData | null>(null)
  const [intelOptions, setIntelOptions] = useState<BusinessIntelOptionId[]>(() =>
    prefs.experience?.businessRoom?.defaultIntelOptions?.length
      ? [...prefs.experience.businessRoom.defaultIntelOptions]
      : [...DEFAULT_INTEL_OPTIONS]
  )
  const [crmTick, setCrmTick] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsScope, setSettingsScope] = useState<'room' | 'full'>('full')
  const [settingsTab, setSettingsTab] = useState<
    | 'account'
    | 'room'
    | 'music'
    | 'chat'
    | 'podcast'
    | 'secretary'
    | 'platforms'
    | 'guests'
    | 'subscribers'
  >('account')
  const [importOpen, setImportOpen] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [inviteShare, setInviteShare] = useState<{
    url: string
    label: string
    roomId?: string
  } | null>(null)
  const [liveGoOpen, setLiveGoOpen] = useState(false)
  const [forceOnboarding, setForceOnboarding] = useState(false)
  const [meetMatchOpen, setMeetMatchOpen] = useState(false)
  const [meetRoomOpen, setMeetRoomOpen] = useState(false)
  const [coachTrigger, setCoachTrigger] = useState<CoachmarkId | null>(null)
  const [coachTick, setCoachTick] = useState(0)

  function showCoach(id: CoachmarkId) {
    setCoachTrigger(id)
    setCoachTick((t) => t + 1)
  }

  useEffect(() => {
    const replay = () => setForceOnboarding(true)
    window.addEventListener('omnivvoice:onboarding', replay)
    return () => window.removeEventListener('omnivvoice:onboarding', replay)
  }, [])
  const [tab, setTab] = useState<
    'feed' | 'chats' | 'rooms' | 'subscribers' | 'blocked'
  >('feed')
  const [inboxFilter, setInboxFilter] = useState<
    'all' | 'unread' | 'live' | 'archived'
  >('all')
  const [replyPreview, setReplyPreview] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [captureOpen, setCaptureOpen] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [memoriesOpen, setMemoriesOpen] = useState(false)
  const [spotlightOpen, setSpotlightOpen] = useState(false)
  const [friendshipId, setFriendshipId] = useState<string | null>(null)
  const [dealComposerOpen, setDealComposerOpen] = useState(false)
  const [dealDraft, setDealDraft] = useState({
    title: 'Нова сделка',
    value: '€2,400',
    stage: 'Discovery',
  })
  const [storyViewerId, setStoryViewerId] = useState<string | null>(null)
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
  const workspace = workspaceForUser(user)
  const chrome = workspaceChrome(workspace)
  const pipelineDeals = useMemo(
    () => extractPipelineDeals(prefs.conversations),
    [prefs.conversations]
  )
  const connectedStreamPlatforms = useMemo(() => {
    return (
      Object.entries(prefs.podcast?.platforms || {}) as Array<
        [StreamPlatformId, { connected?: boolean }]
      >
    )
      .filter(([, p]) => p.connected)
      .map(([id]) => id)
  }, [prefs.podcast?.platforms])
  const salesPrompt =
    'Попитай за budget + decision maker. Предложи VoiceBridge демо на техния език.'
  const battleCards = [
    'Конкурент X няма live превод',
    'ROI: −40% време за онбординг',
    'Пилот за 14 дни без риск',
  ]
  const crmStatus = {
    salesforce: (crmTick % 3 === 0
      ? 'synced'
      : crmTick % 3 === 1
        ? 'syncing'
        : 'idle') as 'synced' | 'syncing' | 'idle',
    hubspot: (crmTick % 2 === 0 ? 'synced' : 'idle') as
      | 'synced'
      | 'syncing'
      | 'idle',
  }

  useEffect(() => {
    if (workspace !== 'business') return
    const t = window.setInterval(() => setCrmTick((n) => n + 1), 8000)
    return () => window.clearInterval(t)
  }, [workspace])

  // After hang-up: open the same conversation as chat (no new room)
  useEffect(() => {
    if (!hydrated) return
    const params = new URLSearchParams(window.location.search)
    const chat = params.get('chat')
    const space = params.get('space')
    const post = params.get('post') || undefined
    if (space && prefs.conversations.some((c) => c.id === space)) {
      setSocialView({ id: space, postId: post })
      setTab('feed')
      setThreadOpen(false)
      window.history.replaceState({}, '', '/dashboard')
      return
    }
    if (!chat) return
    if (prefs.conversations.some((c) => c.id === chat)) {
      setActiveId(chat)
      setTab('chats')
      setThreadOpen(true)
    }
    window.history.replaceState({}, '', '/dashboard')
  }, [hydrated, prefs.conversations])

  // Seed digest notifs for frequently engaged friends/pages (FB-like)
  useEffect(() => {
    if (!hydrated || !user?.id) return
    try {
      const key = `ov_digest_seed_${user.id}`
      if (sessionStorage.getItem(key) === '1') return
      sessionStorage.setItem(key, '1')
      const top = topEngagedIds(5)
      for (const id of top) {
        const friend = prefs.subscribers.find((s) => s.id === id)
        const space = prefs.conversations.find((c) => c.id === id)
        if (friend) {
          pushFeedNotification({
            kind: 'digest',
            title: `${friend.name.split(' ')[0]} е активен`,
            body: 'Често разглеждаш публикациите му — виж новостите в Начало.',
          })
        } else if (space) {
          pushFeedNotification({
            kind: 'digest',
            title: `Новости · ${space.title}`,
            body: 'Страница/група, която често отваряш, има активност.',
            pageId: space.id,
          })
        }
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user?.id])

  function openThread(
    id: string,
    nextTab?: 'chats' | 'rooms' | 'feed' | 'subscribers' | 'blocked'
  ) {
    setActiveId(id)
    if (nextTab && nextTab !== 'feed') setTab(nextTab)
    else if (nextTab === 'feed') setTab('feed')
    setThreadOpen(true)
  }

  function closeThread() {
    setThreadOpen(false)
  }

  // Stripe paid-content unlock return
  useEffect(() => {
    if (!hydrated) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('paid') !== 'success') return
    const sessionId = params.get('session_id')
    const contentHint = params.get('content')
    window.history.replaceState({}, '', '/dashboard')
    void (async () => {
      try {
        if (sessionId) {
          const res = await fetch(
            `/api/stripe/paid-content?session_id=${encodeURIComponent(sessionId)}`,
            { credentials: 'include' }
          )
          const data = (await res.json()) as {
            unlocked?: boolean
            contentId?: string
          }
          if (data.unlocked && data.contentId) {
            updatePrefs((current) => ({
              paidUnlocks: [
                data.contentId!,
                ...(current.paidUnlocks || []).filter(
                  (id) => id !== data.contentId
                ),
              ],
            }))
            showDragToast('Платеното съдържание е отключено ✓')
            return
          }
        }
        if (contentHint) {
          updatePrefs((current) => ({
            paidUnlocks: [
              contentHint,
              ...(current.paidUnlocks || []).filter((id) => id !== contentHint),
            ],
          }))
          showDragToast('Платеното съдържание е отключено ✓')
        }
      } catch {
        showDragToast('Плащането е прието — обнови страницата ако трябва')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  useAmbientMusic({
    enabled: Boolean(prefs.music?.enabled),
    trackId: prefs.music?.trackId || 'soft-lounge',
    volume: prefs.music?.volume ?? 0.28,
    plan: user?.plan || 'free',
    duck: Boolean(prefs.music?.duckDuringSpeech),
    source: prefs.music?.source || 'library',
  })
  const mood = getMood(prefs.profileSocial?.moodId)
  const snap = prefs.snapPlus || DEFAULT_SNAP_PLUS
  const [myStories, setMyStories] = useState(
    () => prefs.profileSocial?.stories || []
  )
  useEffect(() => {
    setMyStories(activeStories(prefs.profileSocial?.stories || []))
  }, [prefs.profileSocial?.stories])

  const findMyCircleIds = prefs.profileSocial?.geoShare?.circleIds || []

  const mapNodes = useMemo(() => {
    if (!user) return []
    const circle = new Set(findMyCircleIds)
    const people = prefs.subscribers
      .filter((s) => s.status !== 'blocked' && circle.has(s.id))
      .slice(0, 16)
      .map((s) => ({
        id: s.id,
        name: s.name,
        presence: s.presence || 'offline',
        language: s.language,
      }))
    return buildMapNodes({
      meName: user.displayName,
      meMood: prefs.profileSocial?.moodId || 'focused',
      mePresence: prefs.presence,
      meLocation: prefs.profileSocial?.locationLabel || 'Studio',
      showMe: Boolean(prefs.profileSocial?.showOnMap ?? true),
      people,
    }).map((n) => ({
      ...n,
      inCircle: Boolean(n.isMe || circle.has(n.id)),
    }))
  }, [
    user,
    prefs.profileSocial,
    prefs.presence,
    prefs.subscribers,
    findMyCircleIds,
  ])

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

  // Claim invite → Cloud Translation bonus for the referrer
  useEffect(() => {
    if (!hydrated || !user?.id) return
    const result = claimReferralBonuses({
      hostId: user.id,
      currentBonus: prefs.translateBonusChars || 0,
    })
    if (!result.claimed) return
    updatePrefs((current) => ({
      translateBonusChars: result.bonus,
      referralInvitesClaimed:
        (current.referralInvitesClaimed || 0) + result.claimed,
    }))
    showDragToast(
      `Бонус превод +${bonusLabel(result.claimed * REFERRAL_BONUS_CHARS)} · ${result.claimed} покани`
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user?.id])

  // Remember last paid/active plan → open that workspace next login
  useEffect(() => {
    if (!hydrated || !user) return
    const startup = resolveStartupPlan(user)
    if (startup !== user.plan && getUnlockedPlans(user).includes(startup)) {
      updatePrefs((current) => ({
        user: applyAdminGrantsToUser(
          withUnlockedPlan(user, startup, true),
          current.adminPlanGrants
        ),
      }))
      saveLastActivePlan(startup)
    } else {
      saveLastActivePlan(user.plan)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user?.id])

  // One-time install bonus (PWA / desktop installed)
  useEffect(() => {
    if (!hydrated || !user?.id) return

    const tryClaim = () => {
      if (!isStandaloneDisplay()) return
      let granted = false
      updatePrefs((current) => {
        const next = claimInstallBonus(current.translateBonusChars || 0)
        if (next == null) return {}
        granted = true
        return { translateBonusChars: next }
      })
      if (granted) {
        showDragToast(
          `Бонус за инсталация +${bonusLabel(INSTALL_BONUS_CHARS)} Cloud`
        )
      }
    }

    tryClaim()
    const onInstalled = () => tryClaim()
    window.addEventListener('appinstalled', onInstalled)
    return () => window.removeEventListener('appinstalled', onInstalled)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user?.id])

  const conversations = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = [...prefs.conversations].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.updatedAt.localeCompare(a.updatedAt)
    })

    // Global privacy: only rooms/groups you're in (or public pages)
    if (user?.id) {
      list = list.filter((c) => canSeeConversation(c, user.id))
    }

    // Drag-to-invite targets rooms; otherwise respect Чатове / Стаи tab
    if (dragSubId) {
      list = list.filter((c) => conversationSpace(c) === 'room')
    } else if (tab === 'rooms') {
      list = list.filter((c) => conversationSpace(c) === 'room')
    } else if (tab === 'chats') {
      list = list.filter((c) => conversationSpace(c) === 'chat')
    }

    if (inboxFilter === 'archived') {
      list = list.filter((c) => c.archived)
    } else {
      list = list.filter((c) => !c.archived)
      if (inboxFilter === 'unread') list = list.filter((c) => c.unread > 0)
      if (inboxFilter === 'live')
        list = list.filter((c) => c.sessionOpen !== false)
    }
    if (!q) return list
    return list.filter((item) => item.title.toLowerCase().includes(q))
  }, [prefs.conversations, query, inboxFilter, tab, dragSubId, user?.id])

  const active = prefs.conversations.find((item) => item.id === activeId)
  const myProfilePage = useMemo(
    () =>
      prefs.conversations.find(
        (c) =>
          c.spaceFormat === 'page' &&
          c.adminUserId === user?.id &&
          c.title.toLowerCase().includes('страница')
      ) ||
      prefs.conversations.find(
        (c) => c.spaceFormat === 'page' && c.adminUserId === user?.id
      ),
    [prefs.conversations, user?.id]
  )
  const subscribers = prefs.subscribers.filter((sub) => sub.status !== 'blocked')

  function patchConversation(id: string, patch: Partial<Conversation>) {
    updatePrefs((current) => ({
      conversations: current.conversations.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }))
  }

  function saveAiRoom(aiRoom: AiRoomSaved) {
    const plan: PlanId = isAdminUser(user) ? 'podcast' : user?.plan || 'free'
    if (!canSaveAiRoom(plan, (prefs.aiRooms || []).length)) {
      showDragToast('Лимитът за AI стаи е изчерпан')
      return
    }
    updatePrefs((current) => ({
      aiRooms: capAiRoomsForPlan([aiRoom, ...(current.aiRooms || [])], plan),
    }))
    showDragToast('AI стая запазена')
  }

  async function enterLiveRoom(roomId: string, video: boolean) {
    const conv = prefs.conversations.find((c) => c.id === roomId)
    const liveCount =
      (conv?.members.length || 0) + (conv?.activeGuestIds?.length || 0)
    if (roomIsFull(liveCount, user?.plan)) {
      showDragToast(
        `Стаята е пълна · ${roomCapacityLabel(user?.plan)}`
      )
      return
    }
    openThread(
      roomId,
      conv && conversationSpace(conv) === 'chat' ? 'chats' : 'rooms'
    )
    patchConversation(roomId, { sessionOpen: true })
    if (
      isClientBackendEnabled() &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        roomId
      )
    ) {
      try {
        await fetch(`/api/rooms/${roomId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ session_open: true }),
        })
      } catch {
        // local open still works
      }
    }
    // Same conversation/room — voice uses video=0, video uses video=1
    router.push(
      video ? `/room/${roomId}?video=1` : `/room/${roomId}?video=0`
    )
  }

  function appendMessage(
    partial: Omit<ConversationMessage, 'id' | 'createdAt' | 'fromMe' | 'status'>,
    conversationId?: string
  ) {
    const targetId = conversationId || active?.id
    if (!targetId) return
    const msg: ConversationMessage = {
      id: `msg_${Date.now()}`,
      fromMe: true,
      createdAt: new Date().toISOString(),
      status: 'sent',
      ...partial,
    }
    updatePrefs((current) => {
      const conv = current.conversations.find((c) => c.id === targetId)
      if (!conv) return {}
      const contactKey = conv.members[0]?.id || conv.id
      const prev = ensureFriendship(current.snapPlus, contactKey)
      return {
        conversations: current.conversations.map((item) =>
          item.id === targetId
            ? {
                ...item,
                lastMessage: msg.text,
                updatedAt: msg.createdAt,
                unread: 0,
                messages: [...item.messages, msg],
              }
            : item
        ),
        snapPlus: bumpFriendship(current.snapPlus, contactKey, {
          messagesExchanged: prev.messagesExchanged + 1,
          lastInteractionAt: msg.createdAt,
          streakDays: Math.max(prev.streakDays, 1),
          languagesUsed: Array.from(
            new Set([
              ...prev.languagesUsed,
              current.user?.nativeLanguage || 'bg',
              conv.members[0]?.language || 'en',
            ])
          ),
        }),
      }
    })
  }

  function patchSnap(patch: Partial<typeof snap>) {
    updatePrefs((current) => ({
      snapPlus: { ...current.snapPlus, ...patch },
    }))
  }

  const liveOnAir = prefs.presence === 'in_studio' || prefs.presence === 'in_call'

  async function toggleLiveOnAir() {
    if (!user || !activeId) return
    if (liveOnAir) {
      recordLiveStop()
      updatePrefs((current) => {
        if (!active) return { presence: 'online' }
        const msg: ConversationMessage = {
          id: `msg_${Date.now()}`,
          fromMe: true,
          text: '⚫ OFF AIR — предаването приключи',
          createdAt: new Date().toISOString(),
          status: 'sent',
        }
        return {
          presence: 'online',
          conversations: current.conversations.map((item) =>
            item.id === active.id
              ? {
                  ...item,
                  lastMessage: msg.text,
                  updatedAt: msg.createdAt,
                  messages: [...item.messages, msg],
                }
              : item
          ),
        }
      })
      showDragToast('OFF AIR')
      return
    }

    const gate = recordLiveStart(user.plan)
    if (!gate.ok) {
      showDragToast(gate.reason || 'Лимит за live')
      return
    }
    showDragToast(formatLiveQuotaLabel(user.plan))

    let roomTargetId = activeId
    // LiveKit needs a server UUID room — migrate local chats first
    if (
      isClientBackendEnabled() &&
      !/^[0-9a-f-]{36}$/i.test(roomTargetId) &&
      active
    ) {
      try {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title: active.title || 'Live room',
            channel: 'both',
          }),
        })
        const data = (await res.json()) as {
          room?: { id: string }
          error?: string
        }
        if (!res.ok || !data.room?.id) {
          showDragToast(data.error || 'Неуспешен Live — стаята не се създаде')
          return
        }
        const oldId = roomTargetId
        roomTargetId = data.room.id
        updatePrefs((current) => ({
          conversations: current.conversations.map((c) =>
            c.id === oldId ? { ...c, id: roomTargetId, sessionOpen: true } : c
          ),
          invites: (current.invites || []).map((i) =>
            i.conversationId === oldId
              ? { ...i, conversationId: roomTargetId }
              : i
          ),
        }))
        openThread(roomTargetId, 'rooms')
      } catch {
        showDragToast('Неуспешен Live — провери връзката')
        return
      }
    }

    const story = createStory({
      type: 'text',
      text: '🔴 ON AIR · на живо в OmniVoice',
      audience: 'public',
    })
    const liveRoomId = roomTargetId
    updatePrefs((current) => {
      const social = current.profileSocial || {
        moodId: 'focused' as const,
        bio: '',
        locationLabel: '',
        streakDays: 0,
        stories: [] as ReturnType<typeof createStory>[],
        showOnMap: true,
        publicProfile: true,
      }
      const onAirMsg: ConversationMessage = {
        id: `msg_${Date.now()}`,
        fromMe: true,
        text: '🔴 ON AIR — предавам на живо',
        createdAt: new Date().toISOString(),
        status: 'sent',
      }
      return {
        presence: 'in_studio',
        profileSocial: {
          ...social,
          stories: [story, ...social.stories],
          streakDays: Math.max(social.streakDays, 1),
        },
        conversations: current.conversations.map((item) =>
          item.id === liveRoomId
            ? {
                ...item,
                sessionOpen: true,
                lastMessage: onAirMsg.text,
                updatedAt: onAirMsg.createdAt,
                messages: [...item.messages, onAirMsg],
              }
            : item
        ),
      }
    })
    setMyStories(
      activeStories([story, ...(prefs.profileSocial?.stories || [])])
    )
    showDragToast('ON AIR · влизаш в стаята')
    router.push(`/room/${liveRoomId}?video=1`)
  }

  function submitDealFromStory() {
    if (!active) return
    const title = dealDraft.title.trim() || 'Нова сделка'
    const value = dealDraft.value.trim() || '—'
    const stage = dealDraft.stage.trim() || 'Discovery'
    appendMessage({
      text: `💼 Сделка: ${title} · ${value} · ${stage}`,
      kind: 'deal',
      deal: { title, value, stage },
    })
    setDealComposerOpen(false)
    showDragToast('Сделката е добавена в чата')
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

  function toggleFollowPage(pageId: string) {
    if (!user) return
    const page = prefs.conversations.find((c) => c.id === pageId)
    if (!page) return
    const was =
      (page.followerIds || []).includes(user.id) ||
      page.members.some((m) => m.id === user.id)
    const policy = page.followPolicy || 'public'
    const asGroup = isGroupSpace(page) && page.spaceFormat === 'group'

    if (was) {
      updatePrefs((current) => ({
        conversations: current.conversations.map((c) => {
          if (c.id !== pageId) return c
          return {
            ...c,
            followerIds: (c.followerIds || []).filter((id) => id !== user.id),
            members: c.members.filter((m) => m.id !== user.id),
          }
        }),
      }))
      showDragToast(asGroup ? 'Напусна групата' : 'Спря да следваш')
      return
    }

    if (policy === 'public') {
      updatePrefs((current) => ({
        conversations: current.conversations.map((c) => {
          if (c.id !== pageId) return c
          const followers = new Set(c.followerIds || [])
          followers.add(user.id)
          const members = c.members.some((m) => m.id === user.id)
            ? c.members
            : asGroup
              ? [
                  ...c.members,
                  {
                    id: user.id,
                    name: user.displayName || user.fullName,
                    language: user.nativeLanguage || 'bg',
                    presence: 'online' as const,
                  },
                ]
              : c.members
          return { ...c, followerIds: [...followers], members }
        }),
      }))
      showDragToast(asGroup ? 'Вече си член' : 'Вече следваш страницата')
      return
    }

    // approval / invite — pending request for creator
    if (hasPendingFollowOrJoin(page, user.id)) {
      showDragToast('Заявката вече чака одобрение')
      return
    }
    const req = makeFollowOrJoinRequest({
      userId: user.id,
      name: user.displayName || user.fullName,
      language: user.nativeLanguage || 'bg',
    })
    updatePrefs((current) => ({
      conversations: current.conversations.map((c) =>
        c.id !== pageId
          ? c
          : {
              ...c,
              joinRequests: [...(c.joinRequests || []), req],
            }
      ),
    }))
    pushFeedNotification({
      kind: asGroup ? 'join' : 'follow',
      title: asGroup ? 'Заявка за група' : 'Заявка за follow',
      body: `Изпратена към „${page.title}“ — чака одобрение от създателя.`,
      pageId,
    })
    showDragToast(
      asGroup
        ? 'Заявката за членство е изпратена'
        : 'Заявката за следване е изпратена'
    )
  }

  function openSocialSpace(id: string, postId?: string) {
    setSocialView({ id, postId })
    setTab('feed')
    setThreadOpen(false)
  }

  function acceptSpaceRequest(spaceId: string, requestId: string) {
    if (!user) return
    updatePrefs((current) => ({
      conversations: current.conversations.map((c) => {
        if (c.id !== spaceId) return c
        const req = (c.joinRequests || []).find((j) => j.id === requestId)
        if (!req) return c
        const followers = new Set(c.followerIds || [])
        followers.add(req.subscriberId)
        const members = c.members.some((m) => m.id === req.subscriberId)
          ? c.members
          : [
              ...c.members,
              {
                id: req.subscriberId,
                name: req.name,
                language: req.language || 'bg',
                presence: 'offline' as const,
              },
            ]
        return {
          ...c,
          followerIds: [...followers],
          members,
          joinRequests: (c.joinRequests || []).map((j) =>
            j.id === requestId ? { ...j, status: 'accepted' as const } : j
          ),
        }
      }),
    }))
    showDragToast('Заявката е приета')
  }

  function patchMeetMatch(
    patch: Partial<typeof DEFAULT_MEET_MATCH> | ((s: typeof DEFAULT_MEET_MATCH) => typeof DEFAULT_MEET_MATCH)
  ) {
    updatePrefs((current) => {
      const base = current.meetMatch || DEFAULT_MEET_MATCH
      const next = typeof patch === 'function' ? patch(base) : { ...base, ...patch }
      return { meetMatch: next }
    })
  }

  function handleMeetRoomSend(peerId: string) {
    patchMeetMatch((s) => ({
      ...s,
      rooms: bumpMeetStreak(s, peerId),
    }))
  }

  function handleMeetPatchRoom(peerId: string, patch: Partial<MeetRoomMeta>) {
    patchMeetMatch((s) => {
      const prev = s.rooms?.[peerId] || {
        streakDays: 0,
        lastChatDay: null,
        quiet: false,
        interests: [],
      }
      return {
        ...s,
        rooms: { ...(s.rooms || {}), [peerId]: { ...prev, ...patch } },
      }
    })
  }

  function handleMeetUnmatch(peerId: string) {
    const convId = meetConversationId(peerId)
    patchMeetMatch((s) => ({
      ...s,
      matchedIds: s.matchedIds.filter((id) => id !== peerId),
      unmatchedIds: [...new Set([...(s.unmatchedIds || []), peerId])],
    }))
    updatePrefs((current) => ({
      conversations: current.conversations.filter((c) => c.id !== convId),
      subscribers: current.subscribers.map((s) =>
        s.id === peerId ? { ...s, status: 'blocked' as const } : s
      ),
    }))
    if (activeId === convId) {
      setActiveId('')
      setThreadOpen(false)
    }
    setMeetRoomOpen(false)
    showDragToast('Мачът е прекратен (Unmatch)')
  }

  function handleMeetReport(peerId: string, reason: string) {
    patchMeetMatch((s) => ({
      ...s,
      reportedIds: [...new Set([...(s.reportedIds || []), peerId])],
    }))
    showDragToast(`Докладвано · ${reason.slice(0, 40)}`)
  }

  function handleMeetLike(candidate: MeetMatchCandidate) {
    // Always send chat invite (add contact + pending chat)
    const already = prefs.subscribers.some((s) => s.id === candidate.id)
    if (!already) {
      updatePrefs((current) => ({
        subscribers: [
          {
            id: candidate.id,
            name: candidate.displayName,
            email: '',
            phone: '',
            language: candidate.language,
            status: 'invited' as const,
            plan: 'free' as const,
            presence: 'online' as const,
            avatarDataUrl: candidate.photoUrl,
            source: 'manual' as const,
          },
          ...current.subscribers,
        ],
      }))
    }

    if (candidate.likesYou) {
      // Mutual match — special lighthearted room + gifts + free translate
      patchMeetMatch((s) => ({
        ...s,
        likedIds: [...s.likedIds, candidate.id],
        matchedIds: [...s.matchedIds, candidate.id],
      }))
      const now = new Date().toISOString()
      const convId = meetConversationId(candidate.id)
      const existing = prefs.conversations.find((c) => c.id === convId)
      if (!existing) {
        const conv: Conversation = {
          id: convId,
          title: candidate.displayName,
          isGroup: false,
          space: 'chat',
          roomKind: 'meet',
          members: [
            {
              id: candidate.id,
              name: candidate.displayName,
              language: candidate.language,
              presence: 'online',
              avatarDataUrl: candidate.photoUrl,
            },
          ],
          lastMessage: 'Мач! Специална стая е отворена 💛',
          updatedAt: now,
          unread: 1,
          pinned: false,
          muted: false,
          messages: [
            {
              id: `msg_${Date.now()}`,
              fromMe: false,
              text: `Здравей! Харесахме се в Случайни запознанства 💫 Да започнем на леко?`,
              createdAt: now,
              status: 'delivered',
            },
          ],
          saveChat: true,
          disappearAfter: 'off',
          sessionOpen: true,
          activeGuestIds: [],
          joinRequests: [],
        }
        updatePrefs((current) => ({
          conversations: [conv, ...current.conversations],
          subscribers: current.subscribers.map((s) =>
            s.id === candidate.id ? { ...s, status: 'active' as const } : s
          ),
        }))
      } else if (existing.roomKind !== 'meet') {
        updatePrefs((current) => ({
          conversations: current.conversations.map((c) =>
            c.id === convId ? { ...c, roomKind: 'meet' as const } : c
          ),
        }))
      }
      openThread(convId, 'chats')
      setMeetMatchOpen(false)
      setMeetRoomOpen(true)
      showDragToast(`Мач с ${candidate.displayName} · стаята е отворена`)
      return
    }

    // Invite sent — they reject (don't like you back)
    patchMeetMatch((s) => ({
      ...s,
      likedIds: [...s.likedIds, candidate.id],
      rejectedIds: [...s.rejectedIds, candidate.id],
    }))
    showDragToast(
      `Покана към ${candidate.displayName} · отхвърли я (не те харесва)`
    )
  }

  function startConversationFromSubscriber(subId: string): Conversation | undefined {
    const sub = prefs.subscribers.find((item) => item.id === subId)
    if (!sub) return undefined
    const existing = prefs.conversations.find(
      (conv) =>
        conversationSpace(conv) === 'chat' &&
        !conv.isGroup &&
        conv.title === sub.name
    )
    if (existing) {
      openThread(existing.id, 'chats')
      return existing
    }
    const conv: Conversation = {
      id: `conv_${Date.now()}`,
      title: sub.name,
      isGroup: false,
      space: 'chat',
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
      updatedAt: new Date().toISOString(),
      unread: 0,
      pinned: false,
      muted: false,
      saveChat: true,
      disappearAfter: 'off',
      sessionOpen: true,
      activeGuestIds: [],
      messages: [],
      joinRequests: [],
    }
    updatePrefs((current) => ({
      conversations: [conv, ...current.conversations],
    }))
    openThread(conv.id, 'chats')
    return conv
  }

  function showDragToast(text: string) {
    setDragToast(text)
    window.setTimeout(() => setDragToast(null), 2200)
  }

  function openBusinessIntelPicker() {
    if (workspace !== 'business' || prefs.experience?.callRecap === false) {
      showDragToast('Business Intel е изключен в настройките')
      return
    }
    setRecapOpen(true)
    setIntelSelecting(true)
    setIntelLoading(false)
    setIntelError(null)
    setIntelData(null)
  }

  async function runDashboardIntel(options: BusinessIntelOptionId[]) {
    if (workspace !== 'business' || !options.length) return
    setIntelOptions(options)
    setIntelSelecting(false)
    setRecapOpen(true)
    setIntelLoading(true)
    setIntelError(null)
    const { messages } = collectIntelSources({
      chatMessages: (active?.messages || []).map((m) => ({
        fromMe: m.fromMe,
        text: m.text,
        translatedText: m.translatedText,
        createdAt: m.createdAt,
        kind: m.kind,
      })),
      youName: user?.displayName || 'Ти',
      peerName: active?.members[0]?.name,
    })
    try {
      const intel = await fetchBusinessIntel({
        messages,
        transcript: [],
        sourceLang: getLanguage(user?.nativeLanguage || 'bg').name,
        targetLang: getLanguage(prefs.voice?.targetLanguage || 'en').name,
        minutes: Math.max(1, Math.round((active?.messages.length || 1) / 4)),
        context: active?.title || 'Business chat',
        options,
        contractComposeFrom:
          prefs.experience.businessRoom?.contractComposeFrom,
      })
      setIntelData(intel)
    } catch (err) {
      setIntelError(err instanceof Error ? err.message : 'Intel failed')
    } finally {
      setIntelLoading(false)
    }
  }

  function addSubscriberToConversation(subId: string, conversationId: string) {
    const sub = prefs.subscribers.find((item) => item.id === subId)
    const conv = prefs.conversations.find((item) => item.id === conversationId)
    if (!sub || !conv) return

    if (conv.members.some((m) => m.id === sub.id)) {
      openThread(conversationId, 'rooms')
      showDragToast(`${sub.name} вече е в стаята`)
      return
    }

    if (roomIsFull(conv.members.length, user?.plan)) {
      showDragToast(
        `Лимит ${maxLiveParticipants(user?.plan)} души · ${roomCapacityLabel(user?.plan)}`
      )
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

    updatePrefs((current) => ({
      conversations: current.conversations.map((item) =>
        item.id === conversationId
          ? {
              ...item,
              members: nextMembers,
              isGroup: becomesGroup,
              space: 'room' as const,
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
    }))
    openThread(conversationId, 'rooms')
    showDragToast(`${sub.name} → ${conv.title}`)
  }

  function onSubscriberDragStart(subId: string, e: DragEvent) {
    setDragSubId(subId)
    setTab('rooms')
    setThreadOpen(false)
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
    updatePrefs((current) => ({
      subscribers: current.subscribers.map((item) =>
        item.id === subId ? { ...item, status: 'blocked' } : item
      ),
      blocked: [
        {
          id: sub.id,
          name: sub.name,
          reason: 'Ръчно блокиран',
          blockedAt: new Date().toISOString(),
        },
        ...current.blocked,
      ],
    }))
  }

  function removeSubscriber(subId: string) {
    if (!window.confirm('Премахни абоната от списъка?')) return
    updatePrefs((current) => ({
      subscribers: current.subscribers.filter((item) => item.id !== subId),
    }))
  }

  function addFriendFromHit(hit: FriendHit) {
    const key = hit.displayName.trim().toLowerCase()
    if (
      prefs.subscribers.some(
        (s) =>
          s.name.trim().toLowerCase() === key ||
          (hit.email && s.email && s.email === hit.email) ||
          s.id === hit.id
      )
    ) {
      showDragToast(`${hit.displayName} вече е приятел`)
      return
    }
    updatePrefs((current) => ({
      subscribers: [
        {
          id: hit.source === 'server' ? hit.id : `sub_${Date.now()}`,
          name: hit.displayName,
          email: hit.email || '',
          phone: '',
          language: hit.language || current.user?.nativeLanguage || 'bg',
          status: 'active' as const,
          plan: (hit.plan as PlanId) || 'free',
          presence: 'online' as const,
          avatarDataUrl: hit.avatarUrl || undefined,
          source: 'manual' as const,
        },
        ...current.subscribers,
      ],
    }))
    showDragToast(`Добавен: ${hit.displayName}`)
  }

  /** Normal/free and all plans: add contact without checkout */
  function addSubscriberManual() {
    const name = newSubName.trim()
    if (!name) return
    const contact = newSubContact.trim()
    const key = name.toLowerCase()
    if (
      prefs.subscribers.some((s) => s.name.trim().toLowerCase() === key)
    ) {
      showDragToast(`${name} вече е в списъка`)
      return
    }
    updatePrefs((current) => ({
      subscribers: [
        {
          id: `sub_${Date.now()}`,
          name,
          email: contact.includes('@') ? contact : '',
          phone: contact.includes('@') ? '' : contact,
          language: current.user?.nativeLanguage || 'bg',
          status: 'active' as const,
          plan: 'free' as const,
          presence: 'offline' as const,
          source: 'manual' as const,
        },
        ...current.subscribers,
      ],
    }))
    setNewSubName('')
    setNewSubContact('')
    showDragToast(`${name} е добавен/а в абонати`)
  }

  async function deleteRoom(roomId: string) {
    if (!window.confirm('Изтрий стаята завинаги? Това маха чата и поканите.')) {
      return
    }
    try {
      if (isClientBackendEnabled() && /^[0-9a-f-]{36}$/i.test(roomId)) {
        const res = await fetch(`/api/rooms/${roomId}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string
          }
          window.alert(data.error || 'Неуспешно изтриване от сървъра')
          return
        }
      }
      updatePrefs((current) => {
        const next = current.conversations.filter((c) => c.id !== roomId)
        if (activeId === roomId) {
          setActiveId('')
          setThreadOpen(false)
        }
        return {
          conversations: next,
          invites: (current.invites || []).filter(
            (i) => i.conversationId !== roomId
          ),
        }
      })
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : 'Неуспешно изтриване'
      )
    }
  }

  async function renameRoom(roomId: string) {
    const conv = prefs.conversations.find((c) => c.id === roomId)
    if (!conv) return
    const title = window.prompt('Ново име на стаята', conv.title)
    if (!title?.trim()) return
    patchConversation(roomId, { title: title.trim() })
    if (isClientBackendEnabled() && /^[0-9a-f-]{36}$/i.test(roomId)) {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: title.trim() }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        showDragToast(data.error || 'Преименуването на сървъра не успя')
      }
    }
  }

  async function endRoomSession(roomId: string) {
    updatePrefs((current) => ({
      conversations: current.conversations.map((item) =>
        item.id === roomId
          ? {
              ...item,
              sessionOpen: false,
              activeGuestIds: [],
              members: item.members.filter((m) => !m.id.startsWith('guest_')),
              lastMessage: 'Хостът приключи разговора',
              joinRequests: (item.joinRequests || []).map((r) =>
                r.status === 'pending'
                  ? { ...r, status: 'declined' as const }
                  : r
              ),
            }
          : item
      ),
    }))
    if (isClientBackendEnabled() && /^[0-9a-f-]{36}$/i.test(roomId)) {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ session_open: false }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        showDragToast(data.error || 'Сесията на сървъра не се затвори')
      }
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
          openThread(
            roomId,
            conversationSpace(conv) === 'room' ? 'rooms' : 'chats'
          )
        },
      },
      {
        id: 'friendship',
        label: 'Friendship Profile',
        icon: Users,
        onClick: () => setFriendshipId(roomId),
      },
      {
        id: 'voice',
        label: 'Гласово обаждане',
        icon: Phone,
        onClick: () => void enterLiveRoom(roomId, false),
      },
      {
        id: 'enter',
        label: 'Видео обаждане',
        icon: Video,
        onClick: () => void enterLiveRoom(roomId, true),
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
    if (subId) return startConversationFromSubscriber(subId)
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
          const started = startConversationFromSubscriber(subId)
          if (started) void createInvite(subId, started.id, started)
        },
      },
      {
        id: 'call',
        label: 'Гласово обаждане',
        icon: Phone,
        onClick: () => {
          const started = startConversationFromSubscriber(subId)
          if (started) void enterLiveRoom(started.id, false)
        },
      },
      {
        id: 'video',
        label: 'Видео обаждане',
        icon: Video,
        onClick: () => {
          const started = startConversationFromSubscriber(subId)
          if (started) void enterLiveRoom(started.id, true)
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
          updatePrefs((current) => ({
            subscribers: current.subscribers.map((s) =>
              s.id === subId
                ? {
                    ...s,
                    status: s.status === 'paused' ? 'active' : 'paused',
                  }
                : s
            ),
          })),
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
      let newInvite: InviteLink | null = null
      let usedBackend = false

      if (isClientBackendEnabled()) {
        try {
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
          if (res.ok && data.room?.id) {
            roomId = data.room.id
            usedBackend = true
          }
        } catch {
          // fall through to local room
        }
      }

      if (draft.allowGuests && draft.copyInvite) {
        const invResult = await createServerGuestInvite({
          roomId: usedBackend ? roomId : undefined,
          roomTitle: draft.title,
          label: `Покана · ${draft.title}`,
          channel: draft.channel,
          prefillLanguage: draft.guestLanguage,
        })
        if (!invResult.ok) {
          showDragToast(invResult.error)
        } else {
          roomId = invResult.roomId
          usedBackend = true
          newInvite = {
            id: invResult.inviteId,
            code: invResult.code,
            conversationId: invResult.roomId,
            label: invResult.label,
            channel: draft.channel,
            prefillLanguage: draft.guestLanguage,
            createdAt: new Date().toISOString(),
            active: true,
          }
          void navigator.clipboard
            .writeText(invResult.url)
            .catch(() => undefined)
          setInviteCopied(true)
          window.setTimeout(() => setInviteCopied(false), 2000)
        }
      }

      if (draft.roomKind === 'watch') {
        updatePrefs((current) => ({
          podcast: {
            ...current.podcast,
            sessionMode: 'streaming',
            streaming: {
              ...current.podcast.streaming,
              scene: 'watch_party',
              watchTogetherLive: true,
              watchTogetherCategory: 'series',
              contentHint: 'series',
            },
          },
        }))
      }

      if (draft.voiceBridgeRoom) {
        const plate = pickAiRoomImage(
          draft.voiceBridgePrompt || draft.title || 'cafe loft'
        )
        updatePrefs((current) => ({
          room: {
            ...current.room,
            cutoutMode: 'contour',
            virtualBackground: true,
            customBackground: plate.imageUrl,
          },
          voice: {
            ...current.voice,
            targetLanguage:
              draft.voiceBridgeTargetLang ||
              draft.guestLanguage ||
              current.voice.targetLanguage,
          },
        }))
      }

      const now = new Date().toISOString()
      if (draft.spaceFormat && ['page', 'business', 'podcast'].includes(draft.spaceFormat)) {
        const gate = canCreateOwnedPage(
          user,
          prefs.conversations,
          draft.spaceFormat as SpaceFormat
        )
        if (!gate.ok) {
          showDragToast(gate.reason || 'Не може да се създаде страницата')
          return
        }
      }

      const format = draft.spaceFormat
      const conv: Conversation = {
        id: roomId,
        title: draft.title,
        isGroup: true,
        space: 'room',
        roomKind: draft.roomKind || 'general',
        communityKind: draft.communityKind,
        adminUserId: user.id,
        followPolicy: defaultFollowPolicy(format),
        ...(format
          ? {
              spaceFormat: format,
              interestTags: draft.interestTags || [],
              allowCrossPlanFollow:
                format === 'page' ||
                format === 'business' ||
                format === 'podcast',
              followerIds: [],
            }
          : {
              // Plain room / group — invite-only, not globally visible
              spaceFormat: format || 'group',
              interestTags: draft.interestTags || [],
              allowCrossPlanFollow: false,
              followerIds: [],
            }),
        members: [],
        lastMessage: draft.allowGuests
          ? 'Стаята е готова · покани гости'
          : 'Стаята е създадена',
        updatedAt: now,
        unread: 0,
        pinned: false,
        muted: false,
        messages: [
          {
            id: `msg_${Date.now()}`,
            fromMe: true,
            text: `🏠 Стаята „${draft.title}“ е създадена`,
            createdAt: now,
            status: 'sent',
          },
        ],
        saveChat: draft.saveChat,
        disappearAfter: draft.disappearAfter,
        sessionOpen: true,
        activeGuestIds: [],
        joinRequests: [],
      }

      const inviteSnapshot = newInvite
      const savedAiPick = (prefs.aiRooms || []).find(
        (r) => r.id === draft.studioRoomId
      )
      const isAiBuiltinPick = AI_BUILTIN_ROOMS.some(
        (r) => r.id === draft.studioRoomId
      )
      updatePrefs((current) => ({
        room: {
          studioRoomId: draft.studioRoomId,
          // Saved AI rooms are remote URLs — resolved via customBackground
          ...(savedAiPick
            ? { customBackground: savedAiPick.imageUrl }
            : isAiBuiltinPick
              ? { customBackground: null }
              : {}),
          // AI virtual rooms keep contour cutout (default)
          ...(savedAiPick || isAiBuiltinPick
            ? { cutoutMode: 'contour' as const }
            : {}),
          videoQuality: draft.videoQuality,
          waitingRoom: draft.waitingRoom,
          allowGuests: draft.allowGuests,
          knockToEnter: draft.waitingRoom,
        },
        voice: {
          targetLanguage: draft.guestLanguage,
        },
        conversations: [
          conv,
          ...current.conversations.filter((c) => c.id !== roomId),
        ],
        ...(inviteSnapshot
          ? { invites: [inviteSnapshot, ...(current.invites || [])] }
          : {}),
      }))
      openThread(roomId, 'rooms')
      setInboxFilter('all')
      setCreateRoomOpen(false)
      showDragToast(
        newInvite
          ? 'Стая готова · guest линкът е в клипборда'
          : usedBackend
            ? 'Стаята е създадена'
            : 'Стаята е създадена (локално)'
      )
      if (newInvite && typeof window !== 'undefined') {
        setInviteShare({
          url: guestInviteUrl(newInvite.code),
          label: 'OmniVoice guest покана',
          roomId,
        })
        showDragToast('Guest линк готов — сподели или копирай')
      }

      if (draft.enterNow) {
        const video =
          draft.videoOnJoin &&
          (draft.channel === 'both' || draft.channel === 'call')
        router.push(`/room/${roomId}?video=${video ? '1' : '0'}`)
      }
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : 'Неуспешно създаване на стая'
      )
    } finally {
      setCreatingRoom(false)
    }
  }

  function invitePersonToApp(forName?: string) {
    if (!user) return
    const url = appInviteUrl({
      hostId: user.id,
      hostName: user.displayName || user.fullName || 'OmniVoice',
    })
    setInviteShare({
      url,
      label: forName
        ? `Покана за ${forName} · OmniVoice`
        : 'Покана към OmniVoice',
    })
    setInviteCopied(true)
    window.setTimeout(() => setInviteCopied(false), 2200)
    showDragToast('Линк готов — натисни Сподели или Копирай')
  }

  async function createInvite(
    forSubscriberId?: string,
    conversationId?: string,
    knownTarget?: Conversation
  ) {
    if (!user) return
    try {
      const targetId = conversationId || activeId
      const target =
        knownTarget ||
        prefs.conversations.find((item) => item.id === targetId)
      const sub = forSubscriberId
        ? prefs.subscribers.find((item) => item.id === forSubscriberId)
        : undefined

      const result = await createServerGuestInvite({
        roomId: target?.id,
        roomTitle: target?.title || sub?.name || 'Guest room',
        label: `Покана за ${target?.title || sub?.name || 'гост'}`,
        channel: 'both',
        prefillName: sub?.name,
        prefillLanguage: sub?.language,
      })

      if (!result.ok) {
        window.alert(result.error)
        return
      }

      if (result.migratedFrom && target) {
        updatePrefs((current) => ({
          conversations: current.conversations.map((c) =>
            c.id === result.migratedFrom
              ? {
                  ...c,
                  id: result.roomId,
                  sessionOpen: true,
                  space: 'room' as const,
                }
              : c
          ),
          invites: (current.invites || []).map((i) =>
            i.conversationId === result.migratedFrom
              ? { ...i, conversationId: result.roomId }
              : i
          ),
        }))
      }

      const invite: InviteLink = {
        id: result.inviteId,
        code: result.code,
        conversationId: result.roomId,
        label: result.label,
        channel: 'both',
        prefillName: sub?.name,
        prefillLanguage: sub?.language,
        createdAt: new Date().toISOString(),
        active: true,
      }

      updatePrefs((current) => {
        const hasConv = current.conversations.some(
          (c) => c.id === result.roomId
        )
        return {
          invites: [invite, ...(current.invites || [])],
          conversations: hasConv
            ? current.conversations.map((c) =>
                c.id === result.roomId
                  ? { ...c, sessionOpen: true, space: 'room' as const }
                  : c
              )
            : [
                {
                  id: result.roomId,
                  title: target?.title || sub?.name || 'Guest room',
                  isGroup: true,
                  space: 'room' as const,
                  members: target?.members || [],
                  lastMessage: 'Сървърна стая готова за гости',
                  updatedAt: new Date().toISOString(),
                  unread: 0,
                  pinned: false,
                  muted: false,
                  messages: target?.messages || [],
                  saveChat: true,
                  disappearAfter: 'off' as const,
                  sessionOpen: true,
                  activeGuestIds: [],
                  joinRequests: [],
                },
                ...current.conversations,
              ],
        }
      })
      openThread(result.roomId, 'rooms')
      setInviteCopied(true)
      window.setTimeout(() => setInviteCopied(false), 2500)
      // Phone: clipboard after await fetch has no user-gesture — show sheet instead
      setInviteShare({
        url: result.url,
        label: result.label || 'OmniVoice guest покана',
        roomId: result.roomId,
      })
      showDragToast('Guest линк готов — сподели или копирай')
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : 'Неуспешна покана'
      )
    }
  }

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">
        Зареждане…
      </div>
    )
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-transparent text-[var(--foreground)]">
      <OnboardingTour
        force={forceOnboarding}
        onFinished={() => setForceOnboarding(false)}
      />
      <header className="relative z-[110] flex shrink-0 items-center justify-between gap-3 overflow-visible border-b border-[var(--panel-border)]/80 bg-[var(--panel)]/80 px-4 py-3 backdrop-blur-xl">
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
          <div className="min-w-0">
            <button
              type="button"
              className="block max-w-[10rem] truncate text-left text-sm font-semibold sm:max-w-[14rem]"
              onClick={() => setProfileOpen(true)}
            >
              {user.displayName}
            </button>
            <div className="relative mt-0.5">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--accent)] ring-1 ring-[var(--accent)]/30"
                title="Смени план / режим"
                onClick={() => {
                  setPlanOpen((v) => !v)
                  setMenuOpen(false)
                }}
              >
                План:{' '}
                {user.plan === 'free'
                  ? 'Normal'
                  : user.plan === 'business'
                    ? 'Business'
                    : 'Podcast'}
                <ChevronDown className="h-3 w-3" />
              </button>
              {planOpen ? (
                <div className="ov-panel absolute left-0 top-7 z-[130] w-64 rounded-2xl p-2 shadow-2xl ring-1 ring-[var(--panel-border)]">
                  <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Смени план
                  </p>
                  {(['free', 'business', 'podcast'] as PlanId[]).map(
                    (planId) => {
                      const unlocked = getUnlockedPlans(user).includes(planId)
                      const active = user.plan === planId
                      return (
                        <button
                          key={planId}
                          type="button"
                          disabled={!unlocked && planId !== 'free'}
                          title={
                            unlocked
                              ? `Превключи към ${PLANS[planId].label}`
                              : 'Плати за този план, за да го отключиш'
                          }
                          onClick={() => {
                            if (!unlocked) {
                              router.push(`/checkout?plan=${planId}`)
                              setPlanOpen(false)
                              return
                            }
                            updatePrefs((current) => ({
                              user: applyAdminGrantsToUser(
                                withUnlockedPlan(user, planId, true),
                                current.adminPlanGrants
                              ),
                            }))
                            saveLastActivePlan(planId)
                            showDragToast(`Режим: ${PLANS[planId].label}`)
                            setPlanOpen(false)
                          }}
                          className={`mb-1 flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-semibold ${
                            active
                              ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                              : unlocked
                                ? 'bg-[var(--chip)] text-[var(--foreground)] hover:ring-1 hover:ring-[var(--panel-border)]'
                                : 'cursor-pointer opacity-55'
                          }`}
                        >
                          <span>
                            {planId === 'free'
                              ? 'Normal (Free)'
                              : planId === 'business'
                                ? 'Business'
                                : 'Podcast'}
                          </span>
                          <span className="text-[10px] opacity-80">
                            {active ? '✓' : unlocked ? 'отворен' : '🔒 плати'}
                          </span>
                        </button>
                      )
                    }
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <nav
          className="absolute left-1/2 top-1/2 z-40 hidden max-w-[min(22rem,40vw)] -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 rounded-2xl bg-[var(--chip)]/90 p-1 ring-1 ring-[var(--panel-border)]/60 lg:flex"
          aria-label="Основна навигация"
        >
          {(
            [
              ['feed', 'Начало', Newspaper],
              ['chats', 'Чатове', MessageCircle],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id)
                setInboxFilter('all')
                setThreadOpen(false)
                if (id === 'feed') setSocialView(null)
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition ${
                tab === id && !threadOpen && !(id === 'feed' && socialView)
                  ? 'bg-[var(--panel)] text-[var(--foreground)] shadow-sm'
                  : tab === id
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </nav>

        <div className="relative z-50 flex flex-wrap items-center justify-end gap-1.5 overflow-visible sm:gap-2">
          {coachTrigger ? (
            <CoachBubble
              key={`${coachTrigger}-${coachTick}`}
              id={coachTrigger}
              trigger
              forceOnTrigger
              className="right-0 top-full mt-2"
              onClose={() => setCoachTrigger(null)}
            />
          ) : null}
          <InstallAppButton variant="compact" />
          <button
            type="button"
            className="ov-icon-btn"
            title="Докладвай нередност"
            aria-label="Докладвай нередност"
            onClick={() => setHelpOpen(true)}
          >
            <Flag className="h-4 w-4" />
          </button>
          <FeedNotificationsBell
            onOpenPage={(id) => {
              openSocialSpace(id)
            }}
          />
          <button
            type="button"
            className="ov-btn-ghost !inline-flex !px-2.5 !py-1.5 !text-[11px]"
            title="Покани guest — копира линк"
            onClick={() => {
              showCoach('invite')
              void createInvite()
            }}
          >
            <Link2 className="h-3.5 w-3.5" />
            {inviteCopied ? 'Линк OK' : 'Покани'}
          </button>
          <button
            type="button"
            className="ov-icon-btn"
            title="Quick Capture"
            onClick={() => setCaptureOpen(true)}
          >
            <Camera className="h-4 w-4" />
          </button>
          {prefs.meetMatch?.enabled ? (
            <button
              type="button"
              className="ov-icon-btn text-rose-500"
              title="Случайни запознанства"
              onClick={() => setMeetMatchOpen(true)}
            >
              <Heart className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            className="ov-icon-btn"
            title="Find My — къде са близки и приятели"
            onClick={() => setMapOpen(true)}
          >
            <MapPin className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="ov-icon-btn hidden sm:inline-flex"
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
            <div className="ov-panel fixed left-3 right-3 top-[4.25rem] z-[120] flex max-h-[min(70dvh,32rem)] max-w-[22rem] flex-col overflow-hidden rounded-2xl p-2.5 shadow-2xl sm:left-auto sm:right-4 sm:ml-auto sm:w-[22rem]">
              <div className="ov-scroll min-h-0 flex-1 space-y-0.5 pr-0.5">
                <div className="mb-2 rounded-xl bg-[var(--chip)] px-2.5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Режим / план
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(['free', 'business', 'podcast'] as PlanId[]).map(
                      (planId) => {
                        const unlocked = getUnlockedPlans(user).includes(planId)
                        const active = user.plan === planId
                        return (
                          <button
                            key={planId}
                            type="button"
                            disabled={!unlocked}
                            title={
                              unlocked
                                ? `Превключи към ${PLANS[planId].label}`
                                : 'Плати за този план, за да го отключиш'
                            }
                            onClick={() => {
                              if (!unlocked) {
                                router.push(`/checkout?plan=${planId}`)
                                setMenuOpen(false)
                                return
                              }
                              updatePrefs((current) => ({
                                user: applyAdminGrantsToUser(
                                  withUnlockedPlan(user, planId, true),
                                  current.adminPlanGrants
                                ),
                              }))
                              saveLastActivePlan(planId)
                              showDragToast(`Режим: ${PLANS[planId].label}`)
                              setMenuOpen(false)
                            }}
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                              active
                                ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                                : unlocked
                                  ? 'bg-[var(--panel)] text-[var(--foreground)] ring-1 ring-[var(--panel-border)]'
                                  : 'cursor-not-allowed opacity-40'
                            }`}
                          >
                            {planId === 'free'
                              ? 'Normal'
                              : planId === 'business'
                                ? 'Business'
                                : 'Podcast'}
                            {!unlocked ? ' 🔒' : ''}
                          </button>
                        )
                      }
                    )}
                  </div>
                </div>
                <MenuItem
                  icon={Headphones}
                  label="Настройки на стая"
                  onClick={() => {
                    setMenuOpen(false)
                    showCoach('settings')
                    setSettingsScope('room')
                    setSettingsTab('room')
                    setSettingsOpen(true)
                  }}
                />
                <MenuItem
                  icon={Volume2}
                  label="Звук / музика"
                  onClick={() => {
                    setMenuOpen(false)
                    setSettingsScope('full')
                    setSettingsTab('music')
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
                  icon={MessageCircle}
                  label="Помощ и докладване"
                  onClick={() => {
                    setMenuOpen(false)
                    setHelpOpen(true)
                  }}
                />
                <MenuItem
                  icon={UserPlus}
                  label="Добави абонат"
                  onClick={() => {
                    setMenuOpen(false)
                    setTab('subscribers')
                  }}
                />
                <MenuItem
                  icon={Share2}
                  label="Покани към приложението"
                  onClick={() => {
                    setMenuOpen(false)
                    void invitePersonToApp()
                  }}
                />
                {workspace === 'business' || admin ? (
                  <MenuItem
                    icon={UserPlus}
                    label="Импорт контакти (CRM)"
                    onClick={() => {
                      setMenuOpen(false)
                      setImportOpen(true)
                    }}
                  />
                ) : null}
                {workspace === 'podcast' || admin ? (
                  <MenuItem
                    icon={Radio}
                    label="Multistream / OBS"
                    onClick={() => {
                      setMenuOpen(false)
                      setSettingsScope('full')
                      setSettingsTab('platforms')
                      setSettingsOpen(true)
                    }}
                  />
                ) : null}
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
                  label={inviteCopied ? 'Линкът е копиран' : 'Покани guest'}
                  onClick={() => {
                    void createInvite()
                    setMenuOpen(false)
                  }}
                />
                <MenuItem
                  icon={Sun}
                  label="Теми"
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
                    showCoach('settings')
                    setSettingsScope('full')
                    setSettingsTab('account')
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
            </div>
          ) : null}
        </div>
      </header>

      <div
        className={`mx-auto grid w-full max-w-7xl min-h-0 flex-1 overflow-hidden ${
          tab !== 'feed' && threadOpen
            ? 'grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:grid-rows-none'
            : 'grid-cols-1 grid-rows-[minmax(0,1fr)]'
        }`}
      >
        {workspace === 'business' ? (
          <div
            className={
              tab === 'feed'
                ? 'hidden'
                : threadOpen
                  ? 'hidden min-h-0 lg:contents'
                  : 'contents'
            }
          >
          <BusinessAside
            deals={pipelineDeals}
            conversations={prefs.conversations}
            activeId={activeId}
            stageFilter={dealStageFilter}
            onStageFilter={setDealStageFilter}
            onSelectDeal={(id) => {
              openThread(id, 'rooms')
              patchConversation(id, { sessionOpen: true })
            }}
            onOpenRoom={(id) => {
              openThread(id, 'rooms')
              void enterLiveRoom(id, true)
            }}
            onNewDeal={() => {
              setDealComposerOpen(true)
              setTab('rooms')
              setThreadOpen(false)
            }}
            onCreateRoom={() => {
              setTab('rooms')
              setCreateRoomOpen(true)
              setThreadOpen(false)
            }}
            onInviteGuest={() => void createInvite()}
            inviteCopied={inviteCopied}
            onImportContacts={() => setImportOpen(true)}
            secretaryEnabled={Boolean(user.secretaryEnabled)}
            secretaryPhone={user.secretaryPhone || ''}
            onOpenSecretary={() => {
              setSettingsScope('full')
              setSettingsTab('secretary')
              setSettingsOpen(true)
            }}
          />
          </div>
        ) : workspace === 'podcast' ? (
          <div
            className={
              tab === 'feed'
                ? 'hidden'
                : threadOpen
                  ? 'hidden min-h-0 lg:contents'
                  : 'contents'
            }
          >
          <PodcastAside
            conversations={prefs.conversations}
            activeId={activeId}
            onSelectShow={(id) => {
              openThread(id, 'rooms')
              patchConversation(id, { sessionOpen: true })
            }}
            onOpenRoom={(id) => {
              openThread(id, 'rooms')
              void enterLiveRoom(id, true)
            }}
            onCreateShow={() => {
              setTab('rooms')
              setCreateRoomOpen(true)
              setThreadOpen(false)
            }}
            onInviteGuest={() => void createInvite()}
            inviteCopied={inviteCopied}
            guestCount={
              active?.members.filter((m) => m.id.startsWith('guest_')).length ||
              subscribers.length
            }
            liveOnAir={liveOnAir}
            onToggleLive={() => {
              showCoach('go_live')
              setLiveGoOpen(true)
            }}
          />
          </div>
        ) : (
        <aside
          className={`min-h-0 flex-col overflow-hidden border-r border-[var(--panel-border)] bg-[var(--panel)] ${
            tab === 'feed'
              ? 'hidden'
              : threadOpen
                ? 'hidden lg:flex'
                : 'flex'
          }`}
        >
          <div className="shrink-0 border-b border-[var(--panel-border)] p-3">
            <div className="flex min-w-0 items-center gap-2">
              <Waves className="h-4 w-4 shrink-0 text-[var(--accent)]" />
              <p className="truncate text-sm font-semibold">
                {chrome.brandBg}
              </p>
            </div>
            <button
              type="button"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 py-2.5 text-xs font-semibold text-[var(--accent)] hover:brightness-105"
              onClick={() => {
                setTab('rooms')
                setCreateRoomOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Нова стая
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
            <div className="mt-3 grid grid-cols-3 gap-0.5 rounded-2xl bg-[var(--chip)]/80 p-1 ring-1 ring-[var(--panel-border)]/60 sm:grid-cols-5">
              {(
                [
                  ['feed', 'Начало'],
                  ['chats', 'Чатове'],
                  ['rooms', 'Стаи'],
                  ['subscribers', 'Абонати'],
                  ['blocked', 'Блок'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setTab(id)
                    setInboxFilter('all')
                    setThreadOpen(false)
                  }}
                  className={`rounded-xl px-1.5 py-1.5 text-[11px] font-semibold transition ${
                    tab === id
                      ? 'bg-[var(--panel)] text-[var(--foreground)] shadow-sm'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === 'chats' || tab === 'rooms' ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {(tab === 'chats'
                  ? ([
                      ['all', 'Всички'],
                      ['unread', 'Непрочетени'],
                      ['archived', 'Архив'],
                    ] as const)
                  : ([
                      ['all', 'Всички'],
                      ['live', 'Отворени'],
                      ['archived', 'Архив'],
                    ] as const)
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
            {tab === 'rooms' && !dragSubId ? (
              <button
                type="button"
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-[11px] font-semibold text-[var(--accent)] transition hover:brightness-105"
                onClick={() => setCreateRoomOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Нова стая
              </button>
            ) : null}
          </div>

          <div className="ov-scroll min-h-0 flex-1 p-2 pb-[max(5.5rem,env(safe-area-inset-bottom))] lg:pb-[max(2rem,env(safe-area-inset-bottom))]">
            {dragSubId ? (
              <div className="mb-2 rounded-xl border border-dashed border-[var(--accent)]/45 bg-[var(--accent-soft)] px-3 py-2 text-[11px] text-[var(--accent)]">
                Пусни абоната върху стая по-долу
              </div>
            ) : null}

            {(tab === 'chats' || tab === 'rooms') && !dragSubId && user ? (
              <div className="mb-2 space-y-2">
                <ProfilePageCard
                  displayName={user.displayName || user.fullName}
                  bio={prefs.profileSocial?.bio}
                  avatarDataUrl={user.avatarDataUrl}
                  planLabel={PLANS[user.plan]?.label || user.plan}
                  quotaLabel={planPageQuotaLabel(user)}
                  followerCount={myProfilePage?.followerIds?.length || 0}
                  slots={pageSlotSummary(user, prefs.conversations)}
                  onOpenOrCreatePage={(format) => {
                    const existing = prefs.conversations.find(
                      (c) =>
                        c.spaceFormat === format &&
                        c.adminUserId === user.id &&
                        !c.archived
                    )
                    if (existing) {
                      openThread(existing.id, 'rooms')
                      return
                    }
                    const gate = canCreateOwnedPage(
                      user,
                      prefs.conversations,
                      format
                    )
                    if (!gate.ok) {
                      showDragToast(gate.reason || 'Заключено')
                      return
                    }
                    const titles: Record<string, string> = {
                      page: `Страница · ${user.displayName || user.fullName}`,
                      business: `Бизнес · ${user.company || user.displayName}`,
                      podcast: `Подкаст · ${user.displayName || user.fullName}`,
                    }
                    const now = new Date().toISOString()
                    const conv: Conversation = {
                      id: `conv_${Date.now()}`,
                      title: titles[format] || titles.page,
                      isGroup: true,
                      space: 'room',
                      roomKind:
                        format === 'podcast'
                          ? 'studio'
                          : format === 'business'
                            ? 'meeting'
                            : 'general',
                      spaceFormat: format,
                      adminUserId: user.id,
                      followPolicy: defaultFollowPolicy(format),
                      allowCrossPlanFollow: true,
                      followerIds: [],
                      interestTags: [],
                      members: [],
                      lastMessage: 'Страницата е готова',
                      updatedAt: now,
                      unread: 0,
                      pinned: true,
                      muted: false,
                      messages: [
                        {
                          id: `msg_${Date.now()}`,
                          fromMe: true,
                          text: '👋 Това е твоята страница — видима за follow, стаите остават само за поканени.',
                          createdAt: now,
                          status: 'sent',
                        },
                      ],
                      saveChat: true,
                      disappearAfter: 'off',
                      sessionOpen: true,
                      activeGuestIds: [],
                      joinRequests: [],
                    }
                    updatePrefs((current) => ({
                      conversations: [conv, ...current.conversations],
                    }))
                    openThread(conv.id, 'rooms')
                    showDragToast(`Създадена: ${titles[format]}`)
                  }}
                  onCreateRoom={() => setCreateRoomOpen(true)}
                  onGoLive={undefined}
                />
                <DiscoverPagesPanel
                  conversations={prefs.conversations}
                  currentUserId={user.id}
                  onOpen={(id) => {
                    openSocialSpace(id)
                  }}
                  onToggleFollow={toggleFollowPage}
                />
              </div>
            ) : null}

            {tab === 'feed' && !dragSubId && user ? (
              <div className="mb-2 space-y-2">
                <div className="rounded-xl border border-dashed border-[var(--accent)]/35 bg-[var(--accent-soft)]/40 px-3 py-2 text-[11px] text-[var(--muted)]">
                  Facebook-стил: сторита горе · постове при скрол надолу. Follow
                  страници от „Открий“.
                </div>
                <ShareGrowPanel
                  variant="compact"
                  hostId={user.id}
                  hostName={user.displayName || user.fullName}
                  onToast={showDragToast}
                />
              </div>
            ) : null}

            {(tab === 'chats' || tab === 'rooms' || dragSubId) &&
              (conversations.length ? (
                conversations.map((conv) => {
                const drop = roomDropHandlers(conv.id)
                const isDrop = dropOverId === conv.id
                const isRoom = conversationSpace(conv) === 'room'
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => {
                      openThread(conv.id, isRoom ? 'rooms' : 'chats')
                      if (
                        conv.roomKind === 'meet' ||
                        isMeetConversationId(conv.id)
                      ) {
                        setMeetRoomOpen(true)
                      }
                    }}
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
                    className={`mb-0.5 flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition ${
                      isDrop
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)] ring-2 ring-[var(--accent)]'
                        : activeId === conv.id
                          ? 'bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/30'
                          : dragSubId
                            ? 'border border-dashed border-[var(--accent)]/35 hover:bg-[var(--accent-soft)]'
                            : 'hover:bg-[var(--chip)]'
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white ${
                        conv.roomKind === 'meet'
                          ? 'bg-gradient-to-br from-rose-400 to-sky-400'
                          : isRoom
                            ? 'bg-gradient-to-br from-sky-500 to-indigo-700'
                            : 'bg-gradient-to-br from-teal-400 to-emerald-700'
                      }`}
                    >
                      {conv.roomKind === 'meet' &&
                      conv.members[0]?.avatarDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={conv.members[0].avatarDataUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : isRoom ? (
                        <DoorOpen className="h-4 w-4" />
                      ) : (
                        conv.title.slice(0, 1)
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13px] font-semibold tracking-tight">
                          {conv.roomKind === 'meet' ? `✨ ${conv.title}` : conv.title}
                        </span>
                        <span className="flex items-center gap-1">
                          {conv.roomKind === 'meet' ? (
                            <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-rose-500">
                              мач
                            </span>
                          ) : null}
                          {isRoom && conv.sessionOpen !== false ? (
                            <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-500">
                              live
                            </span>
                          ) : null}
                          {conv.muted ? (
                            <BellOff className="h-3 w-3 text-[var(--muted)]" />
                          ) : null}
                          {conv.pinned ? (
                            <Pin className="h-3 w-3 text-[var(--accent)]" />
                          ) : null}
                        </span>
                      </span>
                      <span
                        className={`mt-0.5 block truncate text-[11px] ${
                          isDrop ? 'opacity-90' : 'text-[var(--muted)]'
                        }`}
                      >
                        {isDrop
                          ? 'Пусни тук, за да добавиш'
                          : dragSubId
                            ? `${conv.members.length} участници · пусни тук`
                            : isRoom
                              ? `${conv.members.length || 0} души · ${conv.lastMessage}`
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
              })
              ) : (
                <p className="px-3 py-8 text-center text-xs text-[var(--muted)]">
                  {tab === 'rooms'
                    ? 'Няма стаи — създай нова стая по-горе'
                    : 'Няма разговори — отвори чат от Абонати'}
                </p>
              ))}

            {tab === 'subscribers' ? (
              <>
              <FriendSearchPanel
                excludeIds={prefs.subscribers.map((s) => s.id)}
                onAdd={addFriendFromHit}
              />
              <form
                className="mb-3 space-y-2 rounded-2xl bg-[var(--chip)]/70 p-3 ring-1 ring-[var(--panel-border)]/80"
                onSubmit={(e) => {
                  e.preventDefault()
                  addSubscriberManual()
                }}
              >
                <p className="text-[10px] font-medium tracking-wide text-[var(--muted)]">
                  Нов контакт · безплатно
                </p>
                <input
                  className="ov-field !rounded-xl !border-0 !bg-[var(--panel)] !py-2 text-xs"
                  placeholder="Име"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                />
                <input
                  className="ov-field !rounded-xl !border-0 !bg-[var(--panel)] !py-2 text-xs"
                  placeholder="Имейл или телефон"
                  value={newSubContact}
                  onChange={(e) => setNewSubContact(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="submit"
                    disabled={!newSubName.trim()}
                    className="ov-btn-primary !rounded-xl !py-2 text-[11px] disabled:opacity-40"
                  >
                    Добави
                  </button>
                  <button
                    type="button"
                    className="ov-btn-ghost !rounded-xl !py-2 text-[11px]"
                    title="Копирай линк за регистрация в OmniVoice"
                    onClick={() =>
                      void invitePersonToApp(newSubName.trim() || undefined)
                    }
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Към app
                  </button>
                </div>
              </form>
              </>
            ) : null}

            {tab === 'subscribers' &&
              (subscribers.length ? (
                <ul className="space-y-0.5">
                  {subscribers.map((sub) => {
                    const presence = sub.presence || 'offline'
                    const dot =
                      presence === 'online' ||
                      presence === 'writing' ||
                      presence === 'speaking'
                        ? 'bg-emerald-400'
                        : presence === 'in_call' || presence === 'in_studio'
                          ? 'bg-sky-400'
                          : 'bg-zinc-400'
                    return (
                      <li
                        key={sub.id}
                        draggable
                        onDragStart={(e) => onSubscriberDragStart(sub.id, e)}
                        onDragEnd={onSubscriberDragEnd}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          setCtxMenu({
                            x: e.clientX,
                            y: e.clientY,
                            type: 'subscriber',
                            id: sub.id,
                          })
                        }}
                        className={`group relative flex items-center gap-2.5 rounded-2xl px-2.5 py-2 transition-colors duration-150 ${
                          dragSubId === sub.id
                            ? 'bg-[var(--accent-soft)] opacity-60'
                            : 'hover:bg-[var(--chip)]'
                        }`}
                      >
                        <button
                          type="button"
                          className="relative shrink-0"
                          title="Опции"
                          onClick={() => setFriendSheetId(sub.id)}
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-400/90 to-emerald-800 text-sm font-bold text-white shadow-sm">
                            {sub.name.slice(0, 1).toUpperCase()}
                          </span>
                          <span
                            className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--panel)] ${dot}`}
                          />
                        </button>

                        <button
                          type="button"
                          className="min-w-0 flex-1 pr-1 text-left transition-[padding] group-hover:pr-[8.5rem] max-sm:pr-1"
                          onClick={() => setFriendSheetId(sub.id)}
                        >
                          <p className="truncate text-[13px] font-semibold tracking-tight">
                            {sub.name}
                          </p>
                          <p className="truncate text-[11px] text-[var(--muted)]">
                            {presenceLabel(presence)}
                          </p>
                        </button>

                        {/* Hover actions — hidden until pointer is over the row */}
                        <div
                          className="pointer-events-none absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1 rounded-full bg-[var(--panel)]/95 p-1 opacity-0 shadow-lg ring-1 ring-[var(--panel-border)] backdrop-blur-md transition-all duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 max-sm:pointer-events-auto max-sm:static max-sm:translate-y-0 max-sm:opacity-100 max-sm:bg-transparent max-sm:p-0 max-sm:shadow-none max-sm:ring-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            title="Чат"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--foreground)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                            onClick={() => {
                              startConversationFromSubscriber(sub.id)
                              setTab('chats')
                            }}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Обаждане"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--foreground)] transition hover:bg-emerald-500/15 hover:text-emerald-500"
                            onClick={() => {
                              setOperatorCall({ name: sub.name })
                            }}
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Видео обаждане"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--foreground)] transition hover:bg-sky-500/15 hover:text-sky-500"
                            onClick={() => {
                              const started =
                                startConversationFromSubscriber(sub.id)
                              if (started) void enterLiveRoom(started.id, true)
                            }}
                          >
                            <Video className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Покани към приложението"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--foreground)] transition hover:bg-violet-500/15 hover:text-violet-500"
                            onClick={() => void invitePersonToApp(sub.name)}
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="px-3 py-6 text-center text-xs text-[var(--muted)]">
                  Няма абонати още — добави име по-горе
                </p>
              ))}

            {tab === 'blocked' &&
              (prefs.blocked.length ? (
                prefs.blocked.map((item) => (
                  <div
                    key={item.id}
                    className="mb-1 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm hover:bg-[var(--chip)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-[var(--muted)]">{item.reason}</p>
                    </div>
                    <button
                      type="button"
                      className="ov-btn-ghost !px-2.5 !py-1 text-[11px]"
                      onClick={() => {
                        updatePrefs({
                          blocked: prefs.blocked.filter((b) => b.id !== item.id),
                          subscribers: prefs.subscribers.map((s) =>
                            s.id === item.id
                              ? { ...s, status: 'active' as const }
                              : s
                          ),
                        })
                        showDragToast(`${item.name} е отблокиран/а`)
                      }}
                    >
                      Отблокирай
                    </button>
                  </div>
                ))
              ) : (
                <p className="px-3 py-6 text-center text-xs text-[var(--muted)]">
                  Няма блокирани абонати
                </p>
              ))}
          </div>
        </aside>
        )}

        <section
          className={`min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--panel)] ${
            tab === 'feed' || threadOpen ? 'flex h-full' : 'hidden'
          } ${
            dragSubId && active && dropOverId === active.id
              ? 'ring-2 ring-inset ring-[var(--accent)]'
              : ''
          }`}
          {...(active && tab !== 'feed' && threadOpen
            ? roomDropHandlers(active.id)
            : {})}
        >
          {tab === 'feed' && user ? (
            socialView &&
            prefs.conversations.find((c) => c.id === socialView.id) ? (
              <div className="flex h-full min-h-0 w-full flex-col lg:flex-row">
                <SocialSpaceViewer
                  className="min-h-0 flex-1"
                  space={
                    prefs.conversations.find((c) => c.id === socialView.id)!
                  }
                  userId={user.id}
                  userName={user.displayName || user.fullName}
                  focusPostId={socialView.postId}
                  readerLang={user.nativeLanguage || 'bg'}
                  plan={user.plan}
                  bonusChars={prefs.translateBonusChars || 0}
                  onBack={() => setSocialView(null)}
                  onToggleFollowOrJoin={() =>
                    toggleFollowPage(socialView.id)
                  }
                  onAcceptRequest={(requestId) =>
                    acceptSpaceRequest(socialView.id, requestId)
                  }
                  onOpenChat={() => {
                    setSocialView(null)
                    openThread(socialView.id, 'chats')
                  }}
                  onStartVoice={() => {
                    setSocialView(null)
                    void enterLiveRoom(socialView.id, false)
                  }}
                  onStartVideo={() => {
                    setSocialView(null)
                    void enterLiveRoom(socialView.id, true)
                  }}
                  onGoLive={(cover) => {
                    if (cover) {
                      updatePrefs((current) => ({
                        room: {
                          ...current.room,
                          cutoutMode: 'contour',
                          virtualBackground: true,
                          backgroundImageDataUrl: cover,
                        },
                      }))
                    }
                    void enterLiveRoom(socialView.id, true)
                  }}
                />
                <div className="ov-scroll hidden w-[280px] shrink-0 flex-col border-l border-[var(--panel-border)] lg:flex">
                  <FeedRightRail
                    className="min-h-0 flex-1 border-l-0"
                    userId={user.id}
                    friends={prefs.subscribers}
                    conversations={prefs.conversations}
                    onOpenFriend={(id) => {
                      setFriendshipId(id)
                      setSocialView(null)
                      setTab('chats')
                      setThreadOpen(false)
                    }}
                    onOpenPage={(id) => openSocialSpace(id)}
                    onOpenGroup={(id) => openSocialSpace(id)}
                    onOpenGames={() => undefined}
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-0 w-full flex-col lg:flex-row">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  <div className="shrink-0 border-b border-[var(--panel-border)] px-2 pt-2">
                    <ReportIssueNotice onOpenHelp={() => setHelpOpen(true)} />
                  </div>
                  {user.plan === 'business' || user.plan === 'podcast' ? (
                    <div className="shrink-0 border-b border-[var(--panel-border)] p-2 lg:hidden">
                      <PlanGrowthCoach
                        userId={user.id}
                        plan={user.plan}
                        aiPodcast={
                          prefs.experience.aiPodcastAssistant !== false
                        }
                        aiBusiness={
                          prefs.experience.aiBusinessCoach !== false
                        }
                        aiCulture={
                          prefs.experience.aiCultureAdvisor !== false
                        }
                        podcastTopic={prefs.experience.podcastTopic || ''}
                        onPodcastTopic={(t) =>
                          updatePrefs((c) => ({
                            experience: { ...c.experience, podcastTopic: t },
                          }))
                        }
                        partnerCountry={
                          prefs.experience.partnerCountry || 'bg'
                        }
                        onPartnerCountry={(code) =>
                          updatePrefs((c) => ({
                            experience: {
                              ...c.experience,
                              partnerCountry: code,
                            },
                          }))
                        }
                      />
                    </div>
                  ) : null}
                <HomeFeed
                  className="h-full min-h-0 min-w-0 flex-1"
                  userId={user.id}
                  displayName={user.displayName || user.fullName}
                  avatarUrl={user.avatarDataUrl}
                  myStories={myStories}
                  friends={prefs.subscribers}
                  conversations={prefs.conversations}
                  plan={user.plan}
                  readerLang={user.nativeLanguage || 'bg'}
                  billingUserId={user.id}
                  bonusChars={prefs.translateBonusChars || 0}
                  onOpenStoryComposer={() => setProfileOpen(true)}
                  onOpenPage={(id) => openSocialSpace(id)}
                  onOpenSpace={(id, postId) => openSocialSpace(id, postId)}
                  onOpenFriend={(id) => {
                    setFriendshipId(id)
                    setTab('chats')
                    setThreadOpen(false)
                  }}
                  onCompose={(kind) => {
                    if (kind === 'live') {
                      const page = myProfilePage
                      if (page) {
                        openSocialSpace(page.id)
                        void enterLiveRoom(page.id, true)
                      } else {
                        showDragToast('Създай профилна страница първо')
                      }
                      return
                    }
                    if (kind === 'checkin') {
                      showDragToast('Място: отвори профил и добави локация')
                      setMapOpen(true)
                      return
                    }
                    if (kind === 'event' || kind === 'poll') {
                      showDragToast(
                        kind === 'event'
                          ? 'Събитие: създай пост с дата в страницата'
                          : 'Анкета: ползвай poll в чат или пост'
                      )
                    }
                    setProfileOpen(true)
                  }}
                />
                </div>
                <div className="ov-scroll hidden w-[300px] shrink-0 flex-col gap-2 border-l border-[var(--panel-border)] p-2 lg:flex">
                  {user.plan === 'business' || user.plan === 'podcast' ? (
                    <PlanGrowthCoach
                      userId={user.id}
                      plan={user.plan}
                      aiPodcast={prefs.experience.aiPodcastAssistant !== false}
                      aiBusiness={prefs.experience.aiBusinessCoach !== false}
                      aiCulture={prefs.experience.aiCultureAdvisor !== false}
                      podcastTopic={prefs.experience.podcastTopic || ''}
                      onPodcastTopic={(t) =>
                        updatePrefs((c) => ({
                          experience: { ...c.experience, podcastTopic: t },
                        }))
                      }
                      partnerCountry={
                        prefs.experience.partnerCountry || 'bg'
                      }
                      onPartnerCountry={(code) =>
                        updatePrefs((c) => ({
                          experience: {
                            ...c.experience,
                            partnerCountry: code,
                          },
                        }))
                      }
                    />
                  ) : null}
                  <FeatureSuggestionsBanner plan={user.plan} />
                  <FeedRightRail
                    className="min-h-0 flex-1 border-l-0"
                    userId={user.id}
                    friends={prefs.subscribers}
                    conversations={prefs.conversations}
                    onOpenFriend={(id) => {
                      setFriendshipId(id)
                      setTab('chats')
                      setThreadOpen(false)
                    }}
                    onOpenPage={(id) => openSocialSpace(id)}
                    onOpenGroup={(id) => openSocialSpace(id)}
                    onOpenGames={() => undefined}
                  />
                </div>
                <button
                  type="button"
                  className="fixed bottom-[4.75rem] right-3 z-[65] inline-flex items-center gap-1.5 rounded-full bg-[var(--panel)] px-3 py-2 text-[11px] font-semibold shadow-lg ring-1 ring-[var(--panel-border)] lg:hidden"
                  onClick={() => setContactsOpen(true)}
                >
                  <Users className="h-3.5 w-3.5" />
                  Контакти
                </button>
              </div>
            )
          ) : null}

          {contactsOpen && user && tab === 'feed' ? (
            <div
              className="fixed inset-0 z-[90] bg-black/45 lg:hidden"
              onClick={() => setContactsOpen(false)}
              role="presentation"
            >
              <div
                className="absolute inset-y-0 right-0 flex w-[min(100vw,20rem)] flex-col bg-[var(--panel)] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-3 py-2.5">
                  <p className="text-xs font-semibold">Контакти</p>
                  <button
                    type="button"
                    className="text-[11px] text-[var(--muted)]"
                    onClick={() => setContactsOpen(false)}
                  >
                    Затвори
                  </button>
                </div>
                <FeedRightRail
                  className="min-h-0 flex-1 border-l-0"
                  userId={user.id}
                  friends={prefs.subscribers}
                  conversations={prefs.conversations}
                  onOpenFriend={(id) => {
                    setContactsOpen(false)
                    setFriendshipId(id)
                    setTab('chats')
                    setThreadOpen(false)
                  }}
                  onOpenPage={(id) => {
                    setContactsOpen(false)
                    openSocialSpace(id)
                  }}
                  onOpenGroup={(id) => {
                    setContactsOpen(false)
                    openSocialSpace(id)
                  }}
                  onOpenGames={() => undefined}
                />
              </div>
            </div>
          ) : null}
          {tab !== 'feed' && threadOpen && workspace === 'business' ? (
            <>
            <BusinessToolRail
              voiceBridgeOn={voiceBridgeOn}
              onToggleVoiceBridge={() => setVoiceBridgeOn((v) => !v)}
              salesAssistOn={salesAssistOn}
              onToggleSalesAssist={() => setSalesAssistOn((v) => !v)}
              prompt={salesPrompt}
              sentiment={0.62 + (crmTick % 5) * 0.05}
              battleCards={battleCards}
              onOpenRecap={() => openBusinessIntelPicker()}
              crmSalesforce={crmStatus.salesforce}
              crmHubspot={crmStatus.hubspot}
              onInviteGuest={() => void createInvite()}
              inviteCopied={inviteCopied}
            />
            {prefs.experience.aiBusinessCoach !== false ||
            prefs.experience.aiCultureAdvisor !== false ? (
              <div className="ov-scroll max-h-48 shrink-0 border-b border-[var(--panel-border)] px-3 py-2">
                <BusinessAiCoachPanel
                  enabled={prefs.experience.aiBusinessCoach !== false}
                  cultureEnabled={
                    prefs.experience.aiCultureAdvisor !== false
                  }
                  partnerCountry={prefs.experience.partnerCountry || 'bg'}
                  onCountryChange={(code) =>
                    updatePrefs((c) => ({
                      experience: { ...c.experience, partnerCountry: code },
                    }))
                  }
                  contextHint={active?.title}
                />
              </div>
            ) : null}
            </>
          ) : null}
          {tab !== 'feed' && threadOpen && workspace === 'podcast' ? (
            <PodcastToolRail
              showTitle={active?.title || 'Untitled show'}
              connectedPlatforms={connectedStreamPlatforms}
              multistream={Boolean(prefs.podcast?.multistream)}
              obsLive={obsLive}
              onToggleObs={() => {
                setObsLive((v) => !v)
                showDragToast(obsLive ? 'OBS standby' : 'OBS output ON')
              }}
              shortQueued={shortQueued}
              onCaptureShort={() => {
                setShortQueued(true)
                showDragToast(
                  voiceBridgeOn
                    ? '9:16 short + VoiceBridge субтитри'
                    : '9:16 short queued'
                )
                window.setTimeout(() => setShortQueued(false), 4000)
              }}
              voiceBridgeOn={voiceBridgeOn}
              onToggleVoiceBridge={() => setVoiceBridgeOn((v) => !v)}
              resolution={prefs.podcast?.resolution || '1080p'}
              layout={prefs.podcast?.layout || 'grid'}
              onInviteGuest={() => void createInvite()}
              inviteCopied={inviteCopied}
              sessionMode={prefs.podcast?.sessionMode || 'podcast'}
              streamScene={prefs.podcast?.streaming?.scene}
              onSessionModeChange={(mode) =>
                updatePrefs((current) => ({
                  podcast: { ...current.podcast, sessionMode: mode },
                }))
              }
              onOpenStreamSettings={() => {
                setSettingsScope('full')
                setSettingsTab('podcast')
                setSettingsOpen(true)
              }}
            />
          ) : null}
          {tab !== 'feed' && threadOpen && active ? (
            <>
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--panel-border)] px-3 py-2.5 sm:px-4 sm:py-3">
                <button
                  type="button"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-[var(--chip)]"
                  onClick={closeThread}
                  title="Назад"
                  aria-label="Назад към списъка"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="min-w-0 flex-1 overflow-hidden text-left"
                  onClick={() =>
                    setFriendshipId(active.members[0]?.id || active.id)
                  }
                  title="Friendship Profile"
                >
                  <p className="truncate text-sm font-semibold">{active.title}</p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {dragSubId
                      ? 'Пусни абоната тук'
                      : active.roomKind === 'meet'
                        ? 'Стая за мач · на леки сърца'
                        : conversationSpace(active) === 'room'
                          ? `Стая · ${active.members.length} участници`
                          : `Разговор · ${presenceLabel(active.members[0]?.presence || 'online')}`}
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  {active.roomKind === 'meet' ? (
                    <button
                      type="button"
                      className="ov-btn-primary !px-2.5 !py-1.5 !text-[11px]"
                      onClick={() => setMeetRoomOpen(true)}
                      title="Отвори стаята за мач"
                    >
                      ✨ Мач
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="ov-btn-primary !hidden !px-2.5 !py-1.5 !text-[11px] sm:!inline-flex"
                    onClick={() => void createInvite()}
                    title="Покани guest"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    {inviteCopied ? 'OK' : 'Guest'}
                  </button>
                  <button
                    type="button"
                    className="ov-icon-btn"
                    title="Гласово в стая"
                    onClick={() => {
                      void enterLiveRoom(active.id, false)
                    }}
                  >
                    <Phone className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="ov-icon-btn"
                    title="Видео стая"
                    onClick={() => {
                      void enterLiveRoom(active.id, true)
                    }}
                  >
                    <Video className="h-4 w-4" />
                  </button>
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

              {active.spaceFormat ? (
                <SpaceAdminBar
                  format={active.spaceFormat}
                  isAdmin={canManageSpace(
                    { adminUserId: active.adminUserId || '' },
                    user.id
                  )}
                  members={active.members.map((m) => ({
                    id: m.id,
                    name: m.name,
                  }))}
                  interestTags={active.interestTags}
                  onTransferAdmin={(toId) => {
                    const who = active.members.find((m) => m.id === toId)
                    patchConversation(active.id, { adminUserId: toId })
                    showDragToast(
                      who
                        ? `Админ правата са предадени на ${who.name}`
                        : 'Админ правата са предадени'
                    )
                  }}
                />
              ) : null}

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
                  className="ov-btn-primary !px-3 !py-1 text-[11px]"
                  onClick={() => void createInvite()}
                >
                  <Link2 className="h-3 w-3" />
                  {inviteCopied ? 'Линк копиран' : 'Покани guest'}
                </button>
                <button
                  type="button"
                  className="ov-btn-primary !px-3 !py-1 text-[11px]"
                  onClick={() => void enterLiveRoom(active.id, false)}
                >
                  Влез в стаята
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="ov-scroll-x shrink-0 flex gap-2 border-b border-[var(--panel-border)] px-4 py-2">
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
                    onClick={() => setStoryViewerId(story.id)}
                    title="Гледай story"
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
                <button
                  type="button"
                  className="flex shrink-0 flex-col items-center gap-1"
                  onClick={() => {
                    if (workspace === 'podcast') {
                      setLiveGoOpen(true)
                      return
                    }
                    void toggleLiveOnAir()
                  }}
                  title={
                    liveOnAir
                      ? 'Спри ON AIR'
                      : 'Стартирай Live · YouTube / RTMP'
                  }
                >
                  <span
                    className={`relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-500 text-xs font-bold text-white ${
                      liveOnAir
                        ? 'ring-2 ring-rose-400 ring-offset-2 ring-offset-[var(--background)]'
                        : ''
                    }`}
                  >
                    L
                    {liveOnAir ? (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-rose-500 px-1 text-[8px] font-bold">
                        LIVE
                      </span>
                    ) : null}
                  </span>
                  <span className="text-[10px] text-[var(--muted)]">
                    {liveOnAir ? 'ON AIR' : 'Live'}
                  </span>
                </button>
                {workspace === 'business' || admin ? (
                  <button
                    type="button"
                    className="flex shrink-0 flex-col items-center gap-1"
                    onClick={() => setDealComposerOpen(true)}
                    title="Добави CRM сделка в чата"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 text-xs font-bold text-white">
                      D
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">CRM</span>
                  </button>
                ) : null}
                {workspace === 'podcast' ? (
                  <button
                    type="button"
                    className="flex shrink-0 flex-col items-center gap-1"
                    onClick={() => {
                      setShortQueued(true)
                      showDragToast('Clip marker · 9:16 short')
                      window.setTimeout(() => setShortQueued(false), 2500)
                    }}
                    title="Маркирай момент за short"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 text-xs font-bold text-white">
                      S
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">Short</span>
                  </button>
                ) : null}
              </div>

              {active.spaceFormat &&
              active.spaceFormat !== 'group' ? (
                <PageWall
                  convId={active.id}
                  currentUserId={user.id}
                  currentUserName={user.displayName || user.fullName}
                  writerLang={user.nativeLanguage || 'bg'}
                  readerLang={user.nativeLanguage || 'bg'}
                  plan={user.plan}
                  bonusChars={prefs.translateBonusChars || 0}
                  canFollow={
                    active.adminUserId !== user.id &&
                    (active.allowCrossPlanFollow !== false ||
                      active.followPolicy === 'public')
                  }
                  isFollowing={(active.followerIds || []).includes(user.id)}
                  onToggleFollow={() => toggleFollowPage(active.id)}
                  onGoLive={(cover) => {
                    updatePrefs((current) => ({
                      room: {
                        ...current.room,
                        cutoutMode: 'contour',
                        virtualBackground: true,
                        customBackground: cover,
                      },
                    }))
                    showDragToast(
                      cover
                        ? 'Page → Live · cover като фон + cutout'
                        : 'Page → Live · влизаш в стаята'
                    )
                    router.push(`/room/${active.id}?video=1`)
                  }}
                />
              ) : null}

              <div className="ov-scroll min-h-0 flex-1 space-y-3 px-4 py-4 pb-6">
                {active.messages
                  .filter((msg) => {
                    if (active.disappearAfter === 'off' || active.saveChat) {
                      return true
                    }
                    const age = Date.now() - new Date(msg.createdAt).getTime()
                    const limit =
                      active.disappearAfter === '1h'
                        ? 3600_000
                        : active.disappearAfter === '24h'
                          ? 86_400_000
                          : 7 * 86_400_000
                    return age < limit
                  })
                  .map((msg) => (
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
              </div>


              <footer className="shrink-0 border-t border-[var(--panel-border)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {prefs.chat.allowRecording !== false ? (
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        recording
                          ? 'bg-rose-500 text-white'
                          : 'bg-[var(--chip)] text-[var(--muted)]'
                      }`}
                      onClick={() => {
                        bumpFeatureUse('recording')
                        setRecording((v) => !v)
                        showDragToast(
                          recording
                            ? 'Записът е спрян (локален маркер)'
                            : 'Записът е пуснат · всички планове'
                        )
                        if (!recording) {
                          appendMessage({
                            text: '⏺ Записът на разговора започна',
                          })
                        } else {
                          appendMessage({
                            text: '⏹ Записът е спрян',
                          })
                        }
                      }}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          recording ? 'animate-pulse bg-white' : 'bg-rose-500'
                        }`}
                      />
                      {recording ? 'Записва…' : 'Запис'}
                    </button>
                  </div>
                ) : null}
                <ChatComposer
                  draft={draft}
                  onDraftChange={setDraft}
                  enterToSend={prefs.chat.enterToSend}
                  peerLanguage={active.members[0]?.language || user?.nativeLanguage || 'bg'}
                  replyPreview={replyPreview}
                  onClearReply={() => setReplyPreview(null)}
                  showDeal={workspace === 'business' || admin}
                  showClip={workspace === 'podcast' || admin}
                  allowVoice={prefs.chat.voiceMessages !== false}
                  onSend={(partial) => appendMessage(partial)}
                />
              </footer>
            </>
          ) : tab !== 'feed' ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <MessageCircle className="h-8 w-8 text-[var(--accent)]" />
              <p className="mt-3 text-sm font-semibold">
                {tab === 'chats' ? 'Избери чат' : 'Избери страница или стая'}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {dragSubId
                  ? 'Пусни абоната върху стая вляво'
                  : 'Кликни върху елемент вляво — отваря се чак след избор'}
              </p>
              {tab === 'rooms' ? (
                <button
                  type="button"
                  className="ov-btn-primary mt-4 !px-4 !py-2 text-xs"
                  onClick={() => setCreateRoomOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Създай стая
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      {!threadOpen && !profileOpen && !settingsOpen && !appearanceOpen ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-[70] flex border-t border-[var(--panel-border)] bg-[var(--panel)]/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-xl lg:hidden"
          aria-label="Навигация"
        >
          {(
            [
              ['feed', 'Начало', Newspaper],
              ['chats', 'Чатове', MessageCircle],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id)
                setInboxFilter('all')
                setThreadOpen(false)
                setProfileOpen(false)
                setSettingsOpen(false)
                if (id === 'feed') setSocialView(null)
              }}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold ${
                tab === id
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--muted)]'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </nav>
      ) : null}

      {prefs.music?.enabled &&
      prefs.music?.source === 'spotify' &&
      parseSpotifyUrl(prefs.music.spotifyUrl || '') ? (
        <div className="fixed bottom-3 right-3 z-[85] w-[min(calc(100vw-1.5rem),22rem)] overflow-hidden rounded-2xl border border-[#1DB954]/35 bg-black/90 shadow-2xl">
          <div className="flex items-center justify-between gap-2 px-3 py-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#1DB954]">
              Spotify
            </span>
            <button
              type="button"
              className="text-[10px] text-white/60 hover:text-white"
              onClick={() =>
                updatePrefs((c) => ({
                  music: { ...c.music, enabled: false },
                }))
              }
            >
              Спри
            </button>
          </div>
          <iframe
            title="Spotify"
            src={parseSpotifyUrl(prefs.music.spotifyUrl)!.embedUrl}
            width="100%"
            height="80"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="block w-full"
          />
        </div>
      ) : null}

      <InstallAppButton variant="banner" />

      {dragToast ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-[var(--foreground)] px-4 py-2 text-xs font-semibold text-[var(--background)] shadow-lg">
          {dragToast}
        </div>
      ) : null}

      {dealComposerOpen ? (
        <div className="fixed inset-0 z-[88] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="ov-panel w-full max-w-md rounded-3xl p-5">
            <p className="text-sm font-semibold">CRM · нова сделка</p>
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              Добавя се като deal карта в текущия чат
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-xs">
                <span className="mb-1 block text-[var(--muted)]">Заглавие</span>
                <input
                  className="ov-field"
                  value={dealDraft.title}
                  onChange={(e) =>
                    setDealDraft((d) => ({ ...d, title: e.target.value }))
                  }
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block text-[var(--muted)]">Стойност</span>
                <input
                  className="ov-field"
                  value={dealDraft.value}
                  onChange={(e) =>
                    setDealDraft((d) => ({ ...d, value: e.target.value }))
                  }
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block text-[var(--muted)]">Етап</span>
                <select
                  className="ov-field"
                  value={dealDraft.stage}
                  onChange={(e) =>
                    setDealDraft((d) => ({ ...d, stage: e.target.value }))
                  }
                >
                  <option value="Discovery">Discovery</option>
                  <option value="Proposal">Proposal</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                </select>
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="ov-btn-ghost flex-1 justify-center"
                onClick={() => setDealComposerOpen(false)}
              >
                Отказ
              </button>
              <button
                type="button"
                className="ov-btn-primary flex-1 justify-center"
                onClick={submitDealFromStory}
              >
                Добави в чата
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {storyViewerId
        ? (() => {
            const story = myStories.find((s) => s.id === storyViewerId)
            if (!story) return null
            return (
              <div
                className="fixed inset-0 z-[89] flex items-center justify-center bg-black/80 px-4"
                onClick={() => setStoryViewerId(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setStoryViewerId(null)
                }}
                role="button"
                tabIndex={0}
              >
                <div
                  className="w-full max-w-sm overflow-hidden rounded-3xl bg-[#111] shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-4 py-3 text-white">
                    <p className="text-sm font-semibold">{user.displayName}</p>
                    <button
                      type="button"
                      className="text-xs text-white/70"
                      onClick={() => setStoryViewerId(null)}
                    >
                      Затвори
                    </button>
                  </div>
                  <div className="flex min-h-[420px] items-center justify-center bg-gradient-to-br from-indigo-600 to-fuchsia-700 p-6">
                    {story.type === 'image' && story.imageDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={story.imageDataUrl}
                        alt=""
                        className="max-h-[380px] w-full rounded-xl object-contain"
                      />
                    ) : (
                      <p className="text-center text-lg font-semibold text-white">
                        {story.text || 'Story'}
                      </p>
                    )}
                  </div>
                  <p className="px-4 py-3 text-[11px] text-white/60">
                    Изтича{' '}
                    {new Date(story.expiresAt).toLocaleString('bg-BG', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: 'short',
                    })}
                  </p>
                </div>
              </div>
            )
          })()
        : null}

      <CreateRoomWizard
        open={createRoomOpen}
        userPlan={user.plan}
        isAdmin={admin}
        customRooms={prefs.room.customStudioRooms || EMPTY_CUSTOM_ROOMS}
        aiRooms={prefs.aiRooms}
        onSaveAiRoom={saveAiRoom}
        defaultLanguage={user.nativeLanguage || 'bg'}
        busy={creatingRoom}
        onClose={() => setCreateRoomOpen(false)}
        onCreate={(draft) => void createRoomFromDraft(draft)}
        allowedPageFormats={allowedPageFormatsForUser(user)}
        ownedPageFormats={prefs.conversations
          .filter(
            (c) =>
              c.adminUserId === user.id &&
              (c.spaceFormat === 'page' ||
                c.spaceFormat === 'business' ||
                c.spaceFormat === 'podcast')
          )
          .map((c) => c.spaceFormat!)
        }
      />
      <AppearancePanel
        open={appearanceOpen}
        appearance={appearance}
        onClose={() => setAppearanceOpen(false)}
        onChange={setAppearance}
      />
      <SettingsPanel
        open={settingsOpen}
        initialTab={settingsTab}
        scope={settingsScope}
        onClose={() => setSettingsOpen(false)}
        onOpenRegister={() => router.push('/register')}
      />
      <ContactImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      <LiveGoPanel
        open={liveGoOpen}
        onClose={() => setLiveGoOpen(false)}
        platforms={prefs.podcast.platforms}
        liveOnAir={liveOnAir}
        quotaLabel={user ? formatLiveQuotaLabel(user.plan) : undefined}
        onToggleLive={() => {
          void toggleLiveOnAir()
        }}
        onOpenSettings={() => {
          setLiveGoOpen(false)
          setSettingsScope('full')
          setSettingsTab('platforms')
          setSettingsOpen(true)
        }}
      />
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
        onOpenSettings={() => {
          // Keep profile under settings — closing settings returns to profile
          setSettingsScope('full')
          setSettingsTab('account')
          setSettingsOpen(true)
        }}
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

      <MeetMatchModal
        open={meetMatchOpen}
        state={prefs.meetMatch || DEFAULT_MEET_MATCH}
        defaultName={user.displayName || user.fullName}
        onClose={() => setMeetMatchOpen(false)}
        onSaveProfile={(profile: MeetMatchProfile) =>
          patchMeetMatch({ profile })
        }
        onPass={(id) =>
          patchMeetMatch((s) => ({
            ...s,
            passedIds: [...s.passedIds, id],
          }))
        }
        onLike={handleMeetLike}
      />

      <MeetMatchRoom
        open={meetRoomOpen}
        conversation={
          prefs.conversations.find(
            (c) =>
              c.id === activeId &&
              (c.roomKind === 'meet' || isMeetConversationId(c.id))
          ) || null
        }
        myName={user.displayName || user.fullName}
        myLanguage={user.nativeLanguage || 'bg'}
        meetState={prefs.meetMatch || DEFAULT_MEET_MATCH}
        peerPhoto={
          prefs.conversations.find((c) => c.id === activeId)?.members[0]
            ?.avatarDataUrl
        }
        onClose={() => setMeetRoomOpen(false)}
        onSend={(partial, conversationId) =>
          appendMessage(partial, conversationId)
        }
        onAfterSend={handleMeetRoomSend}
        onPatchRoom={handleMeetPatchRoom}
        onUnmatch={handleMeetUnmatch}
        onReport={handleMeetReport}
        onToast={showDragToast}
        onVoiceCall={() => {
          if (activeId) void enterLiveRoom(activeId, false)
        }}
        onVideoCall={() => {
          if (activeId) void enterLiveRoom(activeId, true)
        }}
      />

      <WorldPresenceMap
        open={mapOpen}
        nodes={mapNodes.map((n) => ({
          ...n,
          geo:
            n.isMe && prefs.profileSocial?.geoShare?.enabled
              ? prefs.profileSocial.geoShare.last || null
              : null,
        }))}
        contacts={prefs.subscribers
          .filter((s) => s.status !== 'blocked')
          .map((s) => ({
            id: s.id,
            name: s.name,
            presence: s.presence,
            avatarUrl: s.avatarDataUrl,
          }))}
        circleIds={findMyCircleIds}
        gpsEnabled={Boolean(prefs.profileSocial?.geoShare?.enabled)}
        myGeo={
          prefs.profileSocial?.geoShare?.enabled
            ? prefs.profileSocial.geoShare.last || null
            : null
        }
        onClose={() => setMapOpen(false)}
        onSelect={(nodeId) => {
          setMapOpen(false)
          if (nodeId === 'me') {
            setProfileOpen(true)
            return
          }
          setFriendshipId(nodeId)
        }}
        onToggleCircle={(contactId) =>
          updatePrefs((current) => {
            const ids = current.profileSocial.geoShare?.circleIds || []
            const next = ids.includes(contactId)
              ? ids.filter((id) => id !== contactId)
              : [...ids, contactId]
            return {
              profileSocial: {
                ...current.profileSocial,
                geoShare: {
                  ...current.profileSocial.geoShare,
                  circleIds: next,
                },
              },
            }
          })
        }
        onEnableGps={() =>
          updatePrefs((current) => ({
            profileSocial: {
              ...current.profileSocial,
              geoShare: {
                ...current.profileSocial.geoShare,
                enabled: true,
                precision: 'precise',
                circleIds: current.profileSocial.geoShare?.circleIds || [],
              },
              showOnMap: true,
            },
          }))
        }
        onDisableGps={() =>
          updatePrefs((current) => ({
            profileSocial: {
              ...current.profileSocial,
              geoShare: {
                ...current.profileSocial.geoShare,
                enabled: false,
                last: null,
                circleIds: current.profileSocial.geoShare?.circleIds || [],
              },
            },
          }))
        }
        onRefreshGps={(point) =>
          updatePrefs((current) => ({
            profileSocial: {
              ...current.profileSocial,
              geoShare: {
                ...current.profileSocial.geoShare,
                enabled: true,
                last: point,
                circleIds: current.profileSocial.geoShare?.circleIds || [],
              },
              locationLabel: `${point.lat.toFixed(3)}°, ${point.lng.toFixed(3)}°`,
            },
          }))
        }
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

      {friendSheetId ? (
        <FriendActionSheet
          open
          name={
            prefs.subscribers.find((s) => s.id === friendSheetId)?.name ||
            'Приятел'
          }
          onClose={() => setFriendSheetId(null)}
          onCall={() => {
            const sub = prefs.subscribers.find((s) => s.id === friendSheetId)
            if (sub) setOperatorCall({ name: sub.name })
          }}
          onChat={() => {
            startConversationFromSubscriber(friendSheetId)
            setTab('chats')
          }}
          onProfile={() => {
            setFriendshipId(friendSheetId)
          }}
          onInviteGroup={() => {
            startConversationFromSubscriber(friendSheetId)
            setTab('rooms')
            setDragSubId(friendSheetId)
            showDragToast('Избери група/стая вляво или пусни абоната върху стая')
          }}
          onBlock={() => {
            const sub = prefs.subscribers.find((s) => s.id === friendSheetId)
            if (!sub) return
            updatePrefs((current) => ({
              blocked: [
                {
                  id: sub.id,
                  name: sub.name,
                  reason: 'Ръчно',
                  blockedAt: new Date().toISOString(),
                },
                ...current.blocked.filter((b) => b.id !== sub.id),
              ],
              subscribers: current.subscribers.map((s) =>
                s.id === sub.id ? { ...s, status: 'blocked' as const } : s
              ),
            }))
            showDragToast(`${sub.name} е блокиран/а`)
          }}
          onDelete={() => {
            updatePrefs((current) => ({
              subscribers: current.subscribers.filter(
                (s) => s.id !== friendSheetId
              ),
            }))
            showDragToast('Премахнат от приятели')
          }}
        />
      ) : null}

      <OperatorVoiceCall
        open={Boolean(operatorCall)}
        name={operatorCall?.name || ''}
        onHangup={() => setOperatorCall(null)}
        onJoinFullRoom={() => {
          const sub = prefs.subscribers.find(
            (s) => s.name === operatorCall?.name
          )
          const started = sub
            ? startConversationFromSubscriber(sub.id)
            : undefined
          setOperatorCall(null)
          if (started) void enterLiveRoom(started.id, false)
        }}
      />

      <HelpReportModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        isAdmin={admin}
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
            else openThread(friendshipTarget.id, 'chats')
            setFriendshipId(null)
          }}
          onCall={() => {
            setFriendshipId(null)
            setOperatorCall({ name: friendshipTarget.name })
          }}
          onVideo={() => {
            const sub = prefs.subscribers.find(
              (s) => s.id === friendshipTarget.id
            )
            const started = sub
              ? startConversationFromSubscriber(sub.id)
              : undefined
            const conv =
              started ||
              prefs.conversations.find(
                (c) =>
                  c.id === friendshipTarget.id ||
                  (!c.isGroup && c.title === friendshipTarget.name)
              ) ||
              active
            if (conv) void enterLiveRoom(conv.id, true)
            setFriendshipId(null)
          }}
          onNoteChange={(note) =>
            updatePrefs((current) => ({
              snapPlus: bumpFriendship(
                current.snapPlus,
                friendshipTarget.id,
                { note }
              ),
            }))
          }
        />
      ) : null}

      {inviteShare ? (
        <InviteShareSheet
          url={inviteShare.url}
          label={inviteShare.label}
          onClose={() => setInviteShare(null)}
          onEnterRoom={
            inviteShare.roomId
              ? () => {
                  const id = inviteShare.roomId
                  if (id) void enterLiveRoom(id, true)
                }
              : undefined
          }
        />
      ) : null}

      <CallRecap
        open={recapOpen && workspace === 'business'}
        data={intelData}
        loading={intelLoading}
        error={intelError}
        selecting={intelSelecting}
        selectedOptions={intelOptions}
        onSelectedOptionsChange={setIntelOptions}
        onClose={() => {
          setRecapOpen(false)
          setIntelSelecting(true)
        }}
        onGenerate={(opts) => void runDashboardIntel(opts)}
        onChangeOptions={() => {
          setIntelSelecting(true)
          setIntelData(null)
          setIntelError(null)
        }}
        onCopy={() => {
          if (!intelData) return
          void navigator.clipboard.writeText(
            formatIntelForClipboard(intelData, intelOptions)
          )
          showDragToast('Intel копиран')
        }}
        onCopyAgreement={() => {
          if (!intelData) return
          void navigator.clipboard.writeText(
            formatAgreementForClipboard(intelData)
          )
          showDragToast('Устен договор копиран')
        }}
        onCopyContract={() => {
          if (!intelData) return
          void navigator.clipboard.writeText(
            formatWrittenContractForClipboard(intelData)
          )
          showDragToast('Писмен договор копиран')
        }}
        onSave={() => {
          if (!intelData || !active) return
          const summaryLine = `🧠 AI Intel: ${intelData.title} — ${(intelData.summary || intelData.writtenContract || '').slice(0, 120)}`
          appendMessage({
            text: summaryLine,
            kind: 'intel',
            intelSummary: intelData.summary || intelData.writtenContract,
          })
          updatePrefs((current) => ({
            snapPlus: {
              ...current.snapPlus,
              memories: [
                {
                  id: `mem_intel_${Date.now()}`,
                  kind: 'intel' as const,
                  title: intelData.title,
                  body: formatIntelForClipboard(intelData, intelOptions),
                  locked: false,
                  createdAt: new Date().toISOString(),
                  tags: ['business', 'intel'],
                },
                ...(current.snapPlus?.memories || []),
              ].slice(0, 80),
            },
          }))
          showDragToast('Запазено в чат + Memories')
        }}
        youName={user?.displayName}
        peerName={active?.members[0]?.name}
        youEmail={user?.email}
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
      className="flex w-full min-w-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-[var(--chip)]"
    >
      <Icon className="h-4 w-4 shrink-0 text-[var(--muted)]" />
      <span className="min-w-0 flex-1 break-words leading-snug [overflow-wrap:anywhere]">
        {label}
      </span>
    </button>
  )
}
