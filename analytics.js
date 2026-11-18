// Cloudflare's public site token is an identifier, not an account/API credential.
// Count published document visits only; local previews and the mobile redirect
// shell must not send analytics. This module has no visible UI or app dependency.
const productionHosts = new Set(['leonardlo.com', 'www.leonardlo.com']);
const preferenceKey = 'portfolio-analytics-disabled';

function analyticsDisabled() {
  const url = new URL(location.href);
  const choice = url.searchParams.get('analytics');

  if (choice === 'off' || choice === 'on') {
    try {
      if (choice === 'off') localStorage.setItem(preferenceKey, '1');
      else localStorage.removeItem(preferenceKey);

      // Keep the personal setting out of the address people copy and share.
      url.searchParams.delete('analytics');
      history.replaceState(history.state, '', url);
    } catch { /* The explicit choice still applies if storage or history is unavailable. */ }
    return choice === 'off';
  }

  try { return localStorage.getItem(preferenceKey) === '1'; }
  catch { return false; }
}

if (location.protocol === 'https:' && productionHosts.has(location.hostname)
    && !document.documentElement.dataset.mobileRedirect
    && !analyticsDisabled() && !navigator.webdriver
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
