import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "../client";
import { notifyWorkspace } from "./WorkspaceToasts";
import "./WorkspaceCalendar.css";

const pad = n => String(n).padStart(2, "0");
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localInput = d => `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fromKey = key => { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); };
const firstDay = date => new Date(date.getFullYear(), date.getMonth(), 1);

function defaultDraft(day) {
  const start = new Date(day);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { title: "", description: "", project_id: "", start_at: localInput(start), end_at: localInput(end), all_day: false, reminder_minutes: "" };
}

export default function WorkspaceCalendar({ user, projects = [] }) {
  const [month, setMonth] = useState(() => firstDay(new Date()));
  const [selected, setSelected] = useState(() => dayKey(new Date()));
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const year = month.getFullYear(), monthIndex = month.getMonth();
  useEffect(() => {
    let active = true;
    const beginning = new Date(year, monthIndex, 1);
    const ending = new Date(year, monthIndex + 1, 1);
    setLoading(true);
    supabase.from("workspace_calendar_events").select("*")
      .eq("owner_id", user.id)
      .lt("start_at", ending.toISOString())
      .gt("end_at", beginning.toISOString())
      .order("start_at", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) notifyWorkspace("error", error.message);
        else setEvents(data || []);
        setLoading(false);
      });
    return () => { active = false; };
  }, [year, monthIndex, user.id]);

  async function reload() {
    const beginning = new Date(year, monthIndex, 1);
    const ending = new Date(year, monthIndex + 1, 1);
    const { data, error } = await supabase.from("workspace_calendar_events")
      .select("*").eq("owner_id", user.id)
      .lt("start_at", ending.toISOString()).gt("end_at", beginning.toISOString())
      .order("start_at", { ascending: true });
    if (error) notifyWorkspace("error", error.message);
    else setEvents(data || []);
  }

  const days = useMemo(() => {
    const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const count = new Date(year, monthIndex + 1, 0).getDate();
    return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, i) => new Date(year, monthIndex, i + 1))];
  }, [year, monthIndex]);

  function eventsFor(day) {
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    return events.filter(item => new Date(item.start_at) < end && new Date(item.end_at) > start);
  }

  function newEvent() { setEditingId(null); setDraft(defaultDraft(fromKey(selected))); }
  function editEvent(item) {
    setEditingId(item.id);
    setDraft({ title: item.title, description: item.description || "", project_id: item.project_id || "", start_at: localInput(new Date(item.start_at)), end_at: localInput(new Date(item.end_at)), all_day: !!item.all_day, reminder_minutes: item.reminder_minutes ?? "" });
  }
  function update(field, value) { setDraft(current => ({ ...current, [field]: value })); }

  async function save(e) {
    e.preventDefault();
    if (saving || !draft) return;
    const start = new Date(draft.start_at), end = new Date(draft.end_at);
    if (!draft.title.trim() || isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      notifyWorkspace("error", "Verifica el titulo y las horas del evento."); return;
    }
    const payload = { title: draft.title.trim(), description: draft.description.trim(), project_id: draft.project_id || null,
      start_at: start.toISOString(), end_at: end.toISOString(), all_day: draft.all_day,
      reminder_minutes: draft.reminder_minutes === "" ? null : Number(draft.reminder_minutes), updated_at: new Date().toISOString() };
    setSaving(true);
    try {
      const result = editingId
        ? await supabase.from("workspace_calendar_events").update(payload).eq("id", editingId).eq("owner_id", user.id)
        : await supabase.from("workspace_calendar_events").insert({ ...payload, owner_id: user.id });
      if (result.error) throw result.error;
      setDraft(null);
      notifyWorkspace("success", editingId ? "Evento actualizado." : "Evento creado.");
      await reload();
    } catch (error) { notifyWorkspace("error", error.message); }
    finally { setSaving(false); }
  }

  async function remove(item) {
    if (!window.confirm(`¿Eliminar el evento "${item.title}"?`)) return;
    const { error } = await supabase.from("workspace_calendar_events").delete().eq("id", item.id).eq("owner_id", user.id);
    if (error) notifyWorkspace("error", error.message);
    else { notifyWorkspace("success", "Evento eliminado."); await reload(); }
  }

  const selectedDate = fromKey(selected);
  return (
    <section className="wc-root">
      <header className="wc-header">
        <div><span className="wc-eyebrow">ORGANIZACION PERSONAL</span><h1>Mi calendario</h1><p>Organiza tus eventos y vincúlalos con tus proyectos.</p></div>
        <button className="wc-primary" type="button" onClick={newEvent}><Plus size={17}/> Nuevo evento</button>
      </header>
      <div className="wc-layout">
        <section className="wc-panel" aria-label="Calendario mensual">
          <div className="wc-monthbar">
            <strong>{month.toLocaleDateString("es-PE", { month: "long", year: "numeric" })}</strong>
            <div className="wc-month-actions">
              <button type="button" onClick={() => { const now = new Date(); setMonth(firstDay(now)); setSelected(dayKey(now)); }}>Hoy</button>
              <button type="button" aria-label="Mes anterior" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}><ChevronLeft size={18}/></button>
              <button type="button" aria-label="Mes siguiente" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}><ChevronRight size={18}/></button>
            </div>
          </div>
          <div className="wc-days">
            {["L","M","M","J","V","S","D"].map((letter, i) => <span className="wc-weekday" key={i}>{letter}</span>)}
            {days.map((day, i) => day ?
              <button key={dayKey(day)} type="button" aria-pressed={dayKey(day) === selected} aria-label={day.toLocaleDateString("es-PE")}
                className={`wc-day${dayKey(day) === selected ? " is-selected" : ""}${dayKey(day) === dayKey(new Date()) ? " is-today" : ""}`}
                onClick={() => setSelected(dayKey(day))}>
                <span>{day.getDate()}</span>{eventsFor(day).length > 0 && <i aria-hidden="true"/>}
              </button> : <span className="wc-day-empty" key={`empty-${i}`}/>)}
          </div>
        </section>
        <aside className="wc-panel wc-agenda">
          <span className="wc-eyebrow">AGENDA DEL DIA</span>
          <h2>{selectedDate.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}</h2>
          {loading ? <p className="wc-muted">Cargando eventos...</p> : eventsFor(selectedDate).length === 0 ?
            <div className="wc-empty"><CalendarDays size={28}/><p>No hay eventos este día.</p><button type="button" onClick={newEvent}>Crear evento</button></div> :
            <div className="wc-event-list">{eventsFor(selectedDate).map(item =>
              <article className="wc-event" key={item.id}>
                <div className="wc-event-main"><strong>{item.title}</strong><small>{item.all_day ? "Todo el día" : `${new Date(item.start_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })} - ${new Date(item.end_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`}</small>
                  {item.project_id && <small>{projects.find(p => p.id === item.project_id)?.title || "Proyecto"}</small>}
                  {item.description && <p>{item.description}</p>}
                </div>
                <div className="wc-event-actions">
                  <button type="button" aria-label={`Editar ${item.title}`} onClick={() => editEvent(item)}><Pencil size={16}/></button>
                  <button type="button" aria-label={`Eliminar ${item.title}`} onClick={() => remove(item)}><Trash2 size={16}/></button>
                </div>
              </article>
            )}</div>}
        </aside>
      </div>
      {draft && <div className="wc-overlay" onMouseDown={e => { if (e.target === e.currentTarget && !saving) setDraft(null); }}>
        <form className="wc-dialog" role="dialog" aria-modal="true" aria-labelledby="wc-dialog-title" onSubmit={save}>
          <div className="wc-dialog-top"><h2 id="wc-dialog-title">{editingId ? "Editar evento" : "Nuevo evento"}</h2><button type="button" disabled={saving} aria-label="Cerrar" onClick={() => setDraft(null)}><X size={19}/></button></div>
          <label>Nombre del evento<input autoFocus required maxLength={200} value={draft.title} onChange={e => update("title", e.target.value)}/></label>
          <div className="wc-form-grid">
            <label>Inicio<input type="datetime-local" required value={draft.start_at} onChange={e => update("start_at", e.target.value)}/></label>
            <label>Fin<input type="datetime-local" required value={draft.end_at} onChange={e => update("end_at", e.target.value)}/></label>
          </div>
          <label className="wc-check"><input type="checkbox" checked={draft.all_day} onChange={e => update("all_day", e.target.checked)}/>Evento de día completo (etiqueta visual por ahora)</label>
          <label>Proyecto (opcional)<select value={draft.project_id} onChange={e => update("project_id", e.target.value)}><option value="">Sin proyecto</option>{projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
          <label>Recordatorio (configuración; no envía alertas aún)<select value={draft.reminder_minutes} onChange={e => update("reminder_minutes", e.target.value)}>
            <option value="">Sin recordatorio</option><option value="0">Al iniciar</option><option value="5">5 min antes</option><option value="15">15 min antes</option><option value="30">30 min antes</option><option value="60">1 hora antes</option><option value="1440">1 día antes</option>
          </select></label>
          <label>Descripción<textarea rows={3} value={draft.description} onChange={e => update("description", e.target.value)}/></label>
          <div className="wc-dialog-actions"><button type="button" disabled={saving} onClick={() => setDraft(null)}>Cancelar</button><button className="wc-primary" disabled={saving}>{saving ? "Guardando..." : "Guardar evento"}</button></div>
        </form>
      </div>}
    </section>
  );
}
