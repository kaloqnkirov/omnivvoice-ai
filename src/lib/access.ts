import type { OmniUser } from '@/lib/user-store'

/** Owner / platform admin emails — full free access to every mode */
export const ADMIN_EMAILS = [
  'admin@omnivvoice.app',
  'admin@omnivoice.ai',
  'калоян@omnivvoice.app',
  'kaloyan@omnivvoice.app',
  'aiassistantbox@gmail.com',
]

export function isAdminUser(user: OmniUser | null | undefined): boolean {
  if (!user?.email) return false
  // Only the email list matters — never trust a client-set isAdmin flag.
  const email = user.email.trim().toLowerCase()
  return ADMIN_EMAILS.some((item) => item.toLowerCase() === email)
}

/** Full product access without paying */
export function hasFullAccess(user: OmniUser | null | undefined): boolean {
  if (!user) return false
  if (isAdminUser(user)) return true
  if (user.plan === 'free') return true
  return Boolean(user.planPaid)
}

/** Needs checkout before dashboard */
export function needsCheckout(user: OmniUser | null | undefined): boolean {
  if (!user) return false
  if (isAdminUser(user)) return false
  return user.plan !== 'free' && !user.planPaid
}
