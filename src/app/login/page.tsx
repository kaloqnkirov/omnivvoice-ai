'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Lock, Mail, Share2, Smartphone, Waves } from 'lucide-react'
import type { AuthProvider } from '@/lib/auth-types'
import {
  isClientBackendEnabled,
  signInEmail,
  signInOAuth,
} from '@/lib/auth-client'
import { isAdminUser, needsCheckout } from '@/lib/access'
import { useTheme } from '@/lib/theme'
import { createUserId, type OmniUser } from '@/lib/user-store'

export default function LoginPage() {
  const router = useRouter()
  const { prefs, updatePrefs } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const backend = isClientBackendEnabled()

  function enter(user: OmniUser) {
    const admin = isAdminUser(user)
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

  async function loginEmail(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (backend) {
        const { user, error: err } = await signInEmail({ email, password })
        if (err || !user) {
          setError(err || 'Грешни данни.')
          return
        }
        enter(user)
        return
      }

      if (prefs.user?.email === email && prefs.user.password === password) {
        enter(prefs.user)
        return
      }
      if (!email.includes('@') || password.length < 6) {
        setError('Грешни данни или акаунтът още не съществува.')
        return
      }
      enter({
        id: prefs.user?.id || createUserId(),
        fullName: prefs.user?.fullName || email.split('@')[0],
        displayName: prefs.user?.displayName || email.split('@')[0],
        email,
        phone: prefs.user?.phone || '',
        password: '',
        avatarDataUrl: prefs.user?.avatarDataUrl || '',
        contactMethod: 'email',
        nativeLanguage: prefs.user?.nativeLanguage || 'bg',
        company: prefs.user?.company || '',
        plan: prefs.user?.plan || 'free',
        planPaid: prefs.user?.planPaid ?? true,
        isAdmin: Boolean(prefs.user?.isAdmin),
        authProvider: 'email',
        secretaryEnabled: prefs.user?.secretaryEnabled || false,
        secretaryPhone: prefs.user?.secretaryPhone || '',
        createdAt: prefs.user?.createdAt || new Date().toISOString(),
      })
    } finally {
      setBusy(false)
    }
  }

  async function loginSocial(provider: AuthProvider) {
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

    const user: OmniUser = {
      id: prefs.user?.id || createUserId(),
      fullName: prefs.user?.fullName || `${provider} user`,
      displayName: prefs.user?.displayName || provider,
      email: prefs.user?.email || `${provider}@omnivvoice.app`,
      phone: provider === 'phone' ? '+359888000111' : prefs.user?.phone || '',
      password: '',
      avatarDataUrl: prefs.user?.avatarDataUrl || '',
      contactMethod: provider === 'phone' ? 'phone' : 'email',
      nativeLanguage: prefs.user?.nativeLanguage || 'bg',
      company: prefs.user?.company || '',
      plan: prefs.user?.plan || 'free',
      planPaid: prefs.user?.plan === 'free' || Boolean(prefs.user?.planPaid),
      isAdmin: Boolean(prefs.user?.isAdmin),
      authProvider: provider,
      secretaryEnabled: prefs.user?.secretaryEnabled || false,
      secretaryPhone: prefs.user?.secretaryPhone || '',
      createdAt: prefs.user?.createdAt || new Date().toISOString(),
    }
    updatePrefs({
      socialLinks: prefs.socialLinks.map((link) =>
        link.provider === provider ? { ...link, connected: true } : link
      ),
    })
    enter(user)
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-10">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--muted)]">
        <Waves className="h-4 w-4 text-[var(--accent)]" />
        OmniVoice AI
      </Link>
      <div className="ov-panel rounded-[28px] p-6">
        <p className="ov-kicker">Вход</p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          Добре дошъл обратно
        </h1>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {backend
            ? 'Supabase auth — реална сесия'
            : 'Локален демо режим (без Supabase env)'}
        </p>
        <form className="mt-5 space-y-3" onSubmit={loginEmail}>
          <div className="ov-input-wrap">
            <Mail className="h-4 w-4 opacity-50" />
            <input
              className="ov-input"
              type="email"
              placeholder="Имейл"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="ov-input-wrap">
            <Lock className="h-4 w-4 opacity-50" />
            <input
              className="ov-input"
              type="password"
              placeholder="Парола"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-xs text-rose-500">{error}</p> : null}
          <button type="submit" className="ov-btn-primary w-full" disabled={busy}>
            {busy ? '…' : 'Влез'}
          </button>
        </form>
        <div className="mt-4 space-y-2">
          <button type="button" className="ov-btn-ghost w-full" onClick={() => void loginSocial('google')} disabled={busy}>
            Google
          </button>
          <button type="button" className="ov-btn-ghost w-full" onClick={() => void loginSocial('facebook')} disabled={busy}>
            <Share2 className="h-4 w-4" /> Facebook
          </button>
          <button type="button" className="ov-btn-ghost w-full" onClick={() => void loginSocial('apple')} disabled={busy}>
            <Share2 className="h-4 w-4" /> Apple
          </button>
          <button type="button" className="ov-btn-ghost w-full" onClick={() => void loginSocial('phone')} disabled={busy}>
            <Smartphone className="h-4 w-4" /> Телефон
          </button>
        </div>
        <p className="mt-5 text-xs text-[var(--muted)]">
          Нямаш акаунт?{' '}
          <Link href="/register" className="text-[var(--accent)] underline">
            Регистрация
          </Link>
        </p>
      </div>
    </div>
  )
}
