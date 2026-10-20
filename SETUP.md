# OmniVoice AI — production setup

Без тези ключове приложението работи в **локален демо режим** (localStorage). С тях — реален auth, DB, Stripe и WebRTC.

## 1. Supabase

1. Създай проект на [supabase.com](https://supabase.com)
2. SQL Editor → изпълни целия файл `supabase/schema.sql`
3. Project Settings → API → копирай URL, anon key, service_role key
4. Authentication → Providers → включи Email (+ Google/Apple по желание)
5. Постави в `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Админ имейл `aiassistantbox@gmail.com` получава `is_admin` + `plan_paid` автоматично от trigger-а.

## 2. Gemini

Премести ключа на **сървърна** променлива (не `NEXT_PUBLIC_`):

```
GEMINI_API_KEY=...
```

Ротирай стария ключ ако е бил `NEXT_PUBLIC_`.

## 3. Stripe

1. Създай Products/Prices за Business и Podcast
2. Developers → Webhooks → endpoint: `https://YOUR_DOMAIN/api/stripe/webhook`
  Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Env:

```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BUSINESS=price_...
STRIPE_PRICE_PODCAST=price_...
```

## 4. LiveKit

1. Cloud проект на [livekit.io](https://livekit.io) (или self-host)
2. Env:

```
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
NEXT_PUBLIC_LIVEKIT_URL=wss://....livekit.cloud
```

Без LiveKit стаята ползва локален mic/cam preview.

## 5. Deploy (Vercel)

1. Import repo → Add env vars от `.env.example`
2. `NEXT_PUBLIC_APP_URL=https://your-domain.com`
3. Supabase Auth → Redirect URLs: `https://your-domain.com/**`
4. Stripe webhook към production URL

```bash
npm run build
npm start
```

## Smoke test

1. Register с `aiassistantbox@gmail.com` → админ, без checkout
2. Dashboard → Покани гост → отвори линка в друг браузър
3. Guest попълва име + език → влиза в стая
4. Host End → guest се изхвърля
5. Paid plan → Stripe Checkout (или демо карта ако Stripe липсва)

