import { NextRequest, NextResponse } from 'next/server'
import { appUrl, isBackendEnabled } from '@/lib/backend'
import { getSessionUser } from '@/lib/auth/get-user'
import { getStripe, isStripeEnabled, priceIdForPlan } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { PlanId } from '@/lib/languages'

export async function POST(request: NextRequest) {
  try {
    if (!isBackendEnabled()) {
      return NextResponse.json({ error: 'Backend not configured' }, { status: 503 })
    }
    if (!isStripeEnabled()) {
      return NextResponse.json(
        { error: 'Stripe is not configured', demo: true },
        { status: 503 }
      )
    }

    const session = await getSessionUser()
    if (!session?.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.isAdmin) {
      return NextResponse.json({
        url: `${appUrl(request.headers.get('origin'))}/dashboard`,
        admin: true,
      })
    }

    const body = (await request.json().catch(() => ({}))) as { plan?: PlanId }
    const plan: PlanId =
      body.plan === 'podcast' ? 'podcast' : 'business'
    const priceId = priceIdForPlan(plan)
    if (!priceId) {
      return NextResponse.json({ error: 'Missing Stripe price id' }, { status: 500 })
    }

    const stripe = getStripe()
    const admin = getSupabaseAdmin()
    const origin = appUrl(request.headers.get('origin'))

    let customerId = session.profile.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        metadata: { supabase_user_id: session.user.id },
      })
      customerId = customer.id
      await admin
        .from('profiles')
        .update({
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id)
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?billing=success`,
      cancel_url: `${origin}/checkout?plan=${plan}&billing=cancel`,
      client_reference_id: session.user.id,
      metadata: {
        supabase_user_id: session.user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: session.user.id,
          plan,
        },
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: checkout.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
