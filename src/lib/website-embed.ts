import type { WebsiteChannel, WebsiteConnection } from '@/lib/user-store'

export function createSiteKey(domain: string) {
  const slug = domain
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .slice(0, 24)
    .toLowerCase()
  return `ov_${slug || 'site'}_${Math.random().toString(36).slice(2, 8)}`
}

export function buildEmbedUrl(
  origin: string,
  site: Pick<
    WebsiteConnection,
    | 'siteKey'
    | 'name'
    | 'domain'
    | 'channel'
    | 'welcomeMessage'
    | 'hostLanguage'
    | 'visitorDefaultLanguage'
    | 'position'
    | 'showBranding'
    | 'onlineLabel'
  >
) {
  const params = new URLSearchParams({
    key: site.siteKey,
    name: site.name,
    domain: site.domain,
    channel: site.channel,
    welcome: site.welcomeMessage,
    hostLang: site.hostLanguage,
    visitorLang: site.visitorDefaultLanguage,
    position: site.position,
    branding: site.showBranding ? '1' : '0',
    online: site.onlineLabel,
  })
  return `${origin}/embed?${params.toString()}`
}

export function buildScriptSnippet(origin: string, site: WebsiteConnection) {
  return `<!-- OmniVoice AI website widget -->
<script
  src="${origin}/omnivvoice-widget.js"
  data-site-key="${site.siteKey}"
  data-name="${escapeAttr(site.name)}"
  data-domain="${escapeAttr(site.domain)}"
  data-channel="${site.channel}"
  data-welcome="${escapeAttr(site.welcomeMessage)}"
  data-host-lang="${site.hostLanguage}"
  data-visitor-lang="${site.visitorDefaultLanguage}"
  data-position="${site.position}"
  data-branding="${site.showBranding ? '1' : '0'}"
  data-online="${escapeAttr(site.onlineLabel)}"
  async
></script>`
}

export function buildIframeSnippet(origin: string, site: WebsiteConnection) {
  const src = buildEmbedUrl(origin, site)
  return `<iframe
  src="${src}"
  title="OmniVoice chat"
  style="position:fixed;${site.position === 'bottom-left' ? 'left:16px' : 'right:16px'};bottom:16px;width:380px;height:560px;border:0;border-radius:20px;z-index:999999;box-shadow:0 20px 60px rgba(0,0,0,.25);"
  allow="microphone; camera; clipboard-write"
></iframe>`
}

function escapeAttr(value: string) {
  return value.replace(/"/g, '&quot;').replace(/</g, '')
}

export function parseChannel(value: string | null): WebsiteChannel {
  if (value === 'chat' || value === 'call' || value === 'both') return value
  return 'both'
}
