'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  Building2,
  Clapperboard,
  MessageCircle,
  Sparkles,
  Users,
  Waves,
} from 'lucide-react'
import { needsCheckout } from '@/lib/access'
import { useTheme } from '@/lib/theme'

export default function LandingPage() {
  const router = useRouter()
  const { prefs, hydrated } = useTheme()

  useEffect(() => {
    if (!hydrated || !prefs.user) return
    if (needsCheckout(prefs.user)) {
      router.replace(`/checkout?plan=${prefs.user.plan}`)
      return
    }
    router.replace('/dashboard')
  }, [hydrated, prefs.user, router])

  return (
    <div className="relative flex min-h-screen flex-col px-4 py-8 sm:px-6 lg:px-8">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <div className="flex items-center gap-2">
          <Waves className="h-5 w-5 text-[var(--accent)]" />
          <span className="font-[family-name:var(--font-display)] text-lg font-semibold">
            OmniVoice AI
          </span>
        </div>
        <div className="flex gap-2">
          <Link href="/login" className="ov-btn-ghost !px-4 !py-2 text-xs">
            Вход
          </Link>
          <Link href="/register" className="ov-btn-primary !px-4 !py-2 text-xs">
            Регистрация
          </Link>
        </div>
      </header>

      <main className="mx-auto mt-16 w-full max-w-6xl">
        <p className="ov-kicker">Realtime translation suite</p>
        <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight sm:text-6xl">
          Messenger dashboard.
          <span className="text-[var(--accent)]"> Rooms that translate.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[var(--muted)] sm:text-lg">
          Стандартна регистрация → дашборд в стил месинджър → стая за разговор.
          Normal е безплатен. Business и Podcast се плащат преди достъп.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/register" className="ov-btn-primary">
            Започни безплатно
          </Link>
          <Link href="/login" className="ov-btn-ghost">
            Вече имам акаунт
          </Link>
          <Link href="/embed" className="ov-btn-ghost">
            Website widget
          </Link>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          <Feature
            icon={Users}
            title="Normal · Free"
            text="Чат + обаждания с превод, абонати, стаи, guest контрол."
          />
          <Feature
            icon={Building2}
            title="Business · Paid"
            text="AI секретар към телефон, CRM, sales coaching, call recap."
          />
          <Feature
            icon={Clapperboard}
            title="Podcast · Paid"
            text="OBS, multistream към YouTube/TikTok/Facebook и още."
          />
        </div>

        <div className="ov-panel mt-10 rounded-[28px] p-6">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <MessageCircle className="h-4 w-4 text-[var(--accent)]" />
            Как работи
          </p>
          <ol className="mt-3 space-y-2 text-sm text-[var(--muted)]">
            <li>1. Регистрация + режим (админът ползва всичко безплатно)</li>
            <li>2. Business/Podcast — плащане (освен ако си админ)</li>
            <li>3. Messenger дашборд + покани с линк (име + език за гости)</li>
            <li>4. Сайт widget: клиентите участват без собствен абонамент</li>
            <li>5. Когато хостът натисне End — гостите се изхвърлят</li>
          </ol>
          <p className="mt-4 inline-flex items-center gap-2 text-xs text-[var(--accent)]">
            <Sparkles className="h-3.5 w-3.5" />
            Social login + contact import са готови в UI (демо без външни OAuth ключове)
          </p>
        </div>
      </main>
    </div>
  )
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Users
  title: string
  text: string
}) {
  return (
    <div className="ov-panel rounded-[24px] p-5">
      <Icon className="h-5 w-5 text-[var(--accent)]" />
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{text}</p>
    </div>
  )
}
