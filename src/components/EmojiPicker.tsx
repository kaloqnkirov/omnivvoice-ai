'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import {
  EMOJI_GROUPS,
  loadRecentEmojis,
  pushRecentEmoji,
  searchEmojis,
} from '@/lib/emoji-data'

type Props = {
  open: boolean
  onClose: () => void
  onPick: (emoji: string) => void
}

export default function EmojiPicker({ open, onClose, onPick }: Props) {
  const [tab, setTab] = useState(EMOJI_GROUPS[0].id)
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<string[]>(() => loadRecentEmojis())

  useEffect(() => {
    if (open) {
      setRecent(loadRecentEmojis())
      setQuery('')
    }
  }, [open])

  const searchHits = useMemo(
    () => (query.trim() ? searchEmojis(query) : []),
    [query]
  )

  const activeGroup = EMOJI_GROUPS.find((g) => g.id === tab) || EMOJI_GROUPS[0]
  const list = query.trim()
    ? searchHits
    : tab === 'recent'
      ? recent
      : activeGroup.emojis

  if (!open) return null

  return (
    <div className="absolute bottom-full left-0 z-40 mb-2 w-[min(94vw,360px)] overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] shadow-2xl">
      <div className="flex items-center gap-2 border-b border-[var(--panel-border)] px-3 py-2">
        <Search className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
        <input
          className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--muted)]"
          placeholder="Търси емоджи или категория…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <button
          type="button"
          className="text-[11px] text-[var(--muted)] hover:text-[var(--foreground)]"
          onClick={onClose}
        >
          Затвори
        </button>
      </div>

      {!query.trim() ? (
        <div className="flex gap-0.5 overflow-x-auto border-b border-[var(--panel-border)] px-1.5 py-1.5">
          {EMOJI_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              title={g.label}
              onClick={() => setTab(g.id)}
              className={`rounded-lg px-2 py-1 text-base ${
                tab === g.id
                  ? 'bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/35'
                  : 'hover:bg-[var(--chip)]'
              }`}
            >
              {g.icon}
            </button>
          ))}
        </div>
      ) : null}

      <div className="max-h-56 overflow-y-auto p-2">
        <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {query.trim()
            ? `Резултати (${list.length})`
            : tab === 'recent'
              ? 'Често използвани'
              : activeGroup.label}
        </p>
        {list.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-[var(--muted)]">
            Няма емоджи по това търсене
          </p>
        ) : (
          <div className="grid grid-cols-8 gap-0.5">
            {list.map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                type="button"
                className="rounded-lg p-1.5 text-xl leading-none hover:bg-[var(--chip)]"
                onClick={() => {
                  pushRecentEmoji(emoji)
                  setRecent(loadRecentEmojis())
                  onPick(emoji)
                  onClose()
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
