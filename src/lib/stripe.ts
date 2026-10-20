import Stripe from 'stripe'
import type { PlanId } from '@/lib/languages'
import { isStripeEnabled } from '@/lib/backend'

let stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return stripe
}

export { isStripeEnabled }

export function priceIdForPlan(plan: PlanId): string | null {
  if (plan === 'podcast') {
    return (
      process.env.STRIPE_PRICE_PODCAST ||
      process.env.STRIPE_PRICE_ID ||
      null
    )
  }
  if (plan === 'business') {
    return (
      process.env.STRIPE_PRICE_BUSINESS ||
      process.env.STRIPE_PRICE_ID ||
      null
    )
  }
  return null
}
