// Cloudflare's public site token is an identifier, not an account/API credential.
// Count published document visits only; local previews and the mobile redirect
// shell must not send analytics. This module has no visible UI or app dependency.
const productionHosts = new Set(['leonardlo.com', 'www.leonardlo.com']);
if (location.protocol === 'https:' && productionHosts.has(location.hostname)
    && !document.documentElement.dataset.mobileRedirect
    && !document.querySelector('script[data-cf-beacon]')) {
  const beacon = document.createElement('script');
  beacon.type = 'module';
  beacon.async = true;
  beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  beacon.setAttribute('data-cf-beacon', JSON.stringify({
    token: '6b8d645aa0c2454794dcf145411be5a8',
    spa: false
  }));
  document.head.append(beacon);
}
