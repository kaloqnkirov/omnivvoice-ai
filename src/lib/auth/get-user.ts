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

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

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
