import type { PlanId } from '@/lib/languages'
import type { OmniUser } from '@/lib/user-store'

/** Owner / platform admin emails — full free access to every mode */
export const ADMIN_EMAILS = [
  'admin@omnivvoice.app',
  'admin@omnivoice.ai',
  'калоян@omnivvoice.app',
  'kaloyan@omnivvoice.app',
  'aiassistantbox@gmail.com',
]

const ALL_PLANS: PlanId[] = ['free', 'business', 'podcast']

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

/** Plans the user can switch into from the menu (paid / admin). */
export function getUnlockedPlans(user: OmniUser | null | undefined): PlanId[] {
  if (!user) return ['free']
  if (isAdminUser(user)) return [...ALL_PLANS]

  const set = new Set<PlanId>(['free'])
  if (user.plan) set.add(user.plan)
  if (user.planPaid && user.plan !== 'free') set.add(user.plan)
  for (const p of user.unlockedPlans || []) {
    if (ALL_PLANS.includes(p)) set.add(p)
  }
  return ALL_PLANS.filter((p) => set.has(p))
}

export function withUnlockedPlan(
  user: OmniUser,
  plan: PlanId,
  paid = true
): OmniUser {
  const unlocked = new Set<PlanId>(getUnlockedPlans(user))
  unlocked.add('free')
  unlocked.add(plan)
  return {
    ...user,
    plan,
    planPaid: plan === 'free' ? true : paid || user.planPaid,
    unlockedPlans: ALL_PLANS.filter((p) => unlocked.has(p)),
  }
}
