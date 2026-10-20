import { NextRequest, NextResponse } from 'next/server'
import { isBackendEnabled } from '@/lib/backend'
import { getSessionUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  if (!isBackendEnabled()) {
    return NextResponse.json({ backend: false, rooms: [] })
  }
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('*, room_participants(*), messages(id, body, created_at, sender_name)')
    .eq('host_id', session.user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ backend: true, rooms: data || [] })
}

export async function POST(request: NextRequest) {
  if (!isBackendEnabled()) {
    return NextResponse.json({ error: 'Backend not configured' }, { status: 503 })
  }
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    title?: string
    channel?: 'chat' | 'call' | 'both'
  }
  const title = body.title?.trim() || 'Conversation'
  const channel = body.channel || 'both'
  const livekitRoom = `ov_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`

  const supabase = await createClient()
  const { data: room, error } = await supabase
    .from('rooms')
    .insert({
      host_id: session.user.id,
      title,
      channel,
      session_open: true,
      livekit_room: livekitRoom,
    })
    .select('*')
    .single()

  if (error || !room) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create room' },
      { status: 500 }
    )
  }

  await supabase.from('room_participants').insert({
    room_id: room.id,
    user_id: session.user.id,
    display_name: session.user.displayName,
    language: session.user.nativeLanguage,
    role: 'host',
    is_active: true,
  })

  return NextResponse.json({ room }, { status: 201 })
}
