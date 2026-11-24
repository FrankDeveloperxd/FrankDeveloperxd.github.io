// Only explicit actions use a blocking result. Autosave and rapid marks stay inline.
export function confirmWorkspace(options) {
  return new Promise(resolve => {
    const detail = { ...options, resolve, handled: false };
    window.dispatchEvent(new CustomEvent('workspace:confirm', { detail }));
    if (!detail.handled) resolve(false);
  });
}

// Una sola ventana a la vez. Se desmonta al terminar su animacion de salida.
// Un fallback protege los casos de reduced motion o animationend no disparado.
export function createFeedbackController(onChange, clock = globalThis) {
  const VISIBLE_MS = { success: 1450, info: 1450, error: 1900, warning: 1700 };
  const EXIT_FALLBACK_MS = 280;
  const MORPH_MS = 110;
  let active = null, queue = [], disposed = false;
  const timers = new Set();
  let lastMessage = '', lastTime = -Infinity;

  const later = (fn, ms) => {
    const id = clock.setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
  };
  const clearTimers = () => {
    for (const id of timers) clock.clearTimeout(id);
    timers.clear();
  };
  const publish = () => onChange(active ? { ...active } : null);

  function scheduleResultClose(id, kind) {
    later(() => {
      if (active?.id === id && active.kind === kind && active.phase !== 'closing') close();
    }, VISIBLE_MS[kind] ?? VISIBLE_MS.info);
  }

  function next() {
    if (disposed || active || !queue.length) return;
    active = { ...queue.shift(), phase: 'opening', morphing: false };
    publish();
    const id = active.id;
    later(() => {
      if (active?.id === id && active.phase === 'opening') {
        active.phase = 'visible';
        publish();
      }
    }, 220);
    if (active.kind in VISIBLE_MS) scheduleResultClose(id, active.kind);
  }

  function finishClose(id) {
    if (disposed || !active || active.id !== id || active.phase !== 'closing') return;
    const finished = active;
    clearTimers();
    active = null;
    publish();
    finished.resolve?.(finished.answer ?? false);
    next();
  }

  function close(answer = false) {
    if (!active || active.phase === 'closing') return;
    clearTimers();
    active = { ...active, phase: 'closing', answer };
    publish();
    const id = active.id;
    later(() => finishClose(id), EXIT_FALLBACK_MS);
  }

  return {
    loading(message) {
      if (disposed || active) return;
      queue.push({ kind: 'loading', id: crypto.randomUUID(), message });
      next();
    },
    result(kind, message) {
      if (disposed || !message) return;
      const now = clock.Date?.now?.() ?? Date.now();
      if (lastMessage === kind + message && now - lastTime < 600) return;
      lastMessage = kind + message;
      lastTime = now;

      // Mantener el mismo modal al pasar de carga al resultado.
      if (active?.kind === 'loading' && active.phase !== 'closing') {
        clearTimers();
        const id = active.id;
        active = { ...active, phase: 'visible', morphing: true };
        publish();
        later(() => {
          if (active?.id !== id || active.kind !== 'loading') return;
          active = { ...active, kind, message, morphing: false };
          publish();
          scheduleResultClose(id, kind);
        }, MORPH_MS);
      } else {
        queue.push({ kind, id: crypto.randomUUID(), message });
        next();
      }
    },
    success(message) { this.result('success', message); },
    confirm(options) {
      if (disposed) { options.resolve(false); return; }
      queue.push({ ...options, kind: 'confirm', id: crypto.randomUUID() });
      next();
    },
    close,
    finishClose,
    dispose() {
      disposed = true;
      clearTimers();
      active?.resolve?.(false);
      queue.forEach(item => item.resolve?.(false));
      active = null;
      queue = [];
    }
  };
}
