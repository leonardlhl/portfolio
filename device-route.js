// Route touch devices before downloading the desktop scene. Both editions share
// content, and a deliberate Desktop version choice lasts for this tab session.
(() => {
  const params = new URLSearchParams(location.search);
  let choice = params.get('view');
  try {
    if (choice === 'desktop' || choice === 'mobile') sessionStorage.setItem('portfolio-edition', choice);
    else choice = sessionStorage.getItem('portfolio-edition');
  } catch { /* Private browsing can deny storage; explicit URL choices still work. */ }
  const touchDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (choice === 'mobile' || (choice !== 'desktop' && touchDevice)) {
    document.documentElement.dataset.mobileRedirect = 'true';
    const mobile = new URL('./m/', location.href);
    mobile.hash = location.hash;
    location.replace(mobile.href);
  }
})();
