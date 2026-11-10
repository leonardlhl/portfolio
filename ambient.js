// A quiet atmospheric layer; it never participates in project navigation.
const STORAGE_KEY = 'portfolio:ambientPaused';
const FRAME_MS = 1000 / 30;
const INK = '62, 78, 91';
let mounted = null;

export function mountAmbientSky() {
  if (mounted) return mounted;
  const scene = document.getElementById('scene');
  if (!scene) return null;

  const canvas = document.createElement('canvas');
  canvas.id = 'ambient-sky';
  canvas.setAttribute('aria-hidden', 'true');
  scene.before(canvas);
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) {
    canvas.remove();
    return null;
  }

  const toggle = document.createElement('button');
  toggle.id = 'ambient-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Background motion');
  toggle.setAttribute('aria-controls', canvas.id);
  document.body.append(toggle);

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  try { paused = localStorage.getItem(STORAGE_KEY) === 'true'; } catch { /* Storage is optional. */ }
  let width = 1;
  let height = 1;
  let stars = [];
  let meteor = null;
  let nextMeteor = 0;
  let frame = 0;
  let previousTime = 0;
  let destroyed = false;

  const random = (min, max) => min + Math.random() * (max - min);
  const canAnimate = () => !destroyed && !paused && !reducedMotion.matches && !document.hidden;
  const scheduleMeteor = (now) => { nextMeteor = now + random(15000, 28000); };

  function updateToggle() {
    toggle.setAttribute('aria-pressed', String(!paused));
    toggle.title = paused ? 'Resume background motion' : 'Pause background motion';
    toggle.hidden = reducedMotion.matches;
    toggle.innerHTML = paused
      ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 3.5 12 8l-6.5 4.5Z"/></svg>'
      : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 3.5v9m5-9v9"/></svg>';
    canvas.dataset.motion = canAnimate() ? 'running' : 'paused';
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = width <= 700 ? 20 : 45;
    // Normalized coordinates preserve the constellation when the window changes.
    if (stars.length !== count) {
      stars = Array.from({ length: count }, () => ({
        x: Math.random(),
        y: Math.random(),
        radius: random(0.45, 0.95),
        opacity: random(0.075, 0.145),
        vx: random(-0.9, 0.9),
        vy: random(-1.5, -0.45),
      }));
    }
    meteor = null;
    draw(performance.now());
  }

  function draw(now) {
    context.clearRect(0, 0, width, height);
    for (const star of stars) {
      context.beginPath();
      context.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(${INK}, ${star.opacity})`;
      context.fill();
    }
    if (!meteor) return;
    const progress = (now - meteor.started) / meteor.duration;
    if (progress >= 1) {
      meteor = null;
      return;
    }
    const x = meteor.x + meteor.dx * progress;
    const y = meteor.y + meteor.dy * progress;
    const tailX = x - meteor.dx * 0.38;
    const tailY = y - meteor.dy * 0.38;
    const opacity = 0.14 * Math.sin(progress * Math.PI);
    const trail = context.createLinearGradient(tailX, tailY, x, y);
    trail.addColorStop(0, `rgba(${INK}, 0)`);
    trail.addColorStop(1, `rgba(${INK}, ${opacity})`);
    context.beginPath();
    context.moveTo(tailX, tailY);
    context.lineTo(x, y);
    context.lineWidth = 0.65;
    context.strokeStyle = trail;
    context.stroke();
  }

  function tick(now) {
    if (!canAnimate()) {
      frame = 0;
      return;
    }
    frame = requestAnimationFrame(tick);
    const elapsed = now - previousTime;
    if (elapsed < FRAME_MS) return;
    previousTime = now - (elapsed % FRAME_MS);
    const seconds = Math.min(elapsed / 1000, 0.075);
    for (const star of stars) {
      star.x = (star.x + star.vx * seconds / width + 1) % 1;
      star.y = (star.y + star.vy * seconds / height + 1) % 1;
    }
    if (now >= nextMeteor && !meteor) {
      meteor = {
        x: random(width * 0.12, width * 0.74),
        y: random(height * 0.08, height * 0.55),
        dx: Math.min(width * 0.2, random(150, 230)),
        dy: random(65, 105),
        duration: random(1300, 1800),
        started: now,
      };
      scheduleMeteor(now);
    }
    draw(now);
  }

  function syncMotion() {
    cancelAnimationFrame(frame);
    frame = 0;
    meteor = null;
    const now = performance.now();
    previousTime = now;
    scheduleMeteor(now);
    updateToggle();
    draw(now);
    if (canAnimate()) frame = requestAnimationFrame(tick);
  }

  function setPaused(value) {
    paused = Boolean(value);
    try { localStorage.setItem(STORAGE_KEY, String(paused)); } catch { /* Keep the session setting. */ }
    syncMotion();
  }

  const onToggle = () => setPaused(!paused);
  toggle.addEventListener('click', onToggle);
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', syncMotion);
  reducedMotion.addEventListener('change', syncMotion);
  resize();
  syncMotion();

  mounted = {
    setPaused,
    get paused() { return paused; },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      toggle.removeEventListener('click', onToggle);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', syncMotion);
      reducedMotion.removeEventListener('change', syncMotion);
      canvas.remove();
      toggle.remove();
      mounted = null;
    },
  };
  return mounted;
}
