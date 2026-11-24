export const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const keyOf = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const dateOf = key => new Date(`${key}T12:00:00`);
export function shift(date, days) { const d = new Date(date); d.setDate(d.getDate()+days); return d; }
export function weekStart(date) { return shift(date, -((date.getDay()+6)%7)); }
export function period(date, mode) {
  const start = mode === 'week' ? weekStart(date) : new Date(date.getFullYear(),date.getMonth(),1,12);
  const end = mode === 'week' ? shift(start,6) : new Date(date.getFullYear(),date.getMonth()+1,0,12);
  const days = [];
  for (let d = start; keyOf(d) <= keyOf(end); d = shift(d,1)) days.push(d);
  return { start, end, days, from:keyOf(start), to:keyOf(end) };
}
export function scheduleFor(habit, day) {
  const list = habit.schedule?.length ? habit.schedule : [{ from:habit.start_date, days:habit.weekdays }];
  let found;
  for (const version of [...list].sort((a,b) => a.from.localeCompare(b.from))) if (version.from <= day) found = version;
  return found?.days || [];
}
export function planned(habit, date) {
  const day = keyOf(date);
  return day >= habit.start_date && scheduleFor(habit,day).includes((date.getDay()+6)%7);
}
export const markKey = (id, day) => `${id}:${day}`;
export function metrics(habits, entries, days, today) {
  const marks = new Set(entries.map(e => markKey(e.habit_id,e.day)));
  let done=0, missed=0, pending=0, future=0;
  for (const h of habits) for (const date of days) {
    if (!planned(h,date)) continue;
    const day=keyOf(date);
    if (day > today) future++;
    else if (marks.has(markKey(h.id,day))) done++;
    else if (day < today) missed++;
    else pending++;
  }
  const due = done+missed+pending;
  return { done, missed, pending, future, due, rate:due ? Math.round(done/due*100) : null };
}
