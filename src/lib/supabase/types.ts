import type { PlanId } from '@/lib/languages'

export type ProfileRow = {
  id: string
  email: string
  full_name: string
  display_name: string
  phone: string
  avatar_url: string
  native_language: string
  company: string
  plan: PlanId
  plan_paid: boolean
  is_admin: boolean
  secretary_enabled: boolean
  secretary_phone: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
  updated_at: string
}

export type RoomRow = {
  id: string
  host_id: string
  title: string
  session_open: boolean
  livekit_room: string
  channel: 'chat' | 'call' | 'both'
  created_at: string
  updated_at: string
}

export type ParticipantRow = {
  id: string
  room_id: string
  user_id: string | null
  guest_id: string | null
  display_name: string
  language: string
  role: 'host' | 'member' | 'guest'
  is_active: boolean
  joined_at: string
  left_at: string | null
}

export type MessageRow = {
  id: string
  room_id: string
  sender_user_id: string | null
  sender_guest_id: string | null
  sender_name: string
  body: string
  translated_body: string | null
  created_at: string
}

export type InviteRow = {
  id: string
  code: string
  room_id: string
  host_id: string
  label: string
  channel: 'chat' | 'call' | 'both'
  prefill_name: string | null
  prefill_language: string | null
  active: boolean
  created_at: string
}
