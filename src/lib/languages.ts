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
  return APP_LANGUAGES.find((lang) => lang.code === code) || APP_LANGUAGES[1]
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
      'Messenger chat + calls',
      '2 ambient music tracks',
      'Guest links (if room owner allows)',
      'Phrasebook + smart replies',
      'Light / Dark mode',
    ],
    secretaryPhone: false,
  },
  business: {
    id: 'business',
    label: 'Business',
    price: 'Paid',
    description: 'AI secretary, CRM, sales coaching',
    features: [
      'Everything in Normal',
      'Paywall преди дашборда',
      'AI secretary → phone',
      'Contact import (Google/FB/Phone)',
      'Call recap + emotion-safe tone',
      'CRM / battle cards / dual-track',
      '5 ambient music tracks',
    ],
    secretaryPhone: true,
  },
  podcast: {
    id: 'podcast',
    label: 'Podcast & Streaming',
    price: 'Paid',
    description: 'Multi-host studio + OBS + shorts',
    features: [
      'Everything in Business',
      'Paywall преди дашборда',
      'YouTube / TikTok / Facebook multistream',
      'OBS + 9:16 shorts + VOD',
      'Full premium music library',
      'Studio presence + broadcast rooms',
    ],
    secretaryPhone: true,
  },
}

export function planAllowsSecretary(plan: PlanId) {
  return PLANS[plan].secretaryPhone
}
