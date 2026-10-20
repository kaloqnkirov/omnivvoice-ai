'use client'

import { useState } from 'react'
import { Download, X } from 'lucide-react'
import type { AuthProvider } from '@/lib/auth-types'
import { importContactsFrom } from '@/lib/contacts-import'
import { useTheme } from '@/lib/theme'

type ContactImportModalProps = {
  open: boolean
  onClose: () => void
}

export default function ContactImportModal({
  open,
  onClose,
}: ContactImportModalProps) {
  const { prefs, updatePrefs } = useTheme()
  const [imported, setImported] = useState(0)

  if (!open) return null

  function runImport(provider: AuthProvider) {
    const link = prefs.socialLinks.find((item) => item.provider === provider)
    if (!link?.connected) {
      updatePrefs({
        socialLinks: prefs.socialLinks.map((item) =>
          item.provider === provider ? { ...item, connected: true } : item
        ),
      })
    }
    const contacts = importContactsFrom(provider)
    const existing = new Set(
      prefs.subscribers.map((sub) => sub.email || sub.phone || sub.name)
    )
    const fresh = contacts.filter(
      (contact) => !existing.has(contact.email || contact.phone || contact.name)
    )
    updatePrefs({ subscribers: [...fresh, ...prefs.subscribers] })
    setImported(fresh.length)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="ov-panel w-full max-w-md rounded-[28px] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="ov-kicker">Import</p>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              Контакти / абонати
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Свържи телефон, Google или Facebook и изтегли списъка.
            </p>
          </div>
          <button type="button" className="ov-icon-btn" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {prefs.socialLinks
            .filter((link) => link.canImportContacts)
            .map((link) => (
              <button
                key={link.provider}
                type="button"
                className="ov-btn-ghost w-full justify-between"
                onClick={() => runImport(link.provider)}
              >
                <span>
                  {link.label}
                  {link.connected ? ' · connected' : ' · connect & import'}
                </span>
                <Download className="h-4 w-4" />
              </button>
            ))}
        </div>

        {imported > 0 ? (
          <p className="mt-4 rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--accent)]">
            Добавени {imported} нови контакта към абонатите.
          </p>
        ) : null}
      </div>
    </div>
  )
}
