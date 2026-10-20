import { NextRequest, NextResponse } from 'next/server'
import { isBackendEnabled } from '@/lib/backend'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

function normalizeCode(raw: string | undefined) {
  return (raw || '').trim().replace(/^#/, '')
}

export async function POST(request: NextRequest) {
  if (!isBackendEnabled()) {
    return NextResponse.json(
      { error: 'Сървърът не е конфигуриран' },
      { status: 503 }
    )
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
  const guestId =
    body.guestId?.trim() || `guest_${crypto.randomUUID().replace(/-/g, '')}`
  const code = normalizeCode(body.code)
  const siteKey = body.siteKey?.trim()

  if (!displayName) {
    return NextResponse.json({ error: 'Въведи име или псевдоним' }, { status: 400 })
  }

  try {
    const admin = getSupabaseAdmin()
    let roomId: string | null = null
    let inviteCode = code
    let channel: 'chat' | 'call' | 'both' = 'both'
    let prefillName: string | null = null
    let prefillLanguage: string | null = null

    if (code) {
      const { data: invite, error: inviteError } = await admin
        .from('invites')
        .select('*')
        .eq('code', code)
        .eq('active', true)
        .maybeSingle()

      if (inviteError) {
        return NextResponse.json(
          { error: `Грешка при проверка на поканата: ${inviteError.message}` },
          { status: 500 }
        )
      }
      if (!invite) {
        return NextResponse.json(
          {
            error:
              'Поканата е невалидна или деактивирана. Помоли хоста за нов линк.',
          },
          { status: 404 }
        )
      }
      roomId = invite.room_id
      channel = invite.channel
      prefillName = invite.prefill_name
      prefillLanguage = invite.prefill_language
      inviteCode = invite.code
    } else if (siteKey) {
      const { data: widget } = await admin
        .from('site_widgets')
        .select('*')
        .eq('site_key', siteKey)
        .eq('active', true)
        .maybeSingle()
      if (!widget?.room_id) {
        return NextResponse.json(
          { error: 'Невалиден ключ за сайт' },
          { status: 404 }
        )
      }
      roomId = widget.room_id
      inviteCode = `site_${siteKey}`
    } else {
      return NextResponse.json(
        { error: 'Липсва код на покана' },
        { status: 400 }
      )
    }

    const { data: room } = await admin
      .from('rooms')
      .select('*')
      .eq('id', roomId!)
      .maybeSingle()

    if (!room) {
      return NextResponse.json(
        { error: 'Стаята не е намерена. Помоли хоста за нова покана.' },
        { status: 404 }
      )
    }
    if (!room.session_open) {
      return NextResponse.json(
        { error: 'Хостът е приключил сесията. Нужна е нова покана.' },
        { status: 403 }
      )
    }

    const { error: participantError } = await admin
      .from('room_participants')
      .insert({
        room_id: room.id,
        guest_id: guestId,
        display_name: displayName,
        language: language || prefillLanguage || 'bg',
        role: 'guest',
        is_active: true,
      })

    if (participantError) {
      // Allow re-join with same guest id
      if (!participantError.message.toLowerCase().includes('duplicate')) {
        return NextResponse.json(
          { error: `Неуспешен вход: ${participantError.message}` },
          { status: 500 }
        )
      }
      await admin
        .from('room_participants')
        .update({
          display_name: displayName,
          language: language || prefillLanguage || 'bg',
          is_active: true,
          left_at: null,
        })
        .eq('room_id', room.id)
        .eq('guest_id', guestId)
    }

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
      language: language || prefillLanguage || 'bg',
      inviteCode,
      prefillName,
      sessionOpen: true,
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
  const code = normalizeCode(
    request.nextUrl.searchParams.get('code') || undefined
  )
  if (!code) {
    return NextResponse.json({ error: 'code required' }, { status: 400 })
  }
  try {
    const admin = getSupabaseAdmin()
    const { data: invite } = await admin
      .from('invites')
      .select(
        'code, label, channel, prefill_name, prefill_language, active, room_id, rooms(session_open, title)'
      )
      .eq('code', code)
      .maybeSingle()
    if (!invite || !invite.active) {
      return NextResponse.json(
        { error: 'Поканата е невалидна или деактивирана' },
        { status: 404 }
      )
    }
    return NextResponse.json({ invite, backend: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
