import type { PlanId } from '@/lib/languages'
import type { PresenceStatus } from '@/lib/user-store'

export type AuthProvider = 'email' | 'google' | 'facebook' | 'apple' | 'phone'

export type AuthUser = {
  id: string
  fullName: string
  displayName: string
  email: string
  phone: string
  password: string
  avatarDataUrl: string
  nativeLanguage: string
  plan: PlanId
  planPaid: boolean
  unlockedPlans?: PlanId[]
  isAdmin: boolean
  authProvider: AuthProvider
  company: string
  secretaryEnabled: boolean
  secretaryPhone: string
  createdAt: string
}

export type ConversationMember = {
  id: string
  name: string
  avatarDataUrl?: string
  language: string
  presence: PresenceStatus
}

export type ConversationMessage = {
  id: string
  fromMe: boolean
  text: string
  createdAt: string
  status: 'sent' | 'delivered' | 'read'
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
  replyToId?: string
  replyPreview?: string
  reactions?: Record<string, number>
  translatedText?: string
}

export type JoinRequest = {
  id: string
  subscriberId: string
  name: string
  language: string
  /** host dragged invite vs subscriber asked to enter */
  kind: 'invite' | 'knock'
  status: 'pending' | 'accepted' | 'declined'
  inviteCode?: string
  createdAt: string
}

export type Conversation = {
  id: string
  title: string
  isGroup: boolean
  members: ConversationMember[]
  lastMessage: string
  updatedAt: string
  unread: number
  pinned: boolean
  muted: boolean
  messages: ConversationMessage[]
  saveChat: boolean
  disappearAfter: 'off' | '1h' | '24h' | '7d'
  /** Host-controlled session — when false, guests are kicked */
  sessionOpen: boolean
  activeGuestIds: string[]
  archived?: boolean
  /** Pending room entries: host invite or subscriber knock */
  joinRequests?: JoinRequest[]
}

export type InviteLink = {
  id: string
  code: string
  conversationId: string
  label: string
  channel: 'chat' | 'call' | 'both'
  /** Prefill if invited from contacts */
  prefillName?: string
  prefillLanguage?: string
  createdAt: string
  active: boolean
}

export type BlockedContact = {
  id: string
  name: string
  reason: string
  blockedAt: string
}

export type SocialLink = {
  provider: AuthProvider
  connected: boolean
  label: string
  canImportContacts: boolean
}
