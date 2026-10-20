'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Building2,
  Clapperboard,
  Lock,
  Mail,
  Share2,
  Smartphone,
  UserRound,
  Users,
  Waves,
} from 'lucide-react'
import type { AuthProvider } from '@/lib/auth-types'
import {
  isClientBackendEnabled,
  signInOAuth,
  signUpEmail,
} from '@/lib/auth-client'
import { isAdminUser, needsCheckout } from '@/lib/access'
import { PLANS, type PlanId } from '@/lib/languages'
import { useTheme } from '@/lib/theme'
import { createUserId, type OmniUser } from '@/lib/user-store'

const PLAN_CARDS: Array<{
  id: PlanId
  icon: typeof Users
  price: string
  paid: boolean
}> = [
  { id: 'free', icon: Users, price: 'Безплатно', paid: false },
  { id: 'business', icon: Building2, price: '€29/мес', paid: true },
  { id: 'podcast', icon: Clapperboard, price: '€49/мес', paid: true },
]

export default function RegisterPage() {
  const router = useRouter()
  const { updatePrefs, prefs } = useTheme()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [plan, setPlan] = useState<PlanId>('free')
  const [asAdmin, setAsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const backend = isClientBackendEnabled()

  function finish(user: OmniUser) {
    const admin = asAdmin || isAdminUser(user)
    const next = {
      ...user,
      password: '',
      isAdmin: admin,
      planPaid: admin ? true : user.planPaid,
    }
    updatePrefs({ user: next })
    if (needsCheckout(next)) {
      router.push(`/checkout?plan=${next.plan}`)
      return
    }
    router.push('/dashboard')
  }

  async function registerEmail(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (!fullName.trim() || !email.includes('@') || password.length < 6) {
      setError('Попълни име, валиден имейл и парола (мин. 6).')
      return
    }
    setBusy(true)
    try {
      if (backend) {
        const { user, error: err } = await signUpEmail({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          plan,
        })
        if (err || !user) {
          setError(err || 'Регистрацията се провали.')
          return
        }
        finish(user)
        return
      }

      const user: OmniUser = {
        id: createUserId(),
        fullName: fullName.trim(),
        displayName: fullName.trim().split(' ')[0] || 'User',
        email: email.trim(),
        phone: '',
        password: '',
        avatarDataUrl: '',
        contactMethod: 'email',
        nativeLanguage: 'bg',
        company: '',
        plan,
        planPaid: plan === 'free',
        isAdmin: false,
        authProvider: 'email',
        secretaryEnabled: false,
        secretaryPhone: '',
        createdAt: new Date().toISOString(),
      }
      finish(user)
    } finally {
      setBusy(false)
    }
  }

  async function registerSocial(provider: AuthProvider) {
    setError(null)
    if (backend && (provider === 'google' || provider === 'apple')) {
      try {
        setBusy(true)
        await signInOAuth(provider)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'OAuth failed')
        setBusy(false)
      }
      return
    }
    if (backend && provider === 'facebook') {
      setError('Facebook OAuth — активирай го в Supabase Auth providers.')
      return
    }

    const label =
      provider === 'google'
        ? 'Google User'
        : provider === 'facebook'
          ? 'Facebook User'
          : provider === 'apple'
            ? 'Apple User'
            : 'Phone User'
    const user: OmniUser = {
      id: createUserId(),
      fullName: label,
      displayName: label.split(' ')[0],
      email:
        provider === 'phone'
          ? ''
          : `${provider}.user@omnivvoice.app`,
      phone: provider === 'phone' ? '+359888000111' : '',
      password: '',
      avatarDataUrl: '',
      contactMethod: provider === 'phone' ? 'phone' : 'email',
      nativeLanguage: 'bg',
      company: '',
      plan,
      planPaid: plan === 'free',
      isAdmin: false,
      authProvider: provider,
      secretaryEnabled: false,
      secretaryPhone: '',
      createdAt: new Date().toISOString(),
    }
    updatePrefs({
      socialLinks: prefs.socialLinks.map((link) =>
        link.provider === provider ? { ...link, connected: true } : link
      ),
    })
    finish(user)
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--muted)]">
        <Waves className="h-4 w-4 text-[var(--accent)]" />
        OmniVoice AI
      </Link>

      <div className="ov-panel grid gap-8 rounded-[32px] p-6 md:grid-cols-[1.1fr_0.9fr] md:p-8">
        <div>
          <p className="ov-kicker">Регистрация</p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Създай акаунт
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Име, имейл, парола и избор на режим. За Business и Podcast плащането е
            преди достъп до дашборда.
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {PLAN_CARDS.map((card) => {
              const Icon = card.icon
              const active = plan === card.id
              const meta = PLANS[card.id]
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setPlan(card.id)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                      : 'border-[var(--panel-border)] bg-[var(--chip)]'
                  }`}
                >
                  <Icon className="h-4 w-4 text-[var(--accent)]" />
                  <p className="mt-2 text-sm font-semibold">{meta.label}</p>
                  <p className="text-[11px] text-[var(--muted)]">{card.price}</p>
                  {card.paid ? (
                    <p className="mt-1 text-[10px] font-semibold text-[var(--accent)]">
                      Плащане първо
                    </p>
                  ) : (
                    <p className="mt-1 text-[10px] font-semibold text-emerald-500">
                      Free
                    </p>
                  )}
                </button>
              )
            })}
          </div>

          <form className="mt-6 space-y-3" onSubmit={registerEmail}>
            <label className="block">
              <span className="mb-1.5 block text-xs text-[var(--muted)]">Име</span>
              <div className="ov-input-wrap">
                <UserRound className="h-4 w-4 opacity-50" />
                <input
                  className="ov-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Калоян Иванов"
                  required
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-[var(--muted)]">Имейл</span>
              <div className="ov-input-wrap">
                <Mail className="h-4 w-4 opacity-50" />
                <input
                  className="ov-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-[var(--muted)]">Парола</span>
              <div className="ov-input-wrap">
                <Lock className="h-4 w-4 opacity-50" />
                <input
                  className="ov-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
            </label>
            <label className="flex items-start gap-2 rounded-xl bg-[var(--chip)] px-3 py-2 text-xs text-[var(--muted)]">
              <input
                type="checkbox"
                checked={asAdmin}
                onChange={(e) => setAsAdmin(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Аз съм админ/собственик — пълен достъп до всички режими безплатно
                (или влез с admin имейл, напр. aiassistantbox@gmail.com).
              </span>
            </label>
            {error ? (
              <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-500">
                {error}
              </p>
            ) : null}
            <button type="submit" className="ov-btn-primary w-full" disabled={busy}>
              {busy
                ? '…'
                : asAdmin || plan === 'free'
                  ? 'Създай акаунт'
                  : 'Продължи към плащане'}
            </button>
          </form>
        </div>

        <div className="rounded-[24px] border border-[var(--panel-border)] bg-[var(--chip)] p-5">
          <p className="text-sm font-semibold">Или чрез платформа</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Google, Facebook, Apple, телефон — после можеш да импортнеш контакти.
          </p>
          <div className="mt-4 space-y-2">
            <SocialBtn
              label="Продължи с Google"
              onClick={() => registerSocial('google')}
            />
            <SocialBtn
              label="Продължи с Facebook"
              icon={<Share2 className="h-4 w-4" />}
              onClick={() => registerSocial('facebook')}
            />
            <SocialBtn
              label="Продължи с Apple"
              icon={<Share2 className="h-4 w-4" />}
              onClick={() => registerSocial('apple')}
            />
            <SocialBtn
              label="Продължи с телефон"
              icon={<Smartphone className="h-4 w-4" />}
              onClick={() => registerSocial('phone')}
            />
          </div>
          <p className="mt-6 text-xs text-[var(--muted)]">
            Вече имаш акаунт?{' '}
            <Link href="/login" className="text-[var(--accent)] underline">
              Вход
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function SocialBtn({
  label,
  onClick,
  icon,
}: {
  label: string
  onClick: () => void
  icon?: React.ReactNode
}) {
  return (
    <button type="button" className="ov-btn-ghost w-full justify-start" onClick={onClick}>
      {icon || <Mail className="h-4 w-4" />}
      {label}
    </button>
  )
}
