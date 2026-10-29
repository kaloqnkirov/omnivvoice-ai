import { NextRequest, NextResponse } from 'next/server'

/**
 * Transcribe peer audio (host-side VoiceBridge when guest has no Web Speech).
 * Uses Gemini multimodal when GEMINI_API_KEY is set.
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const file = form.get('audio')
    if (!(file instanceof Blob) || file.size < 256) {
      return NextResponse.json({ error: 'No audio' }, { status: 400 })
    }
    // Cap ~15s of speech
    if (file.size > 1_500_000) {
      return NextResponse.json({ error: 'Audio too large' }, { status: 413 })
    }

    const apiKey = process.env.GEMINI_API_KEY || ''
    if (!apiKey || apiKey.includes('your_')) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY missing', text: '' },
        { status: 503 }
      )
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const b64 = buf.toString('base64')
    const mime = (file.type || 'audio/webm').split(';')[0] || 'audio/webm'
    const hint = String(form.get('lang') || '').trim().slice(0, 16)

    const prompt = hint
      ? `Transcribe this speech (likely language code: ${hint}). Return ONLY the spoken words, no labels or quotes.`
      : 'Transcribe this speech. Return ONLY the spoken words, no labels or quotes.'

    // Prefer models verified working with current GEMINI_API_KEY
    const models = [
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-2.5-flash',
      'gemini-flash-latest',
    ]

    let lastErr = ''
    for (const model of models) {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/` +
        `${model}:generateContent?key=${encodeURIComponent(apiKey)}`

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mime, data: b64 } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 512,
          },
        }),
        signal: AbortSignal.timeout(20000),
      })

      if (!res.ok) {
        lastErr = await res.text().catch(() => `HTTP ${res.status}`)
        // Try next model on 404 / not found
        if (res.status === 404 || /not found|no longer available/i.test(lastErr)) {
          continue
        }
        return NextResponse.json(
          {
            error: `Gemini ${res.status}`,
            detail: lastErr.slice(0, 200),
            text: '',
          },
          { status: 502 }
        )
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> }
        }>
      }
      const text = (data.candidates?.[0]?.content?.parts || [])
        .map((p) => p.text || '')
        .join('')
        .trim()
        .replace(/^["'«»]+|["'«»]+$/g, '')

      return NextResponse.json({ text, model })
    }

    return NextResponse.json(
      {
        error: 'No Gemini model available',
        detail: lastErr.slice(0, 200),
        text: '',
      },
      { status: 502 }
    )
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Transcribe failed',
        text: '',
      },
      { status: 500 }
    )
  }
}
