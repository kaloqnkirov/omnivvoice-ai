import { NextRequest, NextResponse } from 'next/server'

/**
 * Server proxy for Google Translate TTS — avoids browser CORS/blocks
 * that silently fall back to Windows' single male speechSynthesis voice.
 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') || '').trim().slice(0, 180)
  const lang = (request.nextUrl.searchParams.get('lang') || 'en')
    .slice(0, 2)
    .toLowerCase()

  if (!q) {
    return NextResponse.json({ error: 'Missing q' }, { status: 400 })
  }

  const url =
    `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob` +
    `&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(q)}`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: '*/*',
        Referer: 'https://translate.google.com/',
      },
      cache: 'no-store',
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: `TTS upstream ${res.status}` },
        { status: 502 }
      )
    }
    const buf = await res.arrayBuffer()
    if (!buf.byteLength) {
      return NextResponse.json({ error: 'Empty TTS' }, { status: 502 })
    }
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'audio/mpeg',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'TTS failed',
      },
      { status: 502 }
    )
  }
}
