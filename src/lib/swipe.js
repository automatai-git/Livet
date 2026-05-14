export function attachSwipe(el, { onLeft, onRight, threshold = 60 } = {}) {
  if (!el) return () => {};
  let startX = null;
  let startY = null;

  const onStart = (e) => {
    const t = e.touches?.[0] ?? e;
    startX = t.clientX;
    startY = t.clientY;
  };
  const onEnd = (e) => {
    if (startX == null) return;
    const t = e.changedTouches?.[0] ?? e;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    startX = null; startY = null;
    if (Math.abs(dx) < threshold) return;
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) onLeft?.();
    else onRight?.();
  };

  el.addEventListener('touchstart', onStart, { passive: true });
  el.addEventListener('touchend', onEnd, { passive: true });
  return () => {
    el.removeEventListener('touchstart', onStart);
    el.removeEventListener('touchend', onEnd);
  };
}
