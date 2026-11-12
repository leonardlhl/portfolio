// A position-driven reveal: the journey owns timing, gestures and accessibility.
// No timers or extra animation loop, so reversing a swipe retraces the same frame.
const stacks = new WeakMap();
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const percent = value => `${value.toFixed(4)}%`;

function write(style, property, value) {
  if (style[property] !== value) style[property] = value;
}

function prepare(slides) {
  let state = stacks.get(slides);
  if (state) return state;
  state = {
    position: null,
    reducedMotion: null,
    pages: Array.from(slides, page => {
      // Keep the original article as the CV scrolling box and clip boundary.
      // The image and its independently revealed information column move together.
      const content = Array.from(page.children);
      for (const element of content) element.classList.add('page-wipe-content');
      page.dataset.wipeState = 'hidden';
      return {page, content};
    }),
  };
  slides[0]?.parentElement?.classList.add('page-wipe-stack');
  stacks.set(slides, state);
  return state;
}

function settle(entry, visible) {
  const {page, content} = entry;
  const next = visible ? 'settled' : 'hidden';
  if (page.dataset.wipeState === next) return;
  page.dataset.wipeState = next;
  write(page.style, 'clipPath', '');
  write(page.style, 'webkitClipPath', '');
  write(page.style, 'willChange', '');
  for (const element of content) {
    write(element.style, 'transform', '');
    write(element.style, 'transformOrigin', '');
    write(element.style, 'willChange', '');
  }
}

function reveal(entry, clip, side, tension) {
  const {page, content} = entry;
  page.dataset.wipeState = 'revealing';
  write(page.style, 'clipPath', clip);
  write(page.style, 'webkitClipPath', clip);
  write(page.style, 'willChange', 'clip-path');
  // At most 1.2% stretch and 0.18 degrees of skew. No translation or blur:
  // drawings remain anchored while the small deformation follows the curved edge.
  const transform = `scale(${(1 + .012 * tension).toFixed(6)}, ${(1 - .003 * tension).toFixed(6)}) skewY(${(side * .18 * tension).toFixed(5)}deg)`;
  for (const element of content) {
    write(element.style, 'transformOrigin', side < 0 ? '0% 50%' : '100% 50%');
    write(element.style, 'transform', transform);
    write(element.style, 'willChange', 'transform');
  }
}

/**
 * Paint a continuous page position, e.g. 1.25 = 25% from page 1 to page 2.
 * Load page-wipe.css after journey.css, then call after attaching the stop's slides.
 * The caller retains inert/aria state, pointer ownership, cover reveal and video life.
 * Returns true only when a visual frame changed. Reduced motion selects one page.
 */
export function paintPageWipe(slides, position, reducedMotion = false) {
  if (!slides?.length) return false;
  const state = prepare(slides);
  let value = clamp(Number.isFinite(position) ? position : 0, 0, slides.length - 1);
  const nearest = Math.round(value);
  // The journey spring stops within a small tolerance; clear all compositing styles.
  if (reducedMotion || Math.abs(value - nearest) < .0005) value = nearest;
  if (state.position === value && state.reducedMotion === reducedMotion) return false;
  state.position = value;
  state.reducedMotion = reducedMotion;
  const lower = Math.floor(value), upper = Math.ceil(value), progress = value - lower;

  if (lower === upper) {
    state.pages.forEach((entry, index) => settle(entry, index === lower));
    return true;
  }

  const tension = Math.sin(progress * Math.PI);
  const boundary = 100 * (1 - progress);
  // A shallow, smooth bow sampled as a widely supported polygon (including Safari).
  // Both masks share precisely the same edge; no direction bookkeeping can jump.
  const edge = Array.from({length: 13}, (_, index) => {
    const y = index / 12;
    const x = boundary + 3.2 * tension * Math.sin(y * Math.PI);
    return `${percent(x)} ${percent(y * 100)}`;
  });
  const left = `polygon(0% 0%, ${edge.join(', ')}, 0% 100%)`;
  const right = `polygon(${edge[0]}, 100% 0%, 100% 100%, ${edge.slice().reverse().join(', ')})`;
  state.pages.forEach((entry, index) => {
    if (index === lower) reveal(entry, left, -1, tension);
    else if (index === upper) reveal(entry, right, 1, tension);
    else settle(entry, false);
  });
  return true;
}
