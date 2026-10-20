'use client'

import { useRef, useState } from 'react'
import {
  Clapperboard,
  ImagePlus,
  Paperclip,
  SendHorizontal,
  Smile,
  Sticker,
} from 'lucide-react'
import EmojiPicker from '@/components/EmojiPicker'
import MediaPicker from '@/components/MediaPicker'
import VoiceNoteButton from '@/components/VoiceNoteButton'
import {
  bilingualCaption,
  type CatalogItem,
} from '@/lib/chat-media'
import type { RichMessage } from '@/components/RichMessageBubble'

type Props = {
  draft: string
  onDraftChange: (value: string) => void
  onSend: (message: Omit<RichMessage, 'id' | 'createdAt' | 'fromMe' | 'status'>) => void
  enterToSend?: boolean
  peerLanguage?: string
  replyPreview?: string | null
  onClearReply?: () => void
  showDeal?: boolean
  showClip?: boolean
  allowVoice?: boolean
  clipAtSec?: number
  placeholder?: string
}

export default function ChatComposer({
  draft,
  onDraftChange,
  onSend,
  enterToSend = true,
  peerLanguage = 'bg',
  replyPreview,
  onClearReply,
  showDeal = true,
  showClip = false,
  allowVoice = true,
  clipAtSec = 0,
  placeholder = 'Напиши съобщение…',
}: Props) {
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [mediaOpen, setMediaOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const attachRef = useRef<HTMLInputElement>(null)

  function sendText() {
    const text = draft.trim()
    if (!text) return
    onSend({
      text,
      replyPreview: replyPreview || undefined,
    })
    onDraftChange('')
    onClearReply?.()
  }

  function sendGif(item: CatalogItem) {
    onSend({
      text: item.label,
      kind: 'gif',
      mediaUrl: item.url,
      caption: bilingualCaption(item.label, peerLanguage),
      replyPreview: replyPreview || undefined,
    })
    onClearReply?.()
  }

  function sendSticker(item: CatalogItem) {
    onSend({
      text: item.label,
      kind: 'sticker',
      mediaUrl: item.url,
      replyPreview: replyPreview || undefined,
    })
    onClearReply?.()
  }

  return (
    <div className="space-y-2">
      {replyPreview ? (
        <div className="flex items-center justify-between rounded-xl bg-[var(--chip)] px-3 py-1.5 text-[11px] text-[var(--muted)]">
          <span>↪ {replyPreview}</span>
          <button type="button" onClick={onClearReply}>
            ✕
          </button>
        </div>
      ) : null}

      <div className="relative flex items-end gap-1.5">
        <div className="relative">
          <button
            type="button"
            className="ov-icon-btn"
            title="GIF / стикери / анкета"
            onClick={() => {
              setMediaOpen((v) => !v)
              setEmojiOpen(false)
            }}
          >
            <Sticker className="h-4 w-4" />
          </button>
          <MediaPicker
            open={mediaOpen}
            onClose={() => setMediaOpen(false)}
            onPickGif={sendGif}
            onPickSticker={sendSticker}
            showDeal={showDeal}
            onCreatePoll={(question, options) => {
              onSend({
                text: `📊 ${question}`,
                kind: 'poll',
                poll: {
                  question,
                  options: options.map((label, i) => ({
                    id: `o${i}`,
                    label,
                    votes: 0,
                  })),
                },
              })
            }}
            onCreateDeal={(title, value, stage) => {
              onSend({
                text: `💼 ${title}`,
                kind: 'deal',
                deal: { title, value, stage },
              })
            }}
          />
        </div>

        <div className="relative">
          <button
            type="button"
            className="ov-icon-btn"
            title="Емоджи"
            onClick={() => {
              setEmojiOpen((v) => !v)
              setMediaOpen(false)
            }}
          >
            <Smile className="h-4 w-4" />
          </button>
          <EmojiPicker
            open={emojiOpen}
            onClose={() => setEmojiOpen(false)}
            onPick={(emoji) => onDraftChange(`${draft}${emoji}`)}
          />
        </div>

        <button
          type="button"
          className="ov-icon-btn"
          title="Снимка"
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = () => {
              if (typeof reader.result === 'string') {
                onSend({
                  text: file.name,
                  kind: 'image',
                  mediaUrl: reader.result,
                })
              }
            }
            reader.readAsDataURL(file)
            e.target.value = ''
          }}
        />

        <button
          type="button"
          className="ov-icon-btn"
          title="Файл"
          onClick={() => attachRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <input
          ref={attachRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            if (file.type.startsWith('image/')) {
              const reader = new FileReader()
              reader.onload = () => {
                if (typeof reader.result === 'string') {
                  onSend({
                    text: file.name,
                    kind: 'image',
                    mediaUrl: reader.result,
                  })
                }
              }
              reader.readAsDataURL(file)
            } else {
              onSend({
                text: `📎 ${file.name} (${Math.round(file.size / 1024)} KB)`,
              })
            }
            e.target.value = ''
          }}
        />

        {allowVoice ? (
          <VoiceNoteButton
            onRecorded={({ dataUrl, durationSec }) => {
              onSend({
                text: `🎤 Гласова бележка (${durationSec}s)`,
                kind: 'voice',
                mediaUrl: dataUrl,
                voiceDurationSec: durationSec,
              })
            }}
          />
        ) : null}

        {showClip ? (
          <button
            type="button"
            className="ov-icon-btn"
            title="Маркирай клип за short"
            onClick={() =>
              onSend({
                text: '🎬 Clip marker',
                kind: 'clip',
                clip: {
                  label: 'Auto 9:16 clip',
                  atSec: clipAtSec || Math.floor(Date.now() / 1000) % 3600,
                },
              })
            }
          >
            <Clapperboard className="h-4 w-4" />
          </button>
        ) : null}

        <textarea
          className="ov-field max-h-28 min-h-[44px] flex-1 resize-none"
          rows={1}
          placeholder={placeholder}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (enterToSend && e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendText()
            }
          }}
        />
        <button
          type="button"
          className="ov-btn-primary !rounded-2xl !px-3"
          onClick={sendText}
          disabled={!draft.trim()}
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
