'use client'

export type GuestSession = {
  guestId: string
  displayName: string
  language: string
  inviteCode: string
  conversationId: string
  hostSiteKey?: string
  role: 'invite' | 'website'
  joinedAt: string
}

const KEY = 'omnivvoice.guest.session.v1'

export function loadGuestSession(): GuestSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as GuestSession
  } catch {
    return null
  }
}

export function saveGuestSession(session: GuestSession) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, JSON.stringify(session))
}

export function clearGuestSession() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(KEY)
}

export function createGuestId() {
  return `guest_${Math.random().toString(36).slice(2, 10)}`
}
