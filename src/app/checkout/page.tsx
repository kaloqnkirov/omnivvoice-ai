'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { CreditCard, Waves } from 'lucide-react'
import { isAdminUser } from '@/lib/access'
import { isClientBackendEnabled } from '@/lib/auth-client'
import { PLANS, type PlanId } from '@/lib/languages'
import { useTheme } from '@/lib/theme'

function CheckoutInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { prefs, updatePrefs } = useTheme()
  const planParam = (params.get('plan') || 'business') as PlanId
  const plan = planParam === 'podcast' ? 'podcast' : 'business'
  const meta = PLANS[plan]
  const [card, setCard] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const backend = isClientBackendEnabled()

  async function startStripe() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan }),
      })
      const data = (await res.json()) as {
        url?: string
        error?: string
        demo?: boolean
        admin?: boolean
      }
      if (data.url) {
        window.location.href = data.url
        return
      }
      if (res.status === 503 && data.demo) {
        setError('Stripe още не е конфигуриран — ползвай демо плащане по-долу.')
        return
      }
      setError(data.error || 'Checkout failed')
    } finally {
      setBusy(false)
    }
  }

  function payDemo(event: React.FormEvent) {
    event.preventDefault()
    if (!prefs.user) {
      router.push('/register')
      return
    }
    if (isAdminUser(prefs.user)) {
      updatePrefs({
        user: { ...prefs.user, plan, planPaid: true, isAdmin: true },
      })
      router.push('/dashboard')
      return
    }
    if (card.replace(/\s/g, '').length < 12) {
      setError('Въведи демо карта (мин. 12 цифри) или ползвай Stripe.')
      return
    }
    updatePrefs({
      user: {
        ...prefs.user,
        plan,
        planPaid: true,
      },
    })
    router.push('/dashboard')
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 py-10">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--muted)]">
        <Waves className="h-4 w-4 text-[var(--accent)]" />
        OmniVoice AI
      </Link>
      <div className="ov-panel rounded-[28px] p-6">
        <p className="ov-kicker">Плащане</p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          {meta.label}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {meta.description}. Плащането отключва режима преди дашборда.
        </p>
        <ul className="mt-4 space-y-1.5 text-sm text-[var(--foreground)]">
          {meta.features.map((feature) => (
            <li key={feature}>• {feature}</li>
          ))}
        </ul>

        {backend ? (
          <button
            type="button"
            className="ov-btn-primary mt-6 w-full"
            disabled={busy}
            onClick={() => void startStripe()}
          >
            {busy ? '…' : 'Плати със Stripe'}
          </button>
        ) : null}

        <form className="mt-4 space-y-3" onSubmit={payDemo}>
          <label className="block">
            <span className="mb-1.5 block text-xs text-[var(--muted)]">
              {backend ? 'Демо карта (ако Stripe липсва)' : 'Карта (демо)'}
            </span>
            <div className="ov-input-wrap">
              <CreditCard className="h-4 w-4 opacity-50" />
              <input
                className="ov-input"
                value={card}
                onChange={(e) => setCard(e.target.value)}
                placeholder="4242 4242 4242 4242"
              />
            </div>
          </label>
          {error ? <p className="text-xs text-rose-500">{error}</p> : null}
          <button type="submit" className="ov-btn-ghost w-full">
            Демо плащане и вход
          </button>
        </form>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[var(--muted)]">Loading…</div>}>
      <CheckoutInner />
    </Suspense>
  )
}
