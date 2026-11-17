// Only explicit actions use a blocking result. Autosave and rapid marks stay inline.
export function confirmWorkspace(options) {
  return new Promise(resolve => {
    const detail = { ...options, resolve, handled: false };
    window.dispatchEvent(new CustomEvent('workspace:confirm', { detail }));
    if (!detail.handled) resolve(false);
  });
}

// Pure controller: one floating window at a time, including its closing animation.
export function createFeedbackController(onChange, clock = globalThis) {
  let active = null, queue = [], disposed = false, timers = [];
  let lastMessage = '', lastTime = -Infinity;
  const later = (fn, ms) => { const id = clock.setTimeout(fn, ms); timers.push(id); };
  const publish = () => onChange(active ? { ...active } : null);
  function next() {
    if (disposed || active || !queue.length) return;
    active = { ...queue.shift(), phase: 'opening' }; publish();
    const id = active.id;
    later(() => {
      if (active?.id === id && active.phase === 'opening') { active.phase = 'visible'; publish(); }
    }, 200);
    if (active.kind === 'success') later(() => close(), 1380);
  }
  function close(answer = false) {
    if (!active || active.phase === 'closing') return;
    active.phase = 'closing'; publish();
    const current = active;
    later(() => {
      if (disposed) return;
      timers.forEach(id => clock.clearTimeout(id)); timers = [];
      active = null; publish();
      current.resolve?.(answer);
      next();
    }, 220);
  }
  return {
    success(message) {
      if (disposed || !message) return;
      const now = clock.Date?.now?.() ?? Date.now();
      if (lastMessage === message && now - lastTime < 600) return;
      lastMessage = message; lastTime = now;
      queue.push({ kind:'success', id:crypto.randomUUID(), message }); next();
    },
    confirm(options) {
      if (disposed) { options.resolve(false); return; }
      queue.push({ ...options, kind:'confirm', id:crypto.randomUUID() }); next();
    },
    close,
    dispose() {
      disposed = true;
      timers.forEach(id => clock.clearTimeout(id)); timers = [];
      active?.resolve?.(false); queue.forEach(item => item.resolve?.(false));
      active = null; queue = [];
    }
  };
}
