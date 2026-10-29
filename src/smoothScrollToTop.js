let cancelCurrent = null;

export function smoothScrollToTop() {
  if (cancelCurrent) cancelCurrent();

  const startY = window.scrollY;
  if (startY <= 0) return;

  const html = document.documentElement;
  const body = document.body;

  const originals = [html, body].map(element => ({
    element,
    value: element.style.getPropertyValue("scroll-behavior"),
    priority: element.style.getPropertyPriority("scroll-behavior")
  }));

  originals.forEach(({ element }) => {
    element.style.setProperty("scroll-behavior", "auto", "important");
  });

  const duration = 5000;
  const startTime = performance.now();

  let frame = null;
  let stopped = false;

  function cleanup() {
    if (stopped) return;
    stopped = true;

    if (frame !== null) cancelAnimationFrame(frame);

    window.removeEventListener("wheel", cancel, true);
    window.removeEventListener("touchstart", cancel, true);
    window.removeEventListener("pointerdown", cancel, true);
    window.removeEventListener("keydown", onKey, true);

    originals.forEach(({ element, value, priority }) => {
      if (value) {
        element.style.setProperty("scroll-behavior", value, priority);
      } else {
        element.style.removeProperty("scroll-behavior");
      }
    });

    cancelCurrent = null;
  }

  function cancel() {
    cleanup();
  }

  function onKey(event) {
    if ([
      "ArrowUp", "ArrowDown",
      "PageUp", "PageDown",
      "Home", "End", " "
    ].includes(event.key)) {
      cancel();
    }
  }

  cancelCurrent = cancel;

  window.addEventListener("wheel", cancel, { capture: true, passive: true });
  window.addEventListener("touchstart", cancel, { capture: true, passive: true });
  window.addEventListener("pointerdown", cancel, { capture: true, passive: true });
  window.addEventListener("keydown", onKey, true);

  function easing(t) {
    // Primera fase: despegue rapido y frenado prolongado.
    if (t <= 0.88) {
      const p = t / 0.88;
      const eased = 1 - Math.pow(1 - p, 5);
      return 0.985 * eased;
    }

    // Fase final: pequeño impulso para completar el recorrido.
    const p = (t - 0.88) / 0.12;
    const eased = p * p * (3 - 2 * p);

    return 0.985 + 0.015 * eased;
  }

  function animate(now) {
    if (stopped) return;

    const t = Math.min((now - startTime) / duration, 1);
    const progress = easing(t);

    window.scrollTo({
      top: Math.max(0, startY * (1 - progress)),
      behavior: "instant"
    });

    if (t < 1) {
      frame = requestAnimationFrame(animate);
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
      cleanup();
    }
  }

  frame = requestAnimationFrame(animate);
}
