/** True when Supabase public env is present — real auth/DB path */
export function isBackendEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export function isStripeEnabled(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      (process.env.STRIPE_PRICE_BUSINESS || process.env.STRIPE_PRICE_ID)
  )
}

export function isLiveKitEnabled(): boolean {
  return Boolean(
    process.env.LIVEKIT_API_KEY &&
      process.env.LIVEKIT_API_SECRET &&
      (process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL)
  )
}

export function appUrl(requestOrigin?: string | null): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    requestOrigin ||
    'http://localhost:3000'
  )
}
