'use client'

import {
  Bot,
  Briefcase,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from 'lucide-react'

type BusinessOverlayProps = {
  visible: boolean
  salesAssistOn: boolean
  prompt: string
  sentiment: number
  battleCards: string[]
  crmStatus: {
    salesforce: 'synced' | 'syncing' | 'idle'
    hubspot: 'synced' | 'syncing' | 'idle'
  }
}

function CrmPill({
  label,
  status,
}: {
  label: string
  status: 'synced' | 'syncing' | 'idle'
}) {
  const tone =
    status === 'synced'
      ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/25'
      : status === 'syncing'
        ? 'bg-sky-500/15 text-sky-300 ring-sky-400/25'
        : 'bg-slate-500/15 text-slate-300 ring-slate-400/20'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${tone}`}
    >
      {status === 'syncing' ? (
        <RefreshCw className="h-3 w-3 animate-spin" />
      ) : (
        <Briefcase className="h-3 w-3" />
      )}
      {label} · {status === 'synced' ? 'Synced' : status === 'syncing' ? 'Syncing' : 'Idle'}
    </span>
  )
}

export default function BusinessOverlay({
  visible,
  salesAssistOn,
  prompt,
  sentiment,
  battleCards,
  crmStatus,
}: BusinessOverlayProps) {
  if (!visible) return null

  const sentimentPct = Math.round(Math.max(0, Math.min(1, sentiment)) * 100)
  const sentimentLabel =
    sentimentPct >= 70 ? 'Positive' : sentimentPct >= 40 ? 'Neutral' : 'Cautious'

  return (
    <>
      <div className="absolute left-4 top-4 z-20 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-400/25">
          <Bot className="h-3 w-3" />
          AI Receptionist · Online 24/7
        </span>
        <CrmPill label="Salesforce" status={crmStatus.salesforce} />
        <CrmPill label="HubSpot" status={crmStatus.hubspot} />
      </div>

      {salesAssistOn && (
        <div className="absolute bottom-24 right-4 z-20 flex w-[min(100%,280px)] flex-col gap-2 sm:bottom-28 sm:right-6">
          <div className="rounded-2xl border border-amber-400/25 bg-amber-950/45 p-3 backdrop-blur">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
              <Sparkles className="h-3.5 w-3.5" />
              Real-time AI sales prompt
            </p>
            <p className="mt-1.5 text-sm text-amber-50">{prompt}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/55 p-3 backdrop-blur">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
              <TrendingUp className="h-3.5 w-3.5" />
              Sentiment meter · {sentimentLabel}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-400 transition-all duration-500"
                style={{ width: `${sentimentPct}%` }}
              />
            </div>
            <p className="mt-1 text-right text-[11px] text-slate-400">
              {sentimentPct}%
            </p>
          </div>

          <div className="rounded-2xl border border-indigo-400/20 bg-indigo-950/40 p-3 backdrop-blur">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200">
              Battle cards
            </p>
            <ul className="mt-2 space-y-1.5">
              {battleCards.map((card) => (
                <li
                  key={card}
                  className="rounded-lg bg-white/5 px-2 py-1.5 text-[11px] text-slate-100"
                >
                  {card}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
