'use client'

import { useMemo, useState } from 'react'
import {
  GIF_CATALOG,
  STICKER_CATALOG,
  searchCatalog,
  type CatalogItem,
} from '@/lib/chat-media'

type Tab = 'gif' | 'sticker' | 'poll' | 'deal'

type Props = {
  open: boolean
  onClose: () => void
  onPickGif: (item: CatalogItem) => void
  onPickSticker: (item: CatalogItem) => void
  onCreatePoll: (question: string, options: string[]) => void
  onCreateDeal?: (title: string, value: string, stage: string) => void
  showDeal?: boolean
}

export default function MediaPicker({
  open,
  onClose,
  onPickGif,
  onPickSticker,
  onCreatePoll,
  onCreateDeal,
  showDeal = true,
}: Props) {
  const [tab, setTab] = useState<Tab>('gif')
  const [query, setQuery] = useState('')
  const [pollQ, setPollQ] = useState('')
  const [optA, setOptA] = useState('Да')
  const [optB, setOptB] = useState('Не')
  const [optC, setOptC] = useState('')
  const [dealTitle, setDealTitle] = useState('Нова сделка')
  const [dealValue, setDealValue] = useState('€2,400')
  const [dealStage, setDealStage] = useState('Discovery')

  const gifs = useMemo(
    () => searchCatalog(GIF_CATALOG, query),
    [query]
  )
  const stickers = useMemo(
    () => searchCatalog(STICKER_CATALOG, query),
    [query]
  )

  if (!open) return null

  const tabs: { id: Tab; label: string }[] = [
    { id: 'gif', label: 'GIF' },
    { id: 'sticker', label: 'Стикери' },
    { id: 'poll', label: 'Анкета' },
    ...(showDeal ? [{ id: 'deal' as const, label: 'Сделка' }] : []),
  ]

  return (
    <div className="absolute bottom-full left-0 z-40 mb-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-3 py-2">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                tab === t.id
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                  : 'bg-[var(--chip)] text-[var(--muted)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="text-[11px] text-[var(--muted)]"
          onClick={onClose}
        >
          Затвори
        </button>
      </div>

      {(tab === 'gif' || tab === 'sticker') && (
        <div className="border-b border-[var(--panel-border)] px-3 py-2">
          <input
            className="ov-field !py-1.5 text-xs"
            placeholder={tab === 'gif' ? 'Търси GIF…' : 'Търси стикер…'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      <div className="max-h-64 overflow-y-auto p-3">
        {tab === 'gif' ? (
          <div className="grid grid-cols-3 gap-2">
            {gifs.map((item) => (
              <button
                key={item.id}
                type="button"
                className="overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--chip)]"
                onClick={() => {
                  onPickGif(item)
                  onClose()
                }}
                title={item.label}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.label}
                  className="h-20 w-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
            {gifs.length === 0 ? (
              <p className="col-span-3 py-6 text-center text-xs text-[var(--muted)]">
                Няма GIF за тази дума
              </p>
            ) : null}
          </div>
        ) : null}

        {tab === 'sticker' ? (
          <div className="grid grid-cols-4 gap-2">
            {stickers.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex h-16 items-center justify-center rounded-xl bg-[var(--chip)] text-3xl hover:ring-1 hover:ring-[var(--accent)]/40"
                onClick={() => {
                  onPickSticker(item)
                  onClose()
                }}
                title={item.label}
              >
                {item.url}
              </button>
            ))}
          </div>
        ) : null}

        {tab === 'poll' ? (
          <div className="space-y-2">
            <p className="text-[11px] text-[var(--muted)]">
              Като WhatsApp / Teams — бърза анкета в чата
            </p>
            <input
              className="ov-field text-sm"
              placeholder="Въпрос…"
              value={pollQ}
              onChange={(e) => setPollQ(e.target.value)}
            />
            <input
              className="ov-field text-sm"
              placeholder="Опция A"
              value={optA}
              onChange={(e) => setOptA(e.target.value)}
            />
            <input
              className="ov-field text-sm"
              placeholder="Опция B"
              value={optB}
              onChange={(e) => setOptB(e.target.value)}
            />
            <input
              className="ov-field text-sm"
              placeholder="Опция C (по желание)"
              value={optC}
              onChange={(e) => setOptC(e.target.value)}
            />
            <button
              type="button"
              className="ov-btn-primary w-full !py-2 text-xs"
              onClick={() => {
                const options = [optA, optB, optC].map((o) => o.trim()).filter(Boolean)
                if (!pollQ.trim() || options.length < 2) return
                onCreatePoll(pollQ.trim(), options)
                onClose()
                setPollQ('')
              }}
            >
              Публикувай анкета
            </button>
          </div>
        ) : null}

        {tab === 'deal' && showDeal ? (
          <div className="space-y-2">
            <p className="text-[11px] text-[var(--muted)]">
              OmniVoice exclusive: CRM карта директно в чата
            </p>
            <input
              className="ov-field text-sm"
              value={dealTitle}
              onChange={(e) => setDealTitle(e.target.value)}
              placeholder="Заглавие"
            />
            <input
              className="ov-field text-sm"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
              placeholder="Стойност"
            />
            <select
              className="ov-field text-sm"
              value={dealStage}
              onChange={(e) => setDealStage(e.target.value)}
            >
              <option>Discovery</option>
              <option>Demo</option>
              <option>Proposal</option>
              <option>Negotiation</option>
              <option>Won</option>
            </select>
            <button
              type="button"
              className="ov-btn-primary w-full !py-2 text-xs"
              onClick={() => {
                onCreateDeal?.(dealTitle, dealValue, dealStage)
                onClose()
              }}
            >
              Изпрати deal карта
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
