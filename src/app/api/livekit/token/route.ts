import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { isLiveKitEnabled } from '@/lib/backend'
import { getSessionUser } from '@/lib/auth/get-user'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  if (!isLiveKitEnabled()) {
    return NextResponse.json(
      { error: 'LiveKit not configured', localPreview: true },
      { status: 503 }
    )
  }

  const body = (await request.json().catch(() => ({}))) as {
    roomId?: string
    guestId?: string
    displayName?: string
  }

  if (!body.roomId) {
    return NextResponse.json({ error: 'roomId required' }, { status: 400 })
  }

  try {
    const admin = getSupabaseAdmin()
    const { data: room } = await admin
      .from('rooms')
      .select('*')
      .eq('id', body.roomId)
      .maybeSingle()

    if (!room || !room.session_open) {
      return NextResponse.json({ error: 'Room unavailable' }, { status: 403 })
    }

    const session = await getSessionUser().catch(() => null)
    let identity: string
    let name: string

    if (session) {
      identity = `user_${session.user.id}`
      name = session.user.displayName
    } else if (body.guestId && body.displayName) {
      const { data: participant } = await admin
        .from('room_participants')
        .select('id')
        .eq('room_id', body.roomId)
        .eq('guest_id', body.guestId)
        .eq('is_active', true)
        .maybeSingle()
      if (!participant) {
        return NextResponse.json({ error: 'Guest not allowed' }, { status: 403 })
      }
      identity = `guest_${body.guestId}`
      name = body.displayName
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.LIVEKIT_API_KEY!
    const apiSecret = process.env.LIVEKIT_API_SECRET!
    const serverUrl =
      process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL!

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name,
      ttl: '2h',
    })
    at.addGrant({
      roomJoin: true,
      room: room.livekit_room || body.roomId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    const token = await at.toJwt()
    return NextResponse.json(
      {
        server_url: serverUrl,
        participant_token: token,
        room_name: room.livekit_room || body.roomId,
      },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
