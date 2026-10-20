'use client'

import { Briefcase, Clapperboard, Sparkles } from 'lucide-react'
import { QUICK_REACTIONS, type RichChatPayload } from '@/lib/chat-media'

export type RichMessage = {
  id: string
  fromMe: boolean
  text: string
  createdAt: string
  status?: 'sent' | 'delivered' | 'read'
  translatedText?: string
} & RichChatPayload

type Props = {
  msg: RichMessage
  timeLabel?: string
  onReact?: (messageId: string, emoji: string) => void
  onReply?: (messageId: string, preview: string) => void
  onVote?: (messageId: string, optionId: string) => void
  enableReactions?: boolean
}

export default function RichMessageBubble({
  msg,
  timeLabel,
  onReact,
  onReply,
  onVote,
  enableReactions = true,
}: Props) {
  const preview =
    msg.kind === 'gif'
      ? 'GIF'
      : msg.kind === 'sticker'
        ? 'Стикер'
        : msg.kind === 'voice'
          ? `🎤 ${msg.voiceDurationSec || 0}s`
          : msg.kind === 'poll'
            ? `📊 ${msg.poll?.question || 'Анкета'}`
            : msg.kind === 'deal'
              ? `💼 ${msg.deal?.title || 'Сделка'}`
              : msg.kind === 'clip'
                ? `🎬 ${msg.clip?.label || 'Клип'}`
                : msg.text

  return (
    <div className={`group flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
          msg.fromMe
            ? 'rounded-br-md bg-[var(--accent)] text-[var(--accent-ink)]'
            : 'rounded-bl-md border border-[var(--panel-border)] bg-[var(--panel)]'
        }`}
      >
        {msg.replyPreview ? (
          <p
            className={`mb-1.5 rounded-lg px-2 py-1 text-[11px] ${
              msg.fromMe ? 'bg-black/10' : 'bg-[var(--chip)] text-[var(--muted)]'
            }`}
          >
            ↪ {msg.replyPreview}
          </p>
        ) : null}

        {msg.kind === 'gif' && msg.mediaUrl ? (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={msg.mediaUrl}
              alt={msg.caption || 'GIF'}
              className="max-h-48 w-full rounded-xl object-cover"
            />
            {msg.caption ? (
              <p className="mt-1.5 text-xs opacity-90">
                <Sparkles className="mr-1 inline h-3 w-3" />
                {msg.caption}
              </p>
            ) : null}
          </div>
        ) : null}

        {msg.kind === 'sticker' && msg.mediaUrl ? (
          <p className="text-5xl leading-none">{msg.mediaUrl}</p>
        ) : null}

        {msg.kind === 'image' && msg.mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={msg.mediaUrl}
            alt="attachment"
            className="max-h-56 w-full rounded-xl object-cover"
          />
        ) : null}

        {msg.kind === 'voice' && msg.mediaUrl ? (
          <div className="space-y-1">
            <audio controls src={msg.mediaUrl} className="max-w-full" />
            <p className="text-[10px] opacity-80">
              Гласова бележка · {msg.voiceDurationSec || 0}s
            </p>
          </div>
        ) : null}

        {msg.kind === 'poll' && msg.poll ? (
          <div className="min-w-[220px] space-y-2">
            <p className="font-semibold">{msg.poll.question}</p>
            {msg.poll.options.map((opt) => {
              const total = msg.poll!.options.reduce((s, o) => s + o.votes, 0) || 1
              const pct = Math.round((opt.votes / total) * 100)
              const selected = msg.poll!.votedOptionId === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={Boolean(msg.poll!.votedOptionId) || !onVote}
                  onClick={() => onVote?.(msg.id, opt.id)}
                  className={`relative w-full overflow-hidden rounded-xl px-2.5 py-2 text-left text-xs ${
                    selected
                      ? 'ring-1 ring-white/50'
                      : msg.fromMe
                        ? 'bg-black/10'
                        : 'bg-[var(--chip)]'
                  }`}
                >
                  <span
                    className="absolute inset-y-0 left-0 bg-white/20"
                    style={{ width: `${pct}%` }}
                  />
                  <span className="relative flex justify-between gap-2">
                    <span>{opt.label}</span>
                    <span>{pct}%</span>
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}

        {msg.kind === 'deal' && msg.deal ? (
          <div className="min-w-[200px] space-y-1">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-80">
              <Briefcase className="h-3 w-3" />
              Deal card
            </p>
            <p className="font-semibold">{msg.deal.title}</p>
            <p className="text-xs opacity-90">
              {msg.deal.value} · {msg.deal.stage}
            </p>
          </div>
        ) : null}

        {msg.kind === 'clip' && msg.clip ? (
          <div className="flex items-center gap-2">
            <Clapperboard className="h-4 w-4" />
            <div>
              <p className="font-semibold">{msg.clip.label}</p>
              <p className="text-[10px] opacity-80">
                Маркер @ {msg.clip.atSec}s · готов за 9:16 short
              </p>
            </div>
          </div>
        ) : null}

        {!msg.kind && msg.text ? <p>{msg.text}</p> : null}
        {msg.kind === 'image' && msg.text ? (
          <p className="mt-1.5 text-xs opacity-90">{msg.text}</p>
        ) : null}

        {msg.translatedText ? (
          <p
            className={`mt-1 border-t pt-1 text-xs ${
              msg.fromMe
                ? 'border-black/10 opacity-90'
                : 'border-[var(--panel-border)] text-[var(--muted)]'
            }`}
          >
            <Sparkles className="mr-1 inline h-3 w-3" />
            {msg.translatedText}
          </p>
        ) : null}

        <div className="mt-1 flex items-center justify-between gap-2">
          <p
            className={`text-[10px] ${
              msg.fromMe ? 'opacity-70' : 'text-[var(--muted)]'
            }`}
          >
            {timeLabel || ''}
            {msg.fromMe && msg.status ? ` · ${msg.status}` : ''}
          </p>
          {onReply ? (
            <button
              type="button"
              className="text-[10px] opacity-0 transition group-hover:opacity-80"
              onClick={() => onReply(msg.id, preview.slice(0, 80))}
            >
              Reply
            </button>
          ) : null}
        </div>

        {msg.reactions && Object.keys(msg.reactions).length ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {Object.entries(msg.reactions).map(([emoji, count]) => (
              <span
                key={emoji}
                className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                  msg.fromMe ? 'bg-black/15' : 'bg-[var(--chip)]'
                }`}
              >
                {emoji} {count}
              </span>
            ))}
          </div>
        ) : null}

        {enableReactions && onReact ? (
          <div className="absolute -bottom-3 left-2 flex gap-0.5 rounded-full border border-[var(--panel-border)] bg-[var(--panel)] px-1 py-0.5 opacity-0 shadow-lg transition group-hover:opacity-100">
            {QUICK_REACTIONS.slice(0, 6).map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="rounded px-0.5 text-xs hover:scale-110"
                onClick={() => onReact(msg.id, emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
