import { supabase } from '../../shared/services/client';
const PREFIX = 'workspace-habits-v3:';
const memory = new Map();
const flights = new Map();
const marks = new Map();
const listeners = new Map();
let timer, maxTimer, draining = false;
const markId = (owner, habit, day) => `${owner}:${habit}:${day}`;
export function watchHabitWrites(owner, callback) {
  if (!listeners.has(owner)) listeners.set(owner, new Set());
  listeners.get(owner).add(callback);
  return () => { listeners.get(owner)?.delete(callback); };
}
export function pendingHabitWrites(owner) {
  return [...marks.values()].filter(m => m.owner === owner && (m.sending || m.desired !== m.confirmed)).length;
}
export function overlayHabitMarks(owner, data) {
  if (!data) return data;
  let entries = [...data.entries];
  for (const m of marks.values()) {
    if (m.owner !== owner) continue;
    entries = entries.filter(e => !(e.habit_id === m.habit && e.day === m.day));
    if (m.desired) entries.push({ habit_id: m.habit, day: m.day });
  }
  return { ...data, entries };
}
function emit(owner, error = '') {
  const prefix = `${PREFIX}${owner}:`;
  // Persist the confirmed state only. Unsent optimistic marks remain in memory.
  for (const [key, data] of memory) if (key.startsWith(prefix)) {
    let entries = [...data.entries];
    const from = key.split(':').at(-2), to = key.split(':').at(-1);
    for (const m of marks.values()) {
      if (m.owner !== owner || m.day < from || m.day > to) continue;
      entries = entries.filter(e => !(e.habit_id === m.habit && e.day === m.day));
      if (m.confirmed) entries.push({ habit_id: m.habit, day: m.day });
    }
    const next = { ...data, entries };
    memory.set(key, next);
    try { sessionStorage.setItem(key, JSON.stringify(next)); } catch {}
  }
  for (const callback of listeners.get(owner) || []) callback(error);
}
export function queueHabitMark(owner, habit, day, desired, confirmed) {
  const key = markId(owner, habit, day);
  const m = marks.get(key) || { owner, habit, day, desired: confirmed, confirmed, revision: 0, sending: false };
  m.desired = desired; m.revision++; marks.set(key, m);
  emit(owner);
  clearTimeout(timer); timer = setTimeout(flushHabitWrites, 350);
  if (!maxTimer) maxTimer = setTimeout(flushHabitWrites, 1200);
}
export async function flushHabitWrites() {
  clearTimeout(timer); clearTimeout(maxTimer); maxTimer = undefined;
  if (draining) return;
  const batch = [...marks.values()].filter(m => !m.sending && m.desired !== m.confirmed).slice(0, 100)
    .map(m => { m.sending = true; return { m, desired: m.desired, revision: m.revision }; });
  if (!batch.length) return;
  draining = true;
  const owners = [...new Set(batch.map(b => b.m.owner))];
  await Promise.all(owners.map(async owner => {
    for (const desired of [true, false]) {
      const items = batch.filter(b => b.m.owner === owner && b.desired === desired);
      if (!items.length) continue;
      let error;
      try {
        const result = desired
          ? await supabase.from('workspace_habit_entries').upsert(items.map(({m}) => ({owner_id:owner,habit_id:m.habit,day:m.day})), {onConflict:'habit_id,day'})
          : await supabase.from('workspace_habit_entries').delete().eq('owner_id', owner)
            .or(items.map(({m}) => `and(habit_id.eq.${m.habit},day.eq.${m.day})`).join(','));
        error = result.error;
      } catch (err) { error = err; }
      for (const b of items) {
        if (marks.get(markId(owner,b.m.habit,b.m.day)) !== b.m) continue;
        b.m.sending = false;
        if (!error) b.m.confirmed = b.desired;
        else if (b.m.revision === b.revision) b.m.desired = b.m.confirmed;
      }
      emit(owner, error ? 'No se pudieron guardar algunas marcas. Se restauró su último estado confirmado. Puedes volver a intentarlo.' : '');
    }
  }));
  draining = false;
  if ([...marks.values()].some(m => m.desired !== m.confirmed)) timer = setTimeout(flushHabitWrites, 150);
}
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', event => {
    if ([...marks.values()].some(m => m.sending || m.desired !== m.confirmed)) {
      event.preventDefault(); event.returnValue = '';
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushHabitWrites();
  });
}
let epoch = 0;
export const habitsKey = (owner, from, to) => `${PREFIX}${owner}:${from}:${to}`;
export function readHabitsCache(key) {
  if (memory.has(key)) return memory.get(key);
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (value && Array.isArray(value.habits) && Array.isArray(value.entries)) {
      memory.set(key, value); return value;
    }
  } catch {}
  return null;
}
export function writeHabitsCache(key, value) {
  const next = { ...value, timestamp: Date.now() };
  memory.set(key, next);
  try {
    sessionStorage.setItem(key, JSON.stringify(next));
    const keys = Object.keys(sessionStorage).filter(k => k.startsWith(PREFIX));
    while (keys.length > 24) { const old = keys.shift(); sessionStorage.removeItem(old); memory.delete(old); }
  } catch {}
  return next;
}
export function clearHabitsCache(owner) {
  epoch++;
  const prefix = owner ? `${PREFIX}${owner}:` : PREFIX;
  for (const key of memory.keys()) if (key.startsWith(prefix)) memory.delete(key);
  flights.clear();
  for (const [key, m] of marks) if (!owner || m.owner === owner) marks.delete(key);
  try { Object.keys(sessionStorage).filter(k => k.startsWith(prefix)).forEach(k => sessionStorage.removeItem(k)); } catch {}
}
export function loadHabits(owner, from, to, force = false) {
  const key = habitsKey(owner, from, to), cached = readHabitsCache(key);
  if (!force && cached && Date.now() - cached.timestamp < 45000) return Promise.resolve(cached);
  if (flights.has(key)) return flights.get(key);
  const version = epoch;
  const acknowledged = [...marks.entries()].filter(([,m]) => m.owner === owner && !m.sending && m.desired === m.confirmed)
    .map(([id,m]) => ({id, m, revision:m.revision}));
  async function readEntries() {
    const all = [];
    for (let offset = 0;; offset += 1000) {
      const result = await supabase.from('workspace_habit_entries').select('habit_id,day')
        .eq('owner_id', owner).gte('day', from).lte('day', to)
        .order('habit_id').order('day').range(offset, offset + 999);
      if (result.error) return result;
      all.push(...(result.data || []));
      if ((result.data || []).length < 1000) return { data: all, error: null };
    }
  }
  const request = (async () => {
    const [h, e] = await Promise.all([
      supabase.from('workspace_habits').select('*').eq('owner_id', owner).order('created_at'),
      readEntries()
    ]);
    if (h.error || e.error) throw h.error || e.error;
    const value = { habits: h.data || [], entries: e.data || [] };
    if (version !== epoch) return value;
    for (const a of acknowledged) if (marks.get(a.id) === a.m && a.m.revision === a.revision && !a.m.sending) marks.delete(a.id);
    const confirmed = { ...value, entries: [...value.entries] };
    for (const m of marks.values()) {
      if (m.owner !== owner || m.day < from || m.day > to) continue;
      confirmed.entries = confirmed.entries.filter(e => !(e.habit_id === m.habit && e.day === m.day));
      if (m.confirmed) confirmed.entries.push({habit_id:m.habit,day:m.day});
    }
    writeHabitsCache(key, confirmed);
    return overlayHabitMarks(owner, confirmed);
  })();
  flights.set(key, request);
  request.finally(() => { if (flights.get(key) === request) flights.delete(key); }).catch(() => {});
  return request;
}
