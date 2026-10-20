import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { PlanId } from '@/lib/languages'

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const stripe = getStripe()
  const raw = await request.text()
  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid signature'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId =
        session.metadata?.supabase_user_id || session.client_reference_id
      const plan = (session.metadata?.plan || 'business') as PlanId
      if (userId) {
        await admin
          .from('profiles')
          .update({
            plan: plan === 'podcast' ? 'podcast' : 'business',
            plan_paid: true,
            stripe_customer_id:
              typeof session.customer === 'string' ? session.customer : null,
            stripe_subscription_id:
              typeof session.subscription === 'string'
                ? session.subscription
                : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
      }
    }

    if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const sub = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.supabase_user_id
      const active = ['active', 'trialing'].includes(sub.status)
      if (userId) {
        await admin
          .from('profiles')
          .update({
            plan_paid: active,
            stripe_subscription_id: sub.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook handler failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
