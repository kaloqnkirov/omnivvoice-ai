export type AppLanguage = {
  code: string
  name: string
  nativeName: string
  speechCode: string
  flag: string
}

/** Popular languages for OmniVoice, including Bulgarian */
export const APP_LANGUAGES: AppLanguage[] = [
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', speechCode: 'bg-BG', flag: 'BG' },
  { code: 'en', name: 'English', nativeName: 'English', speechCode: 'en-US', flag: 'EN' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', speechCode: 'es-ES', flag: 'ES' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', speechCode: 'de-DE', flag: 'DE' },
  { code: 'fr', name: 'French', nativeName: 'Français', speechCode: 'fr-FR', flag: 'FR' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', speechCode: 'pt-BR', flag: 'PT' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', speechCode: 'it-IT', flag: 'IT' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', speechCode: 'tr-TR', flag: 'TR' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', speechCode: 'ru-RU', flag: 'RU' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', speechCode: 'uk-UA', flag: 'UK' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', speechCode: 'pl-PL', flag: 'PL' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', speechCode: 'ro-RO', flag: 'RO' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', speechCode: 'el-GR', flag: 'EL' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', speechCode: 'nl-NL', flag: 'NL' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', speechCode: 'ar-SA', flag: 'AR' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', speechCode: 'zh-CN', flag: 'ZH' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', speechCode: 'ja-JP', flag: 'JA' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', speechCode: 'ko-KR', flag: 'KO' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', speechCode: 'hi-IN', flag: 'HI' },
]

export function getLanguage(code: string): AppLanguage {
  const normalized = code.trim().toLowerCase()
  return (
    APP_LANGUAGES.find((lang) => lang.code === normalized) ||
    APP_LANGUAGES.find((lang) => normalized.startsWith(lang.code)) ||
    APP_LANGUAGES[1]
  )
}

/** ISO code only (bg, en, tr…) — for VoiceBridge compare across peers */
export function normalizeLangCode(code: string | null | undefined): string {
  const raw = (code || '').trim()
  if (!raw) return ''
  return getLanguage(raw).code.toLowerCase()
}

export function isAppLanguageCode(code: string | null | undefined): boolean {
  const c = normalizeLangCode(code)
  return Boolean(c && APP_LANGUAGES.some((l) => l.code === c))
}

/** Resolve BCP-47 speech code from ISO code or English/native language name */
export function resolveSpeechCode(language: string): string {
  const value = language.trim().toLowerCase()
  if (!value) return 'en-US'
  const byCode = APP_LANGUAGES.find(
    (lang) => lang.code === value || value.startsWith(`${lang.code}-`)
  )
  if (byCode) return byCode.speechCode
  const byName = APP_LANGUAGES.find(
    (lang) =>
      lang.name.toLowerCase() === value ||
      lang.nativeName.toLowerCase() === value ||
      value.includes(lang.name.toLowerCase())
  )
  if (byName) return byName.speechCode
  return 'en-US'
}

export type PlanId = 'free' | 'business' | 'podcast'

export const PLANS: Record<
  PlanId,
  {
    id: PlanId
    label: string
    price: string
    description: string
    features: string[]
    secretaryPhone: boolean
  }
> = {
  free: {
    id: 'free',
    label: 'Normal (Free)',
    price: 'Free',
    description: 'Messenger chat + personal translated calls',
    features: [
      'Messenger + общностни стаи (колеги / приятели / клуб…)',
      'GPS карта (opt-in) · OpenStreetMap за целия свят',
      'Гледане заедно live · Streaming пакет',
      'AI cutout по контур · VoiceBridge™',
      'Guest links · Phrasebook · теми',
    ],
    secretaryPhone: false,
  },
  business: {
    id: 'business',
    label: 'Business',
    price: 'Paid',
    description: 'Revenue Desk — CRM + AI sales coach (като Gong/Dialpad)',
    features: [
      'Отделен Revenue Desk UI (не Messenger)',
      'Pipeline: Discovery → Demo → Negotiation → Won',
      'AI секретар → телефон 24/7',
      'Live sales coach + sentiment + battle cards',
      'Call recap + законен eIDAS/ESIGN подпис (Yousign/DocuSign)',
      'Пълен Streaming пакет (alerts · polls · raids · VOD…)',
      'VoiceBridge™ dual-track — всеки чува на своя език',
      'Salesforce / HubSpot · 5 ambient tracks',
    ],
    secretaryPhone: true,
  },
  podcast: {
    id: 'podcast',
    label: 'Podcast & Streaming',
    price: 'Paid',
    description: 'Studio Control — без конкуренция на live + VoiceBridge',
    features: [
      'Отделен Studio Control UI (не Messenger)',
      'Подкаст стая + Streaming (Twitch/YT/Kick/Streamlabs пакет)',
      'Multistream RTMP · OBS · 9:16 shorts · VOD/DVR',
      'Channel points · Hype · Polls · Predictions · Raids',
      'Watch Together live · сериали · футбол · sync',
      'AI cutout (MediaPipe multiclass) · точен контур',
      'Интерактивни субтитри всеки език + AI Moments',
      'VoiceBridge™ dual-audio — само OmniVoice',
      'AI продуцент бележки · multilingual mod bot',
    ],
    secretaryPhone: true,
  },
}

export function planAllowsSecretary(plan: PlanId) {
  return PLANS[plan].secretaryPhone
}
