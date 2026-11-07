/* WORKSPACE ACTIVITY V2 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Activity, Flame, CalendarDays } from "lucide-react";
import { supabase } from "../client";
import "./WorkspaceActivity.css";

const DAY = 86400000;
const TYPES = {
  task_created: "Tareas creadas",
  task_completed: "Finalizaciones recuperadas",
  task_status_changed: "Cambios de estado",
  note_created: "Notas creadas",
  note_edited: "Ediciones de notas"
};

/* WORKSPACE PERFORMANCE V1 */
const LIMA_DAY_FORMATTER = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Lima",
  year: "numeric", month: "2-digit", day: "2-digit"
});

function limaDay(value = new Date()) {
  return LIMA_DAY_FORMATTER.format(new Date(value));
}

function shiftDay(key, amount) {
  return new Date(Date.parse(`${key}T12:00:00Z`) + amount * DAY)
    .toISOString().slice(0, 10);
}

function displayDay(key) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
  }).format(new Date(`${key}T12:00:00Z`));
}

function readCache(userId) {
  try {
    const cached = JSON.parse(
      sessionStorage.getItem(`workspace-activity:${userId}`) || "null"
    );
    return Array.isArray(cached) ? cached : null;
  } catch {
    return null;
  }
}

export default function WorkspaceActivity({ userId, projects = [] }) {
  const [rows, setRows] = useState(() => readCache(userId) || []);
  const [loading, setLoading] = useState(() => readCache(userId) === null);
  const [error, setError] = useState("");
  const [projectId, setProjectId] = useState("");
  const [kind, setKind] = useState("");
  const [selected, setSelected] = useState(null);
  const [today, setToday] = useState(() => limaDay());
  const firstDay = shiftDay(today, -364);

  /* ACTIVITY RECENT POSITION V3 */
  const calendarScrollRef = useRef(null);

  useLayoutEffect(() => {
    if (loading) return undefined;

    const element = calendarScrollRef.current;
    if (!element) return undefined;

    let pinnedToLatest = true;
    let previousWidth = element.clientWidth;

    function showLatest() {
      element.scrollLeft = Math.max(
        0,
        element.scrollWidth - element.clientWidth
      );
    }

    function onScroll() {
      const distance = element.scrollWidth -
        element.clientWidth - element.scrollLeft;
      pinnedToLatest = distance <= 16;
    }

    // Posicionar antes de pintar, sin recorrer todo el año visualmente.
    showLatest();
    element.addEventListener("scroll", onScroll, { passive: true });

    const observer = new ResizeObserver(() => {
      if (element.clientWidth === previousWidth) return;
      previousWidth = element.clientWidth;
      if (pinnedToLatest) showLatest();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", onScroll);
    };
  }, [loading, today]);


  useEffect(() => {
    let active = true;
    let running = false;
    let lastRefresh = 0;

    const cached = readCache(userId);
    setRows(cached || []);
    setLoading(cached === null);

    async function refresh() {
      if (!userId || !active || running || Date.now() - lastRefresh < 10000) return;
      running = true;

      try {
        const currentDay = limaDay();
        const from = shiftDay(currentDay, -364);
        const until = shiftDay(currentDay, 1);
        const next = [];

        for (let offset = 0; ; offset += 1000) {
          const { data, error: queryError } = await supabase
            .from("workspace_activity")
            .select("id,project_id,kind,occurred_at,source")
            .eq("owner_id", userId)
            .gte("occurred_at", `${from}T00:00:00-05:00`)
            .lt("occurred_at", `${until}T00:00:00-05:00`)
            .order("occurred_at", { ascending: true })
            .order("id", { ascending: true })
            .range(offset, offset + 999);

          if (queryError) throw queryError;
          if (!active) return;

          next.push(...(data || []));
          if ((data || []).length < 1000) break;
        }

        if (!active) return;
        setRows(current => {
          const unchanged = current.length === next.length &&
            current.every((row, index) =>
              row.id === next[index].id &&
              row.project_id === next[index].project_id &&
              row.kind === next[index].kind &&
              row.occurred_at === next[index].occurred_at &&
              row.source === next[index].source
            );
          return unchanged ? current : next;
        });
        lastRefresh = Date.now();
        setToday(currentDay);
        setError("");

        try {
          sessionStorage.setItem(
            `workspace-activity:${userId}`, JSON.stringify(next)
          );
        } catch {}
      } catch (err) {
        if (active) setError(err.message || "No se pudo cargar la actividad.");
      } finally {
        running = false;
        if (active) setLoading(false);
      }
    }

    function onFocus() {
      void refresh();
    }

    void refresh();
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 300000);

    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [userId]);

  const data = useMemo(() => {
    const days = new Map();

    for (const row of rows) {
      if (projectId && row.project_id !== projectId) continue;
      if (kind && row.kind !== kind) continue;

      const key = limaDay(row.occurred_at);
      if (key < firstDay || key > today) continue;
      const current = days.get(key) || [];
      current.push(row);
      days.set(key, current);
    }

    const total = [...days.values()].reduce((sum, items) => sum + items.length, 0);
    let streak = 0;
    let cursor = days.has(today) ? today : shiftDay(today, -1);

    while (days.has(cursor)) {
      streak += 1;
      cursor = shiftDay(cursor, -1);
    }

    return { days, total, activeDays: days.size, streak };
  }, [rows, projectId, kind, firstDay, today]);

  const grid = useMemo(() => {
    const weekday = new Date(`${firstDay}T12:00:00Z`).getUTCDay();
    const padding = (weekday + 6) % 7;
    const cells = Array.from({ length: padding }, () => null);

    for (let index = 0; index < 365; index++) {
      cells.push(shiftDay(firstDay, index));
    }

    while (cells.length % 7) cells.push(null);
    return cells;
  }, [firstDay]);

  const selectedRows = selected ? data.days.get(selected) || [] : [];
  const selectedCounts = selectedRows.reduce((counts, row) => {
    counts[row.kind] = (counts[row.kind] || 0) + 1;
    return counts;
  }, {});

  return (
    <section className="wa-root" aria-label="Actividad del espacio personal">
      <header className="wa-heading">
        <div>
          <span className="wa-eyebrow"><Activity size={14} /> TU CONSTANCIA</span>
          <h2>Actividad del workspace</h2>
          <p>Un día a la vez. Tus avances de los últimos 12 meses.</p>
        </div>
        <div className="wa-filters">
          <select aria-label="Filtrar actividad por proyecto"
            value={projectId} onChange={event => setProjectId(event.target.value)}>
            <option value="">Todos los proyectos</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.title}</option>
            ))}
          </select>
          <select aria-label="Filtrar tipo de actividad"
            value={kind} onChange={event => setKind(event.target.value)}>
            <option value="">Toda la actividad</option>
            {Object.entries(TYPES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="wa-stats">
        <div><Activity size={17} /><strong>{data.total}</strong><span>actividades</span></div>
        <div><CalendarDays size={17} /><strong>{data.activeDays}</strong><span>días activos</span></div>
        <div><Flame size={17} /><strong>{data.streak}</strong><span>días de racha actual</span></div>
      </div>

      {error && <p className="wa-error" role="alert">{error}</p>}

      {loading ? (
        <div className="wa-loading" role="status">Cargando tu actividad</div>
      ) : (
        <>
          <div className="wa-scroll" ref={calendarScrollRef} tabIndex={0} aria-label="Calendario de actividad, desplázate para ver otros meses">
            <div className="wa-calendar">
              <div className="wa-months">
                {Array.from({ length: grid.length / 7 }, (_, week) => {
                  const day = grid.slice(week * 7, week * 7 + 7).find(Boolean);
                  const previous = week > 0
                    ? grid.slice((week - 1) * 7, week * 7).find(Boolean)
                    : null;
                  const show = day && (!previous || day.slice(0, 7) !== previous.slice(0, 7));
                  return <span key={week}>{show
                    ? new Intl.DateTimeFormat("es-PE", {
                        month: "short", timeZone: "UTC"
                      }).format(new Date(`${day}T12:00:00Z`)).replace(".", "")
                    : ""}</span>;
                })}
              </div>
              <div className="wa-grid">
                {grid.map((day, index) => {
                  if (!day) return <span className="wa-spacer" key={`space-${index}`} />;
                  const count = data.days.get(day)?.length || 0;
                  const level = count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4;
                  const label = `${displayDay(day)}: ${count} actividades`;
                  return (
                    <button key={day} type="button"
                      className={`wa-cell wa-level-${level}${selected === day ? " wa-selected" : ""}`}
                      title={label} aria-label={label}
                      aria-pressed={selected === day}
                      onClick={() => setSelected(day)} />
                  );
                })}
              </div>
            </div>
          </div>

          <footer className="wa-footer">
            <span>Fechas de Perú · tareas y notas</span>
            <div className="wa-legend">
              <span>Menos</span>
              {[0, 1, 2, 3, 4].map(level => (
                <i key={level} className={`wa-level-${level}`} />
              ))}
              <span>Más</span>
            </div>
          </footer>

          {selected ? (
            <div className="wa-detail">
              <strong>{displayDay(selected)}</strong>
              {selectedRows.some(row => row.source === "historical") && (
                <p className="wa-history-label">
                  {selectedRows.filter(row => row.source === "historical").length} actividades recuperadas de fechas existentes
                </p>
              )}
              {selectedRows.length ? (
                <div className="wa-detail-items">
                  {Object.entries(selectedCounts).map(([type, count]) => (
                    <span key={type}>{TYPES[type] || type}<b>{count}</b></span>
                  ))}
                </div>
              ) : <p>No hay actividad registrada este día.</p>}
            </div>
          ) : (
            <p className="wa-hint">
              Selecciona un día para explorar tus avances. Incluye fechas recuperadas del historial.
            </p>
          )}
        </>
      )}
    </section>
  );
}