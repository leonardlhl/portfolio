// The MP3 is mastered quietly so phones with hardware-only volume stay quiet too.
const preferenceKey = 'portfolio-background-music';

function savedPreference() {
  try { return localStorage.getItem(preferenceKey) !== 'off'; }
  catch { return true; }
}

function mountBackgroundMusic() {
  const audio = document.querySelector('#background-music');
  const button = document.querySelector('#music-toggle');
  let enabled = savedPreference();
  let needsGesture = Boolean(navigator.connection?.saveData);
  let failed = false;
  let pageHidden = false;
  let videoAudible = false;
  let pending = null;
  let requestNumber = 0;
  let lastGestureAttempt = -Infinity;

  const held = () => pageHidden || document.hidden || videoAudible;
  function showState() {
    let state = 'playing';
    let label = 'Mute background music';
    if (!enabled) { state = 'muted'; label = 'Turn on background music'; }
    else if (held()) { state = 'paused'; }
    else if (failed) { state = 'unavailable'; label = 'Retry background music'; }
    else if (needsGesture || audio.paused || pending) { state = 'waiting'; label = 'Play background music'; }
    button.dataset.state = state;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(enabled));
    button.title = label;
  }

  function sync(userGesture = false) {
    if (!enabled || held()) {
      ++requestNumber;
      if (pending || !audio.paused) audio.pause();
      pending = null;
      showState();
      return;
    }
    if (!userGesture && (pending || needsGesture || failed)) return showState();
    if (!pending && !audio.paused && !failed && !needsGesture) return showState();
    // One tap can emit touchend and click. A later tap may retry a stalled load.
    if (userGesture && (pending === 'gesture' || failed) && performance.now() - lastGestureAttempt < 300) return;
    const ticket = ++requestNumber;
    pending = userGesture ? 'gesture' : 'auto';
    if (userGesture) lastGestureAttempt = performance.now();
    needsGesture = false;
    if (!audio.hasAttribute('src')) audio.src = audio.dataset.src;
    else if (failed || audio.error) audio.load();
    failed = false;
    audio.play().then(() => {
      if (ticket !== requestNumber) return;
      pending = null;
      showState();
    }).catch(error => {
      if (ticket !== requestNumber) return;
      pending = null;
      failed = error.name !== 'NotAllowedError' && error.name !== 'AbortError';
      needsGesture = !failed;
      showState();
    });
    showState();
  }

  function setEnabled(value) {
    enabled = value;
    try { localStorage.setItem(preferenceKey, value ? 'on' : 'off'); } catch {}
    sync(true);
  }

  button.addEventListener('click', () => {
    if (enabled && !held() && (pending || failed || needsGesture || audio.paused)) sync(true);
    else setEnabled(!enabled);
  });
  function unlock(event) {
    if (!event.isTrusted || !enabled || held()) return;
    if (!pending && !audio.paused && !failed && !needsGesture) return;
    if (event.type === 'pointerdown' && (event.pointerType !== 'mouse' || event.button !== 0)) return;
    if (event.type === 'pointerup' && event.pointerType === 'touch' && 'ontouchend' in window) return;
    if (event.type === 'keydown' && (event.repeat || event.ctrlKey || event.metaKey || event.altKey)) return;
    if (event.target.closest?.('#music-toggle, video, .toolkit-video-controls')) return;
    sync(true);
  }
  // Capture also covers taps consumed by the helix, without cancelling navigation.
  for (const name of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
    window.addEventListener(name, unlock, {capture:true, passive:true});
  }
  audio.addEventListener('playing', showState);
  audio.addEventListener('pause', showState);
  audio.addEventListener('error', () => {
    if (!audio.error) return;
    ++requestNumber;
    pending = null;
    failed = true;
    showState();
  });
  function checkVideo() {
    videoAudible = !!document.querySelector('.toolkit-video-page[data-audible="true"]');
    sync();
  }
  document.addEventListener('portfolio:media-audio', checkVideo);
  document.addEventListener('visibilitychange', () => sync());
  window.addEventListener('pagehide', () => { pageHidden = true; sync(); });
  window.addEventListener('pageshow', () => { pageHidden = false; checkVideo(); });
  window.addEventListener('storage', event => {
    if (event.key === preferenceKey || event.key === null) { enabled = savedPreference(); sync(); }
  });
  audio.volume = 0.8;
  button.hidden = false;
  checkVideo();
}

if (!document.documentElement.dataset.mobileRedirect) mountBackgroundMusic();
