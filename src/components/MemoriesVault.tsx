'use client'

import { useEffect, useState } from 'react'
import { Lock, Trash2, Unlock, X } from 'lucide-react'
import type { MemoryItem } from '@/lib/snap-plus'

type Props = {
  open: boolean
  memories: MemoryItem[]
  vaultPin: string
  unlockedUntil: number
  onClose: () => void
  onUnlock: (until: number) => void
  onLock: () => void
  onDelete: (id: string) => void
  onChangePin: (pin: string) => void
}

export default function MemoriesVault({
  open,
  memories,
  vaultPin,
  unlockedUntil,
  onClose,
  onUnlock,
  onLock,
  onDelete,
  onChangePin,
}: Props) {
  const [pin, setPin] = useState('')
  const [filter, setFilter] = useState<'all' | 'locked' | 'open'>('all')
  const [now, setNow] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setNow(Date.now())
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [open])

  if (!open) return null

  const unlocked = now > 0 && unlockedUntil > now
  const visible = memories.filter((m) => {
    if (filter === 'locked') return m.locked
    if (filter === 'open') return !m.locked
    return true
  })

  return (
    <div className="fixed inset-0 z-[72] flex items-end justify-center bg-black/60 px-3 py-3 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Memories · Eyes Only</p>
            <p className="text-[11px] text-[var(--muted)]">
              По-добре от Snapchat: преводи, deals и clips в един сейф
            </p>
          </div>
          <button type="button" className="ov-icon-btn" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {!unlocked ? (
          <div className="space-y-3 p-5">
            <p className="text-sm">Въведи PIN за Eyes Only</p>
            <input
              className="ov-field tracking-[0.35em]"
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
            />
            {error ? (
              <p className="text-xs text-rose-500">{error}</p>
            ) : (
              <p className="text-[11px] text-[var(--muted)]">
                Demo PIN по подразбиране: {vaultPin || '1234'}
              </p>
            )}
            <button
              type="button"
              className="ov-btn-primary w-full !py-2 text-xs"
              onClick={() => {
                if (pin.trim() !== vaultPin) {
                  setError('Грешен PIN')
                  return
                }
                setError(null)
                setPin('')
                onUnlock(Date.now() + 10 * 60 * 1000)
              }}
            >
              <Unlock className="h-3.5 w-3.5" />
              Отключи за 10 мин
            </button>
            <label className="block text-xs">
              <span className="mb-1 block text-[var(--muted)]">Смени PIN</span>
              <input
                className="ov-field"
                value={vaultPin}
                onChange={(e) => onChangePin(e.target.value.slice(0, 8))}
              />
            </label>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-[var(--panel-border)] px-4 py-2">
              {(
                [
                  ['all', 'Всички'],
                  ['open', 'Отворени'],
                  ['locked', 'Eyes Only'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    filter === id
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'bg-[var(--chip)] text-[var(--muted)]'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                className="ml-auto ov-btn-ghost !px-2 !py-1 text-[11px]"
                onClick={onLock}
              >
                <Lock className="h-3 w-3" />
                Заключи
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {visible.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[var(--panel-border)] bg-[var(--chip)]/50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold">
                        {item.locked ? '🔐 ' : ''}
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">
                        {item.kind}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-rose-500"
                      onClick={() => onDelete(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {item.mediaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.mediaUrl}
                      alt=""
                      className="mt-2 max-h-36 w-full rounded-xl object-cover"
                    />
                  ) : null}
                  <p className="mt-2 text-sm">{item.body}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[var(--panel)] px-2 py-0.5 text-[10px] text-[var(--muted)]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
              {!visible.length ? (
                <p className="py-8 text-center text-xs text-[var(--muted)]">
                  Няма записи в тази категория.
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
