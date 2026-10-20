'use client'

import { useMemo, useState } from 'react'
import { Lock, Mail, Phone, Sparkles, UserRound, X } from 'lucide-react'
import { APP_LANGUAGES, PLANS, type PlanId } from '@/lib/languages'
import { createUserId, type ContactMethod, type OmniUser } from '@/lib/user-store'

type RegisterModalProps = {
  open: boolean
  onClose: () => void
  onRegistered: (user: OmniUser) => void
}

export default function RegisterModal({
  open,
  onClose,
  onRegistered,
}: RegisterModalProps) {
  const [fullName, setFullName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [contactMethod, setContactMethod] = useState<ContactMethod>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [nativeLanguage, setNativeLanguage] = useState('bg')
  const [company, setCompany] = useState('')
  const [plan, setPlan] = useState<PlanId>('free')
  const [secretaryEnabled, setSecretaryEnabled] = useState(false)
  const [secretaryPhone, setSecretaryPhone] = useState('')
  const [error, setError] = useState<string | null>(null)

  const planMeta = PLANS[plan]
  const canUseSecretary = planMeta.secretaryPhone

  const languageOptions = useMemo(() => APP_LANGUAGES, [])

  if (!open) return null

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!fullName.trim() || !displayName.trim() || password.length < 6) {
      setError('Попълни име, показвано име и парола (мин. 6 символа).')
      return
    }
    if (contactMethod === 'email' && !email.includes('@')) {
      setError('Въведи валиден имейл.')
      return
    }
    if (contactMethod === 'phone' && phone.trim().length < 8) {
      setError('Въведи валиден телефонен номер.')
      return
    }
    if (canUseSecretary && secretaryEnabled && secretaryPhone.trim().length < 8) {
      setError('За AI секретар е нужен телефон за връзка.')
      return
    }

    const user: OmniUser = {
      id: createUserId(),
      fullName: fullName.trim(),
      displayName: displayName.trim(),
      email: contactMethod === 'email' ? email.trim() : email.trim(),
      phone: contactMethod === 'phone' ? phone.trim() : phone.trim(),
      password,
      avatarDataUrl: '',
      contactMethod,
      nativeLanguage,
      company: company.trim(),
      plan,
      planPaid: plan === 'free',
      isAdmin: false,
      authProvider: 'email',
      secretaryEnabled: canUseSecretary ? secretaryEnabled : false,
      secretaryPhone: canUseSecretary && secretaryEnabled ? secretaryPhone.trim() : '',
      createdAt: '2026-10-19T12:00:00.000Z',
    }

    onRegistered(user)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-md">
      <div className="ov-panel max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="ov-kicker">Create account</p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              Регистрация в OmniVoice
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Свържи имейл или телефон. Избери език и план — AI секретар с телефон е в Business и Podcast.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ov-icon-btn"
            aria-label="Close registration"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Пълно име">
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
            </Field>
            <Field label="Показвано име">
              <input
                className="ov-field"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Kalo"
                required
              />
            </Field>
          </div>

          <div className="flex gap-2 rounded-2xl bg-[var(--chip)] p-1">
            {(['email', 'phone'] as ContactMethod[]).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setContactMethod(method)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  contactMethod === method
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                    : 'text-[var(--muted)]'
                }`}
              >
                {method === 'email' ? 'Имейл' : 'Телефон'}
              </button>
            ))}
          </div>

          {contactMethod === 'email' ? (
            <Field label="Имейл">
              <div className="ov-input-wrap">
                <Mail className="h-4 w-4 opacity-50" />
                <input
                  className="ov-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>
            </Field>
          ) : (
            <Field label="Телефон">
              <div className="ov-input-wrap">
                <Phone className="h-4 w-4 opacity-50" />
                <input
                  className="ov-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+359..."
                  required
                />
              </div>
            </Field>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Парола">
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
            </Field>
            <Field label="Твоят език">
              <select
                className="ov-field"
                value={nativeLanguage}
                onChange={(e) => setNativeLanguage(e.target.value)}
              >
                {languageOptions.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} · {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Компания / бранд (по желание)">
            <input
              className="ov-field"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="OmniVoice Studio"
            />
          </Field>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              План
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(PLANS) as PlanId[]).map((id) => {
                const item = PLANS[id]
                const active = plan === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setPlan(id)
                      if (!item.secretaryPhone) setSecretaryEnabled(false)
                    }}
                    className={`rounded-2xl border px-3 py-3 text-left transition ${
                      active
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--panel-border)] bg-[var(--chip)]'
                    }`}
                  >
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                      {item.price} · {item.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {canUseSecretary ? (
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--chip)] p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={secretaryEnabled}
                  onChange={(e) => setSecretaryEnabled(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--foreground)]">
                    <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                    AI секретар към телефона
                  </span>
                  <span className="mt-1 block text-xs text-[var(--muted)]">
                    Платена опция за Business и Podcast & Streaming — обажданията се приемат и превеждат през OmniVoice.
                  </span>
                </span>
              </label>
              {secretaryEnabled ? (
                <div className="mt-3">
                  <Field label="Телефон за секретар">
                    <div className="ov-input-wrap">
                      <Phone className="h-4 w-4 opacity-50" />
                      <input
                        className="ov-input"
                        type="tel"
                        value={secretaryPhone}
                        onChange={(e) => setSecretaryPhone(e.target.value)}
                        placeholder="+359..."
                      />
                    </div>
                  </Field>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-[var(--panel-border)] px-3 py-2 text-xs text-[var(--muted)]">
              AI секретар + телефонна връзка се отключват с Business или Podcast & Streaming.
            </p>
          )}

          {error ? (
            <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-500">
              {error}
            </p>
          ) : null}

          <button type="submit" className="ov-btn-primary w-full">
            Създай акаунт
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  )
}
