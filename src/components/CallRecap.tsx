'use client'

import { CheckCircle2, ListTodo, X } from 'lucide-react'

export type CallRecapData = {
  title: string
  summary: string
  actionItems: string[]
  keyPhrases: Array<{ source: string; target: string }>
  durationLabel: string
}

type CallRecapProps = {
  open: boolean
  data: CallRecapData | null
  onClose: () => void
  onCopy: () => void
}

export default function CallRecap({
  open,
  data,
  onClose,
  onCopy,
}: CallRecapProps) {
  if (!open || !data) return null

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
      <div className="ov-panel w-full max-w-lg rounded-[28px] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="ov-kicker">Call recap</p>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              {data.title}
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Продължителност · {data.durationLabel}
            </p>
          </div>
          <button type="button" className="ov-icon-btn" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-[var(--foreground)]">
          {data.summary}
        </p>

        <div className="mt-4 rounded-2xl border border-[var(--panel-border)] bg-[var(--chip)] p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            <ListTodo className="h-3.5 w-3.5" />
            Action items
          </p>
          <ul className="mt-2 space-y-1.5">
            {data.actionItems.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-sm text-[var(--foreground)]"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--accent)]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Ключови фрази (два езика)
          </p>
          {data.keyPhrases.map((phrase) => (
            <div
              key={phrase.source}
              className="rounded-xl border border-[var(--panel-border)] px-3 py-2 text-sm"
            >
              <p>{phrase.source}</p>
              <p className="mt-1 text-[var(--muted)]">{phrase.target}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <button type="button" className="ov-btn-primary flex-1" onClick={onCopy}>
            Копирай резюме
          </button>
          <button type="button" className="ov-btn-ghost flex-1" onClick={onClose}>
            Затвори
          </button>
        </div>
      </div>
    </div>
  )
}

export function buildLocalRecap(input: {
  modeLabel: string
  sourceLang: string
  targetLang: string
  sourceSnippet: string
  targetSnippet: string
  minutes: number
}): CallRecapData {
  return {
    title: `${input.modeLabel} session recap`,
    durationLabel: `${Math.max(1, input.minutes)} мин`,
    summary: `Разговорът премина с live превод ${input.sourceLang} → ${input.targetLang}. Основният тон беше конструктивен; ключовите теми са следващи стъпки и подравняване на очакванията.`,
    actionItems: [
      'Изпрати follow-up на двата езика',
      'Потвърди следващ слот / demo',
      'Запази ключовите фрази в Phrasebook',
    ],
    keyPhrases: [
      {
        source: input.sourceSnippet || 'Нека подравним следващите стъпки.',
        target:
          input.targetSnippet || 'Let’s align on the next steps.',
      },
      {
        source: 'Можем да започнем пилот тази седмица.',
        target: 'We can start a pilot this week.',
      },
    ],
  }
}
