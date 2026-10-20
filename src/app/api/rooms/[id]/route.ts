import { NextRequest, NextResponse } from 'next/server'
import { isBackendEnabled } from '@/lib/backend'
import { getSessionUser } from '@/lib/auth/get-user'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  if (!isBackendEnabled()) {
    return NextResponse.json({ error: 'Backend not configured' }, { status: 503 })
  }
  const { id } = await params
  const supabase = await createClient()
  const { data: room, error } = await supabase
    .from('rooms')
    .select('*, room_participants(*)')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!room) {
    // Guests may need admin read via invite flow — return minimal public status
    try {
      const admin = getSupabaseAdmin()
      const { data } = await admin
        .from('rooms')
        .select('id, title, session_open, channel, livekit_room, host_id, room_participants(*)')
        .eq('id', id)
        .maybeSingle()
      if (!data) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json({ room: data })
    } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }
  return NextResponse.json({ room })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!isBackendEnabled()) {
    return NextResponse.json({ error: 'Backend not configured' }, { status: 503 })
  }
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as {
    session_open?: boolean
    title?: string
  }

  const supabase = await createClient()
  const { data: room, error } = await supabase
    .from('rooms')
    .update({
      ...(typeof body.session_open === 'boolean'
        ? { session_open: body.session_open }
        : {}),
      ...(body.title ? { title: body.title } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('host_id', session.user.id)
    .select('*')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!room) {
    return NextResponse.json({ error: 'Not found or not host' }, { status: 404 })
  }

  // Kick guests when session ends
  if (body.session_open === false) {
    await supabase
      .from('room_participants')
      .update({ is_active: false, left_at: new Date().toISOString() })
      .eq('room_id', id)
      .eq('role', 'guest')
  }

  return NextResponse.json({ room })
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  if (!isBackendEnabled()) {
    return NextResponse.json({ error: 'Backend not configured' }, { status: 503 })
  }
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  try {
    const admin = getSupabaseAdmin()
    const { data: room } = await admin
      .from('rooms')
      .select('id, host_id')
      .eq('id', id)
      .maybeSingle()

    if (!room) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (room.host_id !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await admin.from('invites').delete().eq('room_id', id)
    await admin.from('messages').delete().eq('room_id', id)
    await admin.from('room_participants').delete().eq('room_id', id)
    const { error } = await admin.from('rooms').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
