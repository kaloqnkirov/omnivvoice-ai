import { getLanguage } from '@/lib/languages'

/** Lightweight local smart replies — language-aware chips */
export function buildSmartReplies(
  lastMessage: string,
  replyLanguageCode: string
): string[] {
  const lang = getLanguage(replyLanguageCode).code
  const lower = lastMessage.toLowerCase()

  const isQuestion =
    lower.includes('?') ||
    lower.includes('ли ') ||
    lower.startsWith('can ') ||
    lower.startsWith('could ') ||
    lower.includes('¿')

  const packs: Record<string, { yes: string; later: string; call: string; thanks: string }> = {
    bg: {
      yes: 'Да, звучи супер — продължаваме.',
      later: 'Мога след малко, ок ли е?',
      call: 'Да звъннем ли вместо чат?',
      thanks: 'Благодаря! Ще се върна с детайли.',
    },
    en: {
      yes: 'Yes — that works for me.',
      later: 'Can we continue in a bit?',
      call: 'Want to hop on a quick call?',
      thanks: 'Thanks! I’ll follow up shortly.',
    },
    es: {
      yes: 'Sí, me parece perfecto.',
      later: '¿Seguimos en un rato?',
      call: '¿Hacemos una llamada rápida?',
      thanks: '¡Gracias! Te respondo en breve.',
    },
    de: {
      yes: 'Ja, das passt gut.',
      later: 'Können wir gleich weitermachen?',
      call: 'Sollen wir kurz anrufen?',
      thanks: 'Danke! Ich melde mich gleich.',
    },
  }

  const pack = packs[lang] || packs.en
  if (isQuestion) return [pack.yes, pack.later, pack.call]
  return [pack.thanks, pack.yes, pack.call]
}

export function presenceLabel(status: string) {
  switch (status) {
    case 'writing':
      return 'Пише…'
    case 'speaking':
      return 'Говори'
    case 'in_call':
      return 'В обаждане'
    case 'in_studio':
      return 'В студио'
    case 'offline':
      return 'Offline'
    default:
      return 'Online'
  }
}
