import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { ProfileRow } from '@/lib/supabase/types'
import { isAdminUser } from '@/lib/access'
import { profileToOmniUser } from '@/lib/profile-map'
import type { OmniUser } from '@/lib/user-store'

export async function getSessionUser(): Promise<{
  user: OmniUser
  profile: ProfileRow
} | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return null

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  // Signup trigger can lag / miss — ensure a profile row exists (needed for invites FK).
  if (!profile) {
    try {
      const admin = getSupabaseAdmin()
      const fullName =
        (user.user_metadata?.full_name as string | undefined)?.trim() ||
        user.email.split('@')[0] ||
        'User'
      const displayName = fullName.split(' ')[0] || 'User'
      const { data: created } = await admin
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          display_name: displayName,
          plan: 'free',
          plan_paid: true,
          native_language:
            (user.user_metadata?.native_language as string | undefined) || 'bg',
        })
        .select('*')
        .single()
      profile = created
    } catch {
      return null
    }
  }

  if (!profile) return null

  let row = profile as ProfileRow
  const mapped = profileToOmniUser(row)

  // Keep admin flag in sync with ADMIN_EMAILS
  if (isAdminUser(mapped) && (!row.is_admin || !row.plan_paid)) {
    try {
      const admin = getSupabaseAdmin()
      const { data: updated } = await admin
        .from('profiles')
        .update({ is_admin: true, plan_paid: true, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select('*')
        .single()
      if (updated) row = updated as ProfileRow
    } catch {
      row = { ...row, is_admin: true, plan_paid: true }
    }
  }

  return { user: profileToOmniUser(row), profile: row }
}
