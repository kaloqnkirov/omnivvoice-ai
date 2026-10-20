import { isAdminUser } from '@/lib/access'
import type { ProfileRow } from '@/lib/supabase/types'
import type { OmniUser } from '@/lib/user-store'

export function profileToOmniUser(profile: ProfileRow): OmniUser {
  const base: OmniUser = {
    id: profile.id,
    fullName: profile.full_name,
    displayName: profile.display_name || profile.full_name.split(' ')[0] || 'User',
    email: profile.email,
    phone: profile.phone || '',
    password: '',
    avatarDataUrl: profile.avatar_url || '',
    contactMethod: profile.phone ? 'phone' : 'email',
    nativeLanguage: profile.native_language || 'bg',
    company: profile.company || '',
    plan: profile.plan,
    planPaid: profile.plan_paid,
    isAdmin: profile.is_admin,
    authProvider: 'email',
    secretaryEnabled: profile.secretary_enabled,
    secretaryPhone: profile.secretary_phone || '',
    createdAt: profile.created_at,
  }
  const admin = isAdminUser(base) || profile.is_admin
  return {
    ...base,
    isAdmin: admin,
    planPaid: admin ? true : profile.plan_paid,
  }
}
