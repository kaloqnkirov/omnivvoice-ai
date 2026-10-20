'use client'

import { useEffect, useRef } from 'react'
import type { LucideIcon } from 'lucide-react'

export type ContextMenuItem = {
  id: string
  label: string
  icon?: LucideIcon
  danger?: boolean
  disabled?: boolean
  separator?: boolean
  onClick?: () => void
}

type Props = {
  x: number
  y: number
  open: boolean
  items: ContextMenuItem[]
  onClose: () => void
}

export default function ContextMenu({ x, y, open, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open || !ref.current) return
    const el = ref.current
    const rect = el.getBoundingClientRect()
    const pad = 8
    let left = x
    let top = y
    if (left + rect.width > window.innerWidth - pad) {
      left = window.innerWidth - rect.width - pad
    }
    if (top + rect.height > window.innerHeight - pad) {
      top = window.innerHeight - rect.height - pad
    }
    el.style.left = `${Math.max(pad, left)}px`
    el.style.top = `${Math.max(pad, top)}px`
  }, [open, x, y, items])

  if (!open) return null

  return (
    <div
      ref={ref}
      className="fixed z-[80] min-w-[220px] overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] py-1 shadow-2xl"
      style={{ left: x, top: y }}
      role="menu"
    >
      {items.map((item) =>
        item.separator ? (
          <div
            key={item.id}
            className="my-1 border-t border-[var(--panel-border)]"
          />
        ) : (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium disabled:opacity-40 ${
              item.danger
                ? 'text-rose-500 hover:bg-rose-500/10'
                : 'text-[var(--foreground)] hover:bg-[var(--chip)]'
            }`}
            onClick={() => {
              if (item.disabled) return
              item.onClick?.()
              onClose()
            }}
          >
            {item.icon ? <item.icon className="h-3.5 w-3.5 opacity-70" /> : null}
            {item.label}
          </button>
        )
      )}
    </div>
  )
}
