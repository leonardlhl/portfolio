// A quiet atmospheric layer; it never participates in project navigation.
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

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 1;
  let height = 1;
  let stars = [];
  let meteor = null;
  let nextMeteor = 0;
  let frame = 0;
  let previousTime = 0;
  let previousDrawTime = 0;
  let hasShownMeteor = false;
  let destroyed = false;

  const random = (min, max) => min + Math.random() * (max - min);
  const canAnimate = () => !destroyed && !reducedMotion.matches && !document.hidden;
  const scheduleMeteor = (now) => {
    nextMeteor = now + (hasShownMeteor ? random(3000, 5500) : random(1000, 1750));
  };

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = width <= 700 ? 84 : 202;
    // Normalized coordinates preserve the constellation when the window changes.
    if (stars.length !== count) {
      stars = Array.from({ length: count }, () => {
        const direction = random(0, Math.PI * 2);
        const speed = random(6, 12);
        const larger = Math.random() < 0.28;
        return {
          x: Math.random(),
          y: Math.random(),
          radius: larger ? random(1.1, 1.5) : random(0.7, 1.05),
          opacity: larger ? random(0.24, 0.32) : random(0.18, 0.27),
          vx: Math.cos(direction) * speed,
          vy: Math.sin(direction) * speed,
        };
      });
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
    const opacity = 0.36 * Math.sin(progress * Math.PI);
    const trail = context.createLinearGradient(tailX, tailY, x, y);
    trail.addColorStop(0, `rgba(${INK}, 0)`);
    trail.addColorStop(1, `rgba(${INK}, ${opacity})`);
    context.beginPath();
    context.moveTo(tailX, tailY);
    context.lineTo(x, y);
    context.lineWidth = 0.9;
    context.strokeStyle = trail;
    context.stroke();
    context.beginPath();
    context.arc(x, y, 0.85, 0, Math.PI * 2);
    context.fillStyle = `rgba(${INK}, ${opacity})`;
    context.fill();
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
    const seconds = Math.min((now - previousDrawTime) / 1000, 0.075);
    previousDrawTime = now;
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
        duration: random(1200, 1600),
        started: now,
      };
      hasShownMeteor = true;
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
    previousDrawTime = now;
    scheduleMeteor(now);
    canvas.dataset.motion = canAnimate() ? 'running' : 'paused';
    draw(now);
    if (canAnimate()) frame = requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', syncMotion);
  reducedMotion.addEventListener('change', syncMotion);
  resize();
  syncMotion();

  mounted = {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', syncMotion);
      reducedMotion.removeEventListener('change', syncMotion);
      canvas.remove();
      mounted = null;
    },
  };
  return mounted;
}
