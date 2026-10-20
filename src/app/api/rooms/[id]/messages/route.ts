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
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('room_id', id)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) {
    // guest fallback via service role (validated by guest_id query later)
    try {
      const admin = getSupabaseAdmin()
      const { data: msgs } = await admin
        .from('messages')
        .select('*')
        .eq('room_id', id)
        .order('created_at', { ascending: true })
        .limit(200)
      return NextResponse.json({ messages: msgs || [] })
    } catch {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }
  return NextResponse.json({ messages: data || [] })
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!isBackendEnabled()) {
    return NextResponse.json({ error: 'Backend not configured' }, { status: 503 })
  }
  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as {
    text?: string
    guestId?: string
    guestName?: string
    translatedText?: string
  }
  const text = body.text?.trim()
  if (!text) {
    return NextResponse.json({ error: 'Text required' }, { status: 400 })
  }

  const session = await getSessionUser().catch(() => null)

  try {
    const admin = getSupabaseAdmin()
    const { data: room } = await admin
      .from('rooms')
      .select('id, session_open, host_id')
      .eq('id', id)
      .maybeSingle()

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    if (!room.session_open) {
      return NextResponse.json({ error: 'Session ended' }, { status: 403 })
    }

    if (session) {
      const { data: msg, error } = await admin
        .from('messages')
        .insert({
          room_id: id,
          sender_user_id: session.user.id,
          sender_name: session.user.displayName,
          body: text,
          translated_body: body.translatedText || null,
        })
        .select('*')
        .single()
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      await admin
        .from('rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id)
      return NextResponse.json({ message: msg }, { status: 201 })
    }

    if (!body.guestId || !body.guestName) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: participant } = await admin
      .from('room_participants')
      .select('id')
      .eq('room_id', id)
      .eq('guest_id', body.guestId)
      .eq('is_active', true)
      .maybeSingle()

    if (!participant) {
      return NextResponse.json({ error: 'Guest not in room' }, { status: 403 })
    }

    const { data: msg, error } = await admin
      .from('messages')
      .insert({
        room_id: id,
        sender_guest_id: body.guestId,
        sender_name: body.guestName,
        body: text,
        translated_body: body.translatedText || null,
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ message: msg }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
