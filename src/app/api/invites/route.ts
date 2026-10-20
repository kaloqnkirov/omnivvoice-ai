import { NextRequest, NextResponse } from 'next/server'
import { isBackendEnabled, appUrl } from '@/lib/backend'
import { getSessionUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

function makeCode() {
  return `ov_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`
}

export async function GET() {
  if (!isBackendEnabled()) {
    return NextResponse.json({ backend: false, invites: [] })
  }
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('host_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ backend: true, invites: data || [] })
}

export async function POST(request: NextRequest) {
  if (!isBackendEnabled()) {
    return NextResponse.json({ error: 'Backend not configured' }, { status: 503 })
  }
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json(
      { error: 'Влез в акаунта си, за да създадеш покана.' },
      { status: 401 }
    )
  }

  const body = (await request.json().catch(() => ({}))) as {
    roomId?: string
    label?: string
    channel?: 'chat' | 'call' | 'both'
    prefillName?: string
    prefillLanguage?: string
    createRoom?: boolean
    roomTitle?: string
  }

  // Use service role so missing RLS / profile lag cannot break invite create.
  const admin = getSupabaseAdmin()
  let roomId = body.roomId

  if (!roomId && body.createRoom !== false) {
    const livekitRoom = `ov_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
    const { data: room, error } = await admin
      .from('rooms')
      .insert({
        host_id: session.user.id,
        title: body.roomTitle || body.label || 'Guest room',
        channel: body.channel || 'both',
        session_open: true,
        livekit_room: livekitRoom,
      })
      .select('*')
      .single()
    if (error || !room) {
      return NextResponse.json(
        {
          error:
            error?.message ||
            'Неуспешно създаване на стая. Провери профила и Supabase.',
        },
        { status: 500 }
      )
    }
    roomId = room.id
    await admin.from('room_participants').insert({
      room_id: room.id,
      user_id: session.user.id,
      display_name: session.user.displayName,
      language: session.user.nativeLanguage,
      role: 'host',
      is_active: true,
    })
  }

  if (!roomId) {
    return NextResponse.json({ error: 'roomId required' }, { status: 400 })
  }

  // Verify room belongs to host (or exists)
  const { data: existingRoom } = await admin
    .from('rooms')
    .select('id, host_id, session_open')
    .eq('id', roomId)
    .maybeSingle()

  if (!existingRoom) {
    return NextResponse.json({ error: 'Стаята не е намерена' }, { status: 404 })
  }
  if (existingRoom.host_id !== session.user.id && !session.user.isAdmin) {
    return NextResponse.json({ error: 'Нямаш достъп до тази стая' }, { status: 403 })
  }

  // Ensure session is open for guests
  if (!existingRoom.session_open) {
    await admin
      .from('rooms')
      .update({ session_open: true, updated_at: new Date().toISOString() })
      .eq('id', roomId)
  }

  const code = makeCode()
  const { data: invite, error } = await admin
    .from('invites')
    .insert({
      code,
      room_id: roomId,
      host_id: session.user.id,
      label: body.label || 'Guest invite',
      channel: body.channel || 'both',
      prefill_name: body.prefillName || null,
      prefill_language: body.prefillLanguage || null,
      active: true,
    })
    .select('*')
    .single()

  if (error || !invite) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          'Поканата не можа да се създаде. Опитай отново след вход.',
      },
      { status: 500 }
    )
  }

  const origin = appUrl(request.headers.get('origin'))
  const url = `${origin}/join?invite=${code}`

  return NextResponse.json({ invite, url, roomId }, { status: 201 })
}
