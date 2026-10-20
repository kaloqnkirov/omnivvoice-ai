'use client'

import { tryCreateClient } from '@/lib/supabase/client'
import { profileToOmniUser } from '@/lib/profile-map'
import type { ProfileRow } from '@/lib/supabase/types'
import type { OmniUser } from '@/lib/user-store'
import type { PlanId } from '@/lib/languages'

export function isClientBackendEnabled() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function fetchBackendUser(): Promise<OmniUser | null> {
  if (!isClientBackendEnabled()) return null
  const res = await fetch('/api/me', { credentials: 'include' })
  if (!res.ok) return null
  const data = (await res.json()) as { user?: OmniUser | null }
  return data.user || null
}

export async function signUpEmail(input: {
  email: string
  password: string
  fullName: string
  plan: PlanId
}): Promise<{ user: OmniUser | null; error: string | null }> {
  const supabase = tryCreateClient()
  if (!supabase) {
    return { user: null, error: 'Backend not configured' }
  }

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        plan: input.plan,
        native_language: 'bg',
      },
    },
  })

  if (error) return { user: null, error: error.message }
  if (!data.user) return { user: null, error: 'Signup failed' }

  // Wait briefly for trigger profile
  await new Promise((r) => setTimeout(r, 400))
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profile) {
    return { user: profileToOmniUser(profile as ProfileRow), error: null }
  }

  // Fallback upsert if trigger missing
  const displayName = input.fullName.trim().split(' ')[0] || 'User'
  const { data: upserted } = await supabase
    .from('profiles')
    .upsert({
      id: data.user.id,
      email: input.email,
      full_name: input.fullName.trim(),
      display_name: displayName,
      plan: input.plan,
      plan_paid: input.plan === 'free',
      native_language: 'bg',
    })
    .select('*')
    .single()

  if (!upserted) {
    return {
      user: null,
      error: 'Profile not created — run supabase/schema.sql',
    }
  }
  return { user: profileToOmniUser(upserted as ProfileRow), error: null }
}

export async function signInEmail(input: {
  email: string
  password: string
}): Promise<{ user: OmniUser | null; error: string | null }> {
  const supabase = tryCreateClient()
  if (!supabase) {
    return { user: null, error: 'Backend not configured' }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })
  if (error) return { user: null, error: error.message }
  if (!data.user) return { user: null, error: 'Login failed' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle()

  if (!profile) {
    return { user: null, error: 'Profile missing — run schema.sql' }
  }
  return { user: profileToOmniUser(profile as ProfileRow), error: null }
}

export async function signInOAuth(provider: 'google' | 'apple' | 'facebook') {
  const supabase = tryCreateClient()
  if (!supabase) throw new Error('Backend not configured')
  const origin = window.location.origin
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${origin}/dashboard` },
  })
  if (error) throw error
}

export async function signOutBackend() {
  const supabase = tryCreateClient()
  if (!supabase) return
  await supabase.auth.signOut()
}
