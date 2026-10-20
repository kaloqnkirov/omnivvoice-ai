import { connection } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'

type TranslateBody = {
  text?: string
  targetLanguage?: string
  emotionSafe?: boolean
  tone?: 'natural' | 'formal' | 'casual'
}

const rateBucket = new Map<string, { count: number; resetAt: number }>()

function rateLimit(ip: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = rateBucket.get(ip)
  if (!entry || entry.resetAt < now) {
    rateBucket.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count += 1
  return true
}

export async function POST(request: NextRequest) {
  await connection()

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const apiKey =
    process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return NextResponse.json(
      { error: 'Missing GEMINI_API_KEY in .env.local' },
      { status: 500 }
    )
  }

  let body: TranslateBody
  try {
    body = (await request.json()) as TranslateBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const text = body.text?.trim()
  const targetLanguage = body.targetLanguage?.trim() || 'English'
  if (!text) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 })
  }
  if (text.length > 4000) {
    return NextResponse.json({ error: 'Text too long (max 4000)' }, { status: 400 })
  }

  const tone = body.tone || 'natural'
  const emotionSafe = Boolean(body.emotionSafe)
  const toneHint =
    tone === 'formal'
      ? 'Use polished formal register.'
      : tone === 'casual'
        ? 'Use friendly casual register.'
        : 'Keep a natural conversational register.'
  const emotionHint = emotionSafe
    ? 'Preserve politeness and emotional intent; never escalate rudeness; soften aggression while keeping meaning.'
    : 'Preserve tone and emotion accurately.'

  const prompt = `Translate the following text into ${targetLanguage}. ${toneHint} ${emotionHint} Return ONLY the translation.\n\n${text}`

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

  try {
    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: emotionSafe ? 0.25 : 0.2,
          maxOutputTokens: 512,
        },
      }),
    })

    const data = (await geminiRes.json()) as {
      error?: { message?: string }
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> }
      }>
    }

    if (!geminiRes.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Gemini translation failed' },
        { status: 502 }
      )
    }

    const translation =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim() || ''

    if (!translation) {
      return NextResponse.json(
        { error: 'Empty translation from Gemini' },
        { status: 502 }
      )
    }

    return NextResponse.json({ translation, targetLanguage })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Translation request failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
