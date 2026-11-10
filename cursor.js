// Compact charcoal arrow with blue hover, press, and drag feedback.
let mounted = null;

export function mountCursor() {
  if (mounted) return mounted;
  const root = document.documentElement;
  const mouseAvailable = matchMedia('(any-pointer: fine) and (any-hover: hover)');
  let press = null;
  let lastPointer = 'mouse';

  function state(value) { root.dataset.cursor = value; }
  function enabled(value) { root.dataset.cursorEnabled = String(value); }
  function idle() {
    if (press) return;
    state(root.dataset.cursorEnabled === 'true' && root.dataset.cursorHover === 'true' ? 'hover' : 'normal');
  }
  function reset() { press = null; idle(); }
  function clearHover() { root.dataset.cursorHover = 'false'; }
  function usePointer(event) {
    lastPointer = event.pointerType || 'mouse';
    enabled(lastPointer === 'mouse' && mouseAvailable.matches);
    if (lastPointer !== 'mouse' || !mouseAvailable.matches) clearHover();
    return lastPointer === 'mouse' && mouseAvailable.matches;
  }
  function onDown(event) {
    if (!usePointer(event) || event.button !== 0 || event.isPrimary === false) { reset(); return; }
    const element = event.target instanceof Element ? event.target : null;
    const draggable = Boolean(element?.closest('.page-zoom-viewport.is-zoomed') ||
      (element?.closest('#scene') && document.body.dataset.phase !== 'reading'));
    press = {id: event.pointerId, x: event.clientX, y: event.clientY, draggable, dragging: false};
    state('pressed');
  }
  function onMove(event) {
    if (!usePointer(event)) { reset(); return; }
    if (!(event.buttons & 1)) { reset(); return; }
    if (!press || press.id !== event.pointerId) return;
    if (press.draggable && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 5) press.dragging = true;
    state(press.dragging ? 'drag' : 'pressed');
  }
  function onUp(event) { usePointer(event); reset(); }
  function onLeave(event) { if (!event.relatedTarget) { clearHover(); reset(); } }
  function onBlur() { enabled(false); clearHover(); reset(); }
  function onVisibility() { if (document.hidden) onBlur(); else onMediaChange(); }
  function onMediaChange() {
    enabled(mouseAvailable.matches && lastPointer === 'mouse' && !document.hidden);
    if (root.dataset.cursorEnabled !== 'true') clearHover();
    reset();
  }
  // Scene hit-testing belongs to the journey; react even when it changes after
  // this module's pointer listener or while the geometry is moving under a mouse.
  const hoverObserver = new MutationObserver(idle);
  hoverObserver.observe(root, {attributes: true, attributeFilter: ['data-cursor-hover']});
  const options = {passive: true, capture: true};

  // Decode once before the first press so changing state does not wait on a fetch.
  const images = ['normal', 'hover', 'pressed', 'drag'].map(name => {
    const image = new Image();
    image.src = new URL('./assets/cursors/' + name + '.svg?v=4', import.meta.url).href;
    image.decode().catch(() => {});
    return image;
  });
  enabled(mouseAvailable.matches); reset();
  document.addEventListener('pointerdown', onDown, options);
  document.addEventListener('pointermove', onMove, options);
  document.addEventListener('pointerup', onUp, options);
  document.addEventListener('pointercancel', onUp, options);
  document.addEventListener('pointerout', onLeave, options);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', onMediaChange);
  mouseAvailable.addEventListener('change', onMediaChange);

  mounted = {
    destroy() {
      document.removeEventListener('pointerdown', onDown, options);
      document.removeEventListener('pointermove', onMove, options);
      document.removeEventListener('pointerup', onUp, options);
      document.removeEventListener('pointercancel', onUp, options);
      document.removeEventListener('pointerout', onLeave, options);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onMediaChange);
      mouseAvailable.removeEventListener('change', onMediaChange);
      hoverObserver.disconnect();
      images.length = 0;
      delete root.dataset.cursor;
      delete root.dataset.cursorEnabled;
      mounted = null;
    },
  };
  return mounted;
}
