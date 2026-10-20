'use client'

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: 'Често',
    emojis: ['😀', '😂', '😍', '🤔', '👍', '👏', '🔥', '❤️', '✅', '🎉'],
  },
  {
    label: 'Реакции',
    emojis: ['😮', '😢', '😡', '🙏', '💪', '🙌', '✨', '⭐', '💯', '👀'],
  },
  {
    label: 'Работа',
    emojis: ['💼', '📌', '📎', '🗓️', '⏰', '💡', '📊', '🖥️', '☎️', '📝'],
  },
]

type Props = {
  open: boolean
  onClose: () => void
  onPick: (emoji: string) => void
}

export default function EmojiPicker({ open, onClose, onPick }: Props) {
  if (!open) return null

  return (
    <div className="absolute bottom-full left-0 z-30 mb-2 w-72 overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-3 py-2">
        <p className="text-xs font-semibold">Емоджи</p>
        <button
          type="button"
          className="text-[11px] text-[var(--muted)] hover:text-[var(--foreground)]"
          onClick={onClose}
        >
          Затвори
        </button>
      </div>
      <div className="max-h-52 space-y-3 overflow-y-auto p-3">
        {EMOJI_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              {group.label}
            </p>
            <div className="grid grid-cols-8 gap-1">
              {group.emojis.map((emoji) => (
                <button
                  key={`${group.label}-${emoji}`}
                  type="button"
                  className="rounded-lg p-1.5 text-lg hover:bg-[var(--chip)]"
                  onClick={() => {
                    onPick(emoji)
                    onClose()
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
