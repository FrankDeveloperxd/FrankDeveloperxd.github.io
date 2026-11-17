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
    if (['success','error','info'].includes(active.kind)) later(() => { if(active?.id===id) close(); }, active.kind==='error'?2400:1380);
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
    loading(message) {
      if (disposed || active) return;
      queue.push({kind:'loading', id:crypto.randomUUID(), message}); next();
    },
    result(kind,message) {
      if (disposed || !message) return;
      const now = clock.Date?.now?.() ?? Date.now();
      if (lastMessage === kind+message && now-lastTime<600) return;
      lastMessage=kind+message; lastTime=now;
      if(active?.kind==='loading') {
        timers.forEach(id=>clock.clearTimeout(id)); timers=[];
        active=null;
        queue.unshift({kind,id:crypto.randomUUID(),message}); next();
      } else { queue.push({kind,id:crypto.randomUUID(),message}); next(); }
    },
    success(message) { this.result('success',message); },
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
