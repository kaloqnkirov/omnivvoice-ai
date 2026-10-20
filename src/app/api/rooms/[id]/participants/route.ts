import { NextRequest, NextResponse } from 'next/server'
import { isBackendEnabled } from '@/lib/backend'
import { getSessionUser } from '@/lib/auth/get-user'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

type Params = { params: Promise<{ id: string }> }

/** Host removes a participant, or a guest/self leaves the room */
export async function POST(request: NextRequest, { params }: Params) {
  if (!isBackendEnabled()) {
    return NextResponse.json({ error: 'Backend not configured' }, { status: 503 })
  }
  const { id: roomId } = await params
  const body = (await request.json().catch(() => ({}))) as {
    action?: 'remove' | 'leave'
    participantId?: string
    guestId?: string
  }

  const session = await getSessionUser()
  const admin = getSupabaseAdmin()

  const { data: room } = await admin
    .from('rooms')
    .select('id, host_id')
    .eq('id', roomId)
    .maybeSingle()

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  const isHost = Boolean(session && room.host_id === session.user.id)
  const leftAt = new Date().toISOString()
  const action = body.action || (body.guestId || !isHost ? 'leave' : 'remove')

  if (action === 'leave') {
    if (body.guestId) {
      const { error } = await admin
        .from('room_participants')
        .update({ is_active: false, left_at: leftAt })
        .eq('room_id', roomId)
        .eq('guest_id', body.guestId)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true, left: true })
    }
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (isHost) {
      return NextResponse.json(
        { error: 'Хостът трябва да приключи сесията' },
        { status: 400 }
      )
    }
    const { error } = await admin
      .from('room_participants')
      .update({ is_active: false, left_at: leftAt })
      .eq('room_id', roomId)
      .eq('user_id', session.user.id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, left: true })
  }

  // remove — host only
  if (!isHost) {
    return NextResponse.json({ error: 'Само хостът може да премахва' }, { status: 403 })
  }
  if (!body.participantId) {
    return NextResponse.json({ error: 'participantId required' }, { status: 400 })
  }

  const { error } = await admin
    .from('room_participants')
    .update({ is_active: false, left_at: leftAt })
    .eq('room_id', roomId)
    .eq('id', body.participantId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, removed: true })
}
