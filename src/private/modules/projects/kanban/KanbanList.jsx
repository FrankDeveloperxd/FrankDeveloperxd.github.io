import React, {
  useEffect,
  useRef,
  useState
} from "react";

import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUp,
  ChevronsDown,
  Equal,
  Clock3,
  Play,
  Pause,
  Pencil,
  Trash2,
  RotateCcw,
  X
} from "lucide-react";

import "./KanbanList.css";

const PAGE_SIZE = 25;

const STATES = [
  ["todo", "Por hacer"],
  ["doing", "En proceso"],
  ["done", "Terminado"]
];

const PRIORITIES = [
  ["high", "Alta"],
  ["medium", "Media"],
  ["low", "Baja"]
];

const PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2
};

function priorityOf(task) {
  return Object.hasOwn(PRIORITY_ORDER, task.priority)
    ? task.priority
    : "medium";
}

function matchesStatus(task, status) {
  return status === "all" || task.status === status;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
}

export default function KanbanList({
  tasks,
  formatTime,
  onStatus,
  onPriority,
  onPause,
  onEdit,
  onDelete,
  deletingId,
  busy
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [pending, setPending] = useState(null);
  const [actionError, setActionError] = useState("");

  const operation = useRef(false);
  const scrollRef = useRef(null);


  const normalizedQuery = normalize(query);

  const filtered = tasks.filter(task =>
    matchesStatus(task, status) &&
    normalize(task.title).includes(normalizedQuery)
  );

  const pageCount = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, pageCount);

  const first = (currentPage - 1) * PAGE_SIZE;

  const visible = filtered.slice(
    first,
    first + PAGE_SIZE
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [currentPage, query, status]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  function updateFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  function resetFilters() {
    setQuery("");
    setStatus("all");
    setPage(1);
  }

  async function run(task, action) {
    if (busy || operation.current) return;

    if (String(task.id).startsWith("pending-")) {
      return;
    }

    operation.current = true;
    setPending(task.id);
    setActionError("");

    try {
      await action();
    } catch {
      setActionError(
        "No se pudo completar la operacion."
      );
    } finally {
      operation.current = false;
      setPending(null);
    }
  }

  function countFor(value) {
    return tasks.filter(task =>
      matchesStatus(task, value)
    ).length;
  }

  function isDisabled(task) {
    return busy ||
      pending !== null ||
      deletingId === task.id ||
      String(task.id).startsWith("pending-");
  }

  return (
    <section
      className="kb-list kbl-jira"
      aria-label="Lista de tareas"
    >

      {/* BUSQUEDA Y ESTADOS */}

      <div className="kbl-toolbar">

        <div className="kbl-search">
          <Search size={19} aria-hidden="true"/>

          <input
            type="search"
            value={query}
            placeholder="Buscar tareas..."
            aria-label="Buscar tareas"
            onChange={event =>
              updateFilter(setQuery, event.target.value)
            }
          />

          {query && (
            <button
              type="button"
              title="Limpiar búsqueda"
              aria-label="Limpiar búsqueda"
              onClick={() => updateFilter(setQuery, "")}
            >
              <X size={16}/>
            </button>
          )}
        </div>

        <div
          className="kbl-status-tabs"
          role="group"
          aria-label="Filtrar tareas por estado"
        >
          {[["all", "Todas"], ...STATES].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={"kbl-tab kbl-tab-" + value}
              aria-pressed={status === value}
              onClick={() => updateFilter(setStatus, value)}
              title={label + " (" + countFor(value) + ")"}
            >
              {value !== "all" && (
                <span className="kbl-tab-dot" aria-hidden="true"/>
              )}

              <span>{label}</span>
              <small>{countFor(value)}</small>
            </button>
          ))}
        </div>

      </div>

      {actionError && (
        <div className="kbl-action-error" role="alert">
          {actionError}
        </div>
      )}

      {/* TABLA REAL */}

      <div
        className="kbl-table-scroll"
        ref={scrollRef}
        tabIndex={0}
        role="region"
        aria-label="Tabla desplazable de tareas"
      >
        <table className="kbl-table">

          <thead>
            <tr>
              <th scope="col">Tarea</th>

              <th scope="col" className="kbl-state-cell">
                Estado
              </th>

              <th scope="col" className="kbl-priority-cell">
                Prioridad
              </th>

              <th scope="col" className="kbl-time-cell">
                Tiempo
              </th>

              <th scope="col" className="kbl-actions-cell">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody>

            {visible.map(task => {
              const level = priorityOf(task);
              const disabled = isDisabled(task);

              const PriorityIcon =
                level === "high"
                  ? ChevronsUp
                  : level === "low"
                    ? ChevronsDown
                    : Equal;

              const duration = formatTime(task);

              return (
                <tr
                  key={task.id}
                  className={
                    "kbl-row kbl-level-" + level +
                    (deletingId === task.id
                      ? " kb-removing"
                      : "")
                  }
                >

                  <td>
                    <div className="kbl-task">
                      <span
                        className="kbl-task-marker"
                        aria-hidden="true"
                      />

                      <div className="kbl-task-copy">
                        <strong>{task.title}</strong>

                        <div className="kbl-inline-time">
                          <Clock3 size={13}/>
                          <span>{duration}</span>

                          {task.estimated_minutes != null && (
                            <small>
                              Est. {Math.floor(
                                task.estimated_minutes / 60
                              )}h{" "}
                              {task.estimated_minutes % 60}m
                            </small>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="kbl-state-cell">

                    <div
                      className={
                        "kbl-state-control kbl-state-" +
                        task.status
                      }
                    >
                      <select
                        aria-label={"Estado de " + task.title}
                        value={task.status}
                        disabled={disabled}
                        onChange={event => {
                          const next = event.target.value;

                          void run(
                            task,
                            () => onStatus(task, next)
                          );
                        }}
                      >
                        {STATES.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>

                      <ChevronDown
                        size={14}
                        aria-hidden="true"
                      />
                    </div>

                  </td>

                  <td className="kbl-priority-cell">

                    <div className="kbl-priority-control">
                      <PriorityIcon
                        size={20}
                        strokeWidth={2.4}
                        aria-hidden="true"
                      />

                      <select
                        value={level}
                        disabled={disabled}
                        aria-label={
                          "Prioridad de " + task.title
                        }
                        onChange={event => {
                          const next = event.target.value;

                          void run(
                            task,
                            () => onPriority(task, next)
                          );
                        }}
                      >
                        {PRIORITIES.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>

                      <ChevronDown
                        size={12}
                        aria-hidden="true"
                      />
                    </div>

                  </td>

                  <td className="kbl-time-cell">
                    <div className="kbl-time">
                      <span>
                        <Clock3 size={14}/>
                        {duration}
                      </span>

                      {task.estimated_minutes != null && (
                        <small>
                          Est. {Math.floor(
                            task.estimated_minutes / 60
                          )}h{" "}
                          {task.estimated_minutes % 60}m
                        </small>
                      )}
                    </div>
                  </td>

                  <td className="kbl-actions-cell">

                    <div className="kbl-actions">

                      {task.status === "doing" && (
                        <button
                          type="button"
                          className="kbl-action-pause"
                          disabled={disabled}
                          title={
                            task.is_paused
                              ? "Reanudar reloj"
                              : "Pausar reloj"
                          }
                          aria-label={
                            task.is_paused
                              ? "Reanudar reloj"
                              : "Pausar reloj"
                          }
                          onClick={() =>
                            void run(
                              task,
                              () => onPause(task)
                            )
                          }
                        >
                          {task.is_paused
                            ? <Play size={15}/>
                            : <Pause size={15}/>}
                        </button>
                      )}

                      <button
                        type="button"
                        className="kbl-action-edit"
                        title="Editar tarea"
                        aria-label={"Editar " + task.title}
                        disabled={disabled}
                        onClick={() => onEdit(task)}
                      >
                        <Pencil size={16}/>
                      </button>

                      <button
                        type="button"
                        className="kbl-action-delete"
                        title="Eliminar tarea"
                        aria-label={"Eliminar " + task.title}
                        disabled={disabled}
                        onClick={() => onDelete(task)}
                      >
                        <Trash2 size={16}/>
                      </button>

                    </div>
                  </td>
                </tr>
              );
            })}

          </tbody>
        </table>

        {!visible.length && (
          <div className="kbl-empty">
            <div className="kbl-empty-icon">
              <Search size={26}/>
            </div>

            <strong>
              {tasks.length
                ? "No se encontraron tareas"
                : "Todavia no hay tareas"}
            </strong>

            <span>
              {tasks.length
                ? "Prueba con otros filtros o terminos."
                : "Agrega una tarea para comenzar."}
            </span>

            {tasks.length > 0 && (
              <button
                type="button"
                onClick={resetFilters}
              >
                <RotateCcw size={15}/>
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* PAGINACION */}

      <footer className="kbl-footer">
        <span aria-live="polite">
          {filtered.length
            ? (first + 1) + "-" +
              Math.min(
                first + PAGE_SIZE,
                filtered.length
              )
            : "0"}{" "}
          de {filtered.length} tareas
          {filtered.length !== tasks.length &&
            " (" + tasks.length + " en total)"}
        </span>

        <div className="kbl-pagination">
          <button
            type="button"
            title="Pagina anterior"
            aria-label="Pagina anterior"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft size={18}/>
          </button>

          <strong>
            {currentPage} / {pageCount}
          </strong>

          <button
            type="button"
            title="Pagina siguiente"
            aria-label="Pagina siguiente"
            disabled={currentPage >= pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRight size={18}/>
          </button>
        </div>
      </footer>

    </section>
  );
}
