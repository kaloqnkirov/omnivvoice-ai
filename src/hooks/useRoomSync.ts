'use client'

import { useEffect, useState } from 'react'
import { tryCreateClient } from '@/lib/supabase/client'
import type { MessageRow, ParticipantRow, RoomRow } from '@/lib/supabase/types'

type RoomPayload = RoomRow & {
  room_participants?: ParticipantRow[]
}

export function useRoomSync(roomId: string | undefined, enabled = true) {
  const [room, setRoom] = useState<RoomPayload | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roomId || !enabled) {
      setLoading(false)
      return
    }

    let cancelled = false
    const supabase = tryCreateClient()

    async function load() {
      setLoading(true)
      const [roomRes, msgRes] = await Promise.all([
        fetch(`/api/rooms/${roomId}`, { credentials: 'include' }),
        fetch(`/api/rooms/${roomId}/messages`, { credentials: 'include' }),
      ])
      if (cancelled) return
      if (roomRes.ok) {
        const data = (await roomRes.json()) as { room?: RoomPayload }
        setRoom(data.room || null)
      }
      if (msgRes.ok) {
        const data = (await msgRes.json()) as { messages?: MessageRow[] }
        setMessages(data.messages || [])
      }
      setLoading(false)
    }

    void load()

    if (!supabase) {
      const poll = window.setInterval(() => void load(), 2500)
      return () => {
        cancelled = true
        window.clearInterval(poll)
      }
    }

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => {
              const row = payload.new as MessageRow
              if (prev.some((m) => m.id === row.id)) return prev
              return [...prev, row]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          setRoom((prev) =>
            prev ? { ...prev, ...(payload.new as RoomRow) } : (payload.new as RoomPayload)
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void load()
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [roomId, enabled])

  async function sendMessage(input: {
    text: string
    guestId?: string
    guestName?: string
    translatedText?: string
  }) {
    if (!roomId) return
    const res = await fetch(`/api/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      throw new Error(data.error || 'Send failed')
    }
  }

  async function endSession() {
    if (!roomId) return
    await fetch(`/api/rooms/${roomId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ session_open: false }),
    })
  }

  return { room, messages, loading, sendMessage, endSession, setRoom }
}
