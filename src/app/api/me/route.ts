import { NextResponse } from 'next/server'
import { isBackendEnabled } from '@/lib/backend'
import { getSessionUser } from '@/lib/auth/get-user'

export async function GET() {
  if (!isBackendEnabled()) {
    return NextResponse.json({ backend: false, user: null })
  }
  try {
    const session = await getSessionUser()
    if (!session) {
      return NextResponse.json({ backend: true, user: null }, { status: 401 })
    }
    return NextResponse.json({ backend: true, user: session.user })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
