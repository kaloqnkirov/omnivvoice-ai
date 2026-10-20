import type { AuthProvider } from '@/lib/auth-types'
import type { Subscriber } from '@/lib/user-store'

/** Simulated contact import from linked Google / Facebook / Phone */
export function importContactsFrom(
  provider: AuthProvider
): Subscriber[] {
  const stamp = Date.now()
  const packs: Record<string, Array<Omit<Subscriber, 'id'>>> = {
    google: [
      {
        name: 'Elena Georgieva',
        email: 'elena@gmail.com',
        phone: '+359888100200',
        language: 'bg',
        status: 'invited',
        plan: 'free',
        presence: 'offline',
        source: 'google',
      },
      {
        name: 'John Carter',
        email: 'john.carter@gmail.com',
        phone: '+12025550111',
        language: 'en',
        status: 'invited',
        plan: 'free',
        presence: 'offline',
        source: 'google',
      },
    ],
    facebook: [
      {
        name: 'Nina Koleva',
        email: 'nina.fb@example.com',
        phone: '+359887334455',
        language: 'bg',
        status: 'invited',
        plan: 'free',
        presence: 'offline',
        source: 'facebook',
      },
      {
        name: 'Marco Rossi',
        email: 'marco.fb@example.com',
        phone: '+390612345678',
        language: 'it',
        status: 'invited',
        plan: 'free',
        presence: 'offline',
        source: 'facebook',
      },
    ],
    phone: [
      {
        name: 'Иван Димитров',
        email: '',
        phone: '+359899112233',
        language: 'bg',
        status: 'invited',
        plan: 'free',
        presence: 'offline',
        source: 'phone',
      },
      {
        name: 'Sara Müller',
        email: '',
        phone: '+4915112345678',
        language: 'de',
        status: 'invited',
        plan: 'free',
        presence: 'offline',
        source: 'phone',
      },
      {
        name: 'Omar Hassan',
        email: '',
        phone: '+971501234567',
        language: 'ar',
        status: 'invited',
        plan: 'free',
        presence: 'offline',
        source: 'phone',
      },
    ],
    apple: [],
    email: [],
  }

  return (packs[provider] || []).map((item, index) => ({
    ...item,
    id: `imp_${provider}_${stamp}_${index}`,
  }))
}
