import { NextRequest, NextResponse } from 'next/server'
import { isBackendEnabled } from '@/lib/backend'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  if (!isBackendEnabled()) {
    return NextResponse.json({ error: 'Backend not configured' }, { status: 503 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    code?: string
    siteKey?: string
    displayName?: string
    language?: string
    guestId?: string
  }

  const displayName = body.displayName?.trim()
  const language = body.language?.trim() || 'bg'
  const guestId = body.guestId || `guest_${crypto.randomUUID().replace(/-/g, '')}`

  if (!displayName) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  }

  try {
    const admin = getSupabaseAdmin()
    let roomId: string | null = null
    let inviteCode = body.code || ''
    let channel: 'chat' | 'call' | 'both' = 'both'
    let prefillName: string | null = null
    let prefillLanguage: string | null = null

    if (body.code) {
      const { data: invite } = await admin
        .from('invites')
        .select('*')
        .eq('code', body.code)
        .eq('active', true)
        .maybeSingle()

      if (!invite) {
        return NextResponse.json({ error: 'Invalid invite' }, { status: 404 })
      }
      roomId = invite.room_id
      channel = invite.channel
      prefillName = invite.prefill_name
      prefillLanguage = invite.prefill_language
      inviteCode = invite.code
    } else if (body.siteKey) {
      const { data: widget } = await admin
        .from('site_widgets')
        .select('*')
        .eq('site_key', body.siteKey)
        .eq('active', true)
        .maybeSingle()
      if (!widget?.room_id) {
        return NextResponse.json({ error: 'Invalid site key' }, { status: 404 })
      }
      roomId = widget.room_id
      inviteCode = `site_${body.siteKey}`
    } else {
      return NextResponse.json({ error: 'Invite or site key required' }, { status: 400 })
    }

    const { data: room } = await admin
      .from('rooms')
      .select('*')
      .eq('id', roomId!)
      .maybeSingle()

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    if (!room.session_open) {
      return NextResponse.json({ error: 'Host ended the session' }, { status: 403 })
    }

    await admin.from('room_participants').insert({
      room_id: room.id,
      guest_id: guestId,
      display_name: displayName,
      language: prefillLanguage || language,
      role: 'guest',
      is_active: true,
    })

    // Re-open if needed
    await admin
      .from('rooms')
      .update({ session_open: true, updated_at: new Date().toISOString() })
      .eq('id', room.id)

    return NextResponse.json({
      guestId,
      roomId: room.id,
      livekitRoom: room.livekit_room,
      channel,
      displayName,
      language: prefillLanguage || language,
      inviteCode,
      prefillName,
      sessionOpen: room.session_open,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Join failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  if (!isBackendEnabled()) {
    return NextResponse.json({ backend: false })
  }
  const code = request.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.json({ error: 'code required' }, { status: 400 })
  }
  try {
    const admin = getSupabaseAdmin()
    const { data: invite } = await admin
      .from('invites')
      .select('code, label, channel, prefill_name, prefill_language, active, room_id, rooms(session_open, title)')
      .eq('code', code)
      .maybeSingle()
    if (!invite || !invite.active) {
      return NextResponse.json({ error: 'Invalid invite' }, { status: 404 })
    }
    return NextResponse.json({ invite, backend: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
