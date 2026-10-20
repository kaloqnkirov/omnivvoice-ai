(function () {
  if (window.__omnivvoiceWidgetLoaded) return
  window.__omnivvoiceWidgetLoaded = true

  var script =
    document.currentScript ||
    document.querySelector('script[data-site-key][src*="omnivvoice-widget"]')
  if (!script) return

  var origin = new URL(script.src).origin
  var key = script.getAttribute('data-site-key') || 'ov_demo'
  var name = script.getAttribute('data-name') || 'OmniVoice'
  var domain = script.getAttribute('data-domain') || location.hostname
  var channel = script.getAttribute('data-channel') || 'both'
  var welcome =
    script.getAttribute('data-welcome') ||
    'Hello! Chat or call — we translate live.'
  var hostLang = script.getAttribute('data-host-lang') || 'bg'
  var visitorLang = script.getAttribute('data-visitor-lang') || 'en'
  var position = script.getAttribute('data-position') || 'bottom-right'
  var branding = script.getAttribute('data-branding') || '1'
  var online = script.getAttribute('data-online') || 'Online now'

  var params = new URLSearchParams({
    key: key,
    name: name,
    domain: domain,
    channel: channel,
    welcome: welcome,
    hostLang: hostLang,
    visitorLang: visitorLang,
    position: position,
    branding: branding,
    online: online,
    launcher: '1',
  })

  var btn = document.createElement('button')
  btn.type = 'button'
  btn.setAttribute('aria-label', 'Open OmniVoice chat')
  btn.textContent = 'OV'
  btn.style.cssText = [
    'position:fixed',
    position === 'bottom-left' ? 'left:18px' : 'right:18px',
    'bottom:18px',
    'width:56px',
    'height:56px',
    'border-radius:999px',
    'border:0',
    'background:linear-gradient(135deg,#0f8f75,#1aa889)',
    'color:#f4fffb',
    'font:700 14px/1 Manrope,system-ui,sans-serif',
    'box-shadow:0 12px 30px rgba(15,143,117,.45)',
    'cursor:pointer',
    'z-index:2147483000',
  ].join(';')

  var frame = document.createElement('iframe')
  frame.title = 'OmniVoice widget'
  frame.allow = 'microphone; camera; clipboard-write'
  frame.src = origin + '/embed?' + params.toString()
  frame.style.cssText = [
    'position:fixed',
    position === 'bottom-left' ? 'left:16px' : 'right:16px',
    'bottom:84px',
    'width:min(380px, calc(100vw - 24px))',
    'height:min(560px, calc(100vh - 110px))',
    'border:0',
    'border-radius:22px',
    'box-shadow:0 24px 70px rgba(0,0,0,.28)',
    'z-index:2147483001',
    'display:none',
    'background:#07110e',
  ].join(';')

  var open = false
  btn.addEventListener('click', function () {
    open = !open
    frame.style.display = open ? 'block' : 'none'
    btn.textContent = open ? '×' : 'OV'
  })

  document.body.appendChild(frame)
  document.body.appendChild(btn)
})()
