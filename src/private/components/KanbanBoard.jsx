import React, { useEffect, useRef, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor,
  TouchSensor, KeyboardSensor,
  useSensor, useSensors, useDroppable,
  closestCorners, pointerWithin, rectIntersection
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus, Pencil, Trash2, Clock3, Play, Pause, Palette,
  Check, GripVertical, X
} from "lucide-react";
import { supabase } from "../client";
import "./KanbanBoard.css";

const stages = [
  { id: "todo", title: "Por hacer" },
  { id: "doing", title: "En proceso" },
  { id: "done", title: "Terminado" }
];

function elapsed(task, now) {
  let secs = Number(task.elapsed_seconds || 0);
  if (
    task.status === "doing" &&
    !task.is_paused &&
    task.timer_started_at
  ) {
    secs += Math.max(
      0,
      Math.floor((now - new Date(task.timer_started_at).getTime()) / 1000)
    );
  }
  return secs;
}

function displayTime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return (d ? `${d}d ` : "") +
    `${String(h).padStart(2, "0")}:` +
    `${String(m).padStart(2, "0")}:` +
    `${String(s).padStart(2, "0")}`;
}

function CardBody({ task, now, onEdit, onDelete, onPause, onPriority, priorityOpenId, onTogglePriority }) {
  const total = elapsed(task, now);
  const hasTime = task.status !== "todo" || total > 0;

  return (
    <>
      <div className="kb-card-head">
        <span className="kb-card-title">{task.title}</span>
        <GripVertical size={17} className="kb-grip" />
      </div>

      <div className="kb-card-bottom">
        <div className="kb-card-info">
          {hasTime && (
            <span className="kb-time">
              <Clock3 size={13}/>
              {displayTime(total)}
            </span>
          )}
          {task.estimated_minutes != null && (
            <span className="kb-estimate">
              Est. {Math.floor(task.estimated_minutes / 60)}h{" "}
              {task.estimated_minutes % 60}m
            </span>
          )}
          {!hasTime && task.estimated_minutes == null && (
            <span className="kb-empty-time">Sin iniciar</span>
          )}
        </div>

        <div className="kb-actions" data-no-drag>
          {onPriority && (
            <div className="kb-priority-control"
              onPointerDown={e => e.stopPropagation()}
              onTouchStart={e => e.stopPropagation()}>
              <button type="button" title="Cambiar prioridad"
                aria-label="Cambiar prioridad"
                aria-expanded={priorityOpenId === task.id}
                onClick={() => onTogglePriority(task.id)}>
                <Palette size={15}/>
              </button>
              {priorityOpenId === task.id && (
                <div className="kb-priority-menu"
                  role="group" aria-label="Prioridad de la tarea">
                  {[
                    ["low", "Baja", "kb-green"],
                    ["medium", "Media", "kb-yellow"],
                    ["high", "Alta", "kb-red"]
                  ].map(([value, label, color]) => (
                    <button key={value} type="button"
                      className="kb-priority-option"
                      onClick={() => onPriority(task, value)}>
                      <span className={"kb-priority-dot " + color}/>
                      {label}
                      {task.priority === value ? " " : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {task.status === "doing" && (
            <button
              type="button"
              title={task.is_paused ? "Reanudar reloj" : "Pausar reloj"}
              aria-label={task.is_paused ? "Reanudar reloj" : "Pausar reloj"}
              onPointerDown={e => e.stopPropagation()}
              onClick={() => onPause(task)}
            >
              {task.is_paused ? <Play size={15}/> : <Pause size={15}/>}
            </button>
          )}
          <button type="button" title="Editar tarea"
            aria-label="Editar tarea"
            onPointerDown={e => e.stopPropagation()}
            onClick={() => onEdit(task)}>
            <Pencil size={15}/>
          </button>
          <button type="button" title="Eliminar tarea"
            aria-label="Eliminar tarea"
            onPointerDown={e => e.stopPropagation()}
            onClick={() => onDelete(task)}>
            <Trash2 size={15}/>
          </button>
        </div>
      </div>
    </>
  );
}

function SortableCard({ task, now, onEdit, onDelete, onPause, onPriority, priorityOpenId, onTogglePriority, deletingId }) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging
  } = useSortable({ id: task.id });

  return (
    <article
      ref={setNodeRef}
      className={"kb-card kb-priority-" + (task.priority || "medium") + (isDragging ? " kb-dragging" : "") + (deletingId === task.id ? " kb-removing" : "")}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}
      {...attributes}
      {...listeners}
    >
      <CardBody task={task} now={now}
        onEdit={onEdit} onDelete={onDelete}
        onPause={onPause}
        onPriority={onPriority}
        priorityOpenId={priorityOpenId}
        onTogglePriority={onTogglePriority}/>
    </article>
  );
}

function Column({ stage, tasks, now, onEdit, onDelete, onPause, onPriority, priorityOpenId, onTogglePriority, deletingId }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${stage.id}`
  });

  return (
    <section
      ref={setNodeRef}
      className={`kb-column kb-${stage.id}` +
        (isOver ? " kb-over" : "")}
    >
      <div className="kb-column-head">
        <span className="kb-column-dot"/>
        <strong>{stage.title}</strong>
        <span className="kb-count">{tasks.length}</span>
      </div>

      <SortableContext
        items={tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="kb-stack">
          {tasks.map(task => (
            <SortableCard key={task.id}
              task={task} now={now}
              onEdit={onEdit}
              onDelete={onDelete}
              onPause={onPause}
              onPriority={onPriority}
              priorityOpenId={priorityOpenId}
              onTogglePriority={onTogglePriority}
              deletingId={deletingId}/>
          ))}
          {!tasks.length && (
            <div className="kb-placeholder">
              Arrastra una tarea aquí
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

/* KANBAN DRAG POP V3 */

// Priorizar la tarjeta bajo el puntero, antes que
// el contenedor completo de la columna.
function kanbanCollision(args) {
  const pointerHits = pointerWithin(args);
  const cardHit = pointerHits.find(
    hit => !String(hit.id).startsWith("column:")
  );

  if (cardHit) return [cardHit];

  if (pointerHits.length) return pointerHits;

  const intersections = rectIntersection(args);
  const cardIntersection = intersections.find(
    hit => !String(hit.id).startsWith("column:")
  );

  if (cardIntersection) return [cardIntersection];

  if (intersections.length) return intersections;

  return closestCorners(args);
}
export default function KanbanBoard({ board, user }) {
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [confirmTask, setConfirmTask] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editHours, setEditHours] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [priorityOpenId, setPriorityOpenId] = useState(null);

  // Protege los movimientos y eliminaciones mientras
  // Supabase confirma los cambios.
  const mutationRef = useRef(false);
  const [closingDelete, setClosingDelete] = useState(false);
  const [now, setNow] = useState(Date.now());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 }
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 170, tolerance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function refresh() {
    const { data, error: e } = await supabase
      .from("workspace_tasks")
      .select("*")
      .eq("board_id", board.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (e) setError(e.message);
    else {
      setTasks(data || []);
      setError("");
    }
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [board.id]);

  /* KANBAN REALTIME START */

  useEffect(() => {
    let active = true;

    const channel = supabase
      .channel(`kb-realtime-${board.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workspace_tasks"
        },
        payload => {
          if (!active || mutationRef.current) return;

          const event = payload.eventType;
          const next = payload.new;
          const previous = payload.old;

          if (event === "INSERT" || event === "UPDATE") {
            if (!next || next.board_id !== board.id) return;

            setTasks(current => {
              const exists = current.some(t => t.id === next.id);

              if (exists) {
                return current.map(t =>
                  t.id === next.id ? next : t
                );
              }

              return [...current, next];
            });
          }

          if (event === "DELETE" && previous?.id) {
            setTasks(current =>
              current.filter(t => t.id !== previous.id)
            );
          }
        }
      )
      .subscribe(status => {
        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT"
        ) {
          console.error("Kanban Realtime:", status);
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [board.id]);

  /* KANBAN REALTIME END */


  const ordered = stage =>
    tasks.filter(t => t.status === stage)
      .sort((a, b) =>
        (a.position || 0) - (b.position || 0) ||
        new Date(a.created_at) - new Date(b.created_at)
      );

  /* KANBAN FAST UI V1 */

  async function createTask(e) {
    e.preventDefault();

    const title = newTitle.trim();
    if (!title || working) return;

    const temporaryId = `pending-${crypto.randomUUID()}`;

    const optimistic = {
      id: temporaryId,
      owner_id: user.id,
      board_id: board.id,
      title,
      status: "todo",
      position: ordered("todo").length,
      created_at: new Date().toISOString(),
      estimated_minutes: null,
      elapsed_seconds: 0,
      timer_started_at: null,
      is_paused: false,
      completed_at: null
    };

    // Mostrar la tarjeta sin esperar la red.
    setWorking(true);
    setError("");
    setNewTitle("");
    setTasks(current => [...current, optimistic]);

    const { data, error: createError } = await supabase
      .from("workspace_tasks")
      .insert({
        owner_id: user.id,
        board_id: board.id,
        title,
        status: "todo",
        position: optimistic.position
      })
      .select("*")
      .single();

    if (createError || !data) {
      // Recuperar el estado si falla Supabase.
      setTasks(current =>
        current.filter(task => task.id !== temporaryId)
      );
      setNewTitle(title);
      setError(
        createError?.message || "No se pudo guardar la tarea."
      );
    } else {
      // Sustituir el ID temporal por el definitivo.
      setTasks(current => {
        const withoutTemporary = current.filter(
          task => task.id !== temporaryId
        );

        if (withoutTemporary.some(task => task.id === data.id)) {
          return withoutTemporary;
        }

        return [...withoutTemporary, data];
      });
    }

    setWorking(false);
  }

  function openEdit(task) {
    setEditing(task);
    setEditTitle(task.title);
    setEditHours(
      task.estimated_minutes == null
        ? ""
        : String(task.estimated_minutes / 60)
    );
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editing || !editTitle.trim() || working) return;

    const hours = editHours.trim() === ""
      ? null : Number(editHours.replace(",", "."));

    if (hours != null && (!Number.isFinite(hours) || hours < 0)) {
      setError("Introduce una cantidad válida de horas.");
      return;
    }

    setWorking(true);
    const { error: e2 } = await supabase
      .from("workspace_tasks")
      .update({
        title: editTitle.trim(),
        estimated_minutes: hours == null ? null : Math.round(hours * 60)
      })
      .eq("id", editing.id)
      .eq("board_id", board.id);

    if (e2) setError(e2.message);
    else {
      setEditing(null);
      await refresh();
    }
    setWorking(false);
  }

  function deleteTask(task) {
    setConfirmTask(task);
  }

  async function confirmDelete() {
    if (!confirmTask || deleteBusy) return;

    const task = confirmTask;
    const previous = [...tasks];

    setDeleteBusy(true);
    setDeletingId(task.id);
    setError("");

    // Cerrar la confirmacion inmediatamente.
    // La solicitud de red ocurre en paralelo.
    setConfirmTask(null);

    const removePromise = supabase
      .from("workspace_tasks")
      .delete()
      .eq("id", task.id)
      .eq("board_id", board.id);

    // Dejar que la tarjeta reproduzca su salida.
    window.setTimeout(() => {
      setTasks(current =>
        current.filter(item => item.id !== task.id)
      );
      setDeletingId(null);
    }, 170);

    try {
      const { error: removeError } = await removePromise;

      if (removeError) {
        setTasks(previous);
        setError(removeError.message);
        await refresh();
      }
    } catch (err) {
      setTasks(previous);
      setError(err.message || "Error al eliminar la tarea.");
      await refresh();
    } finally {
      setDeleteBusy(false);
    }
  }

  /* KANBAN PRIORITY V1 */

  async function pauseTask(task) {
    const current = Date.now();
    const next = task.is_paused
      ? {
          is_paused: false,
          timer_started_at: new Date(current).toISOString()
        }
      : {
          is_paused: true,
          elapsed_seconds: elapsed(task, current),
          timer_started_at: null
        };

    const previous = task;

    // El reloj cambia visualmente sin esperar a Supabase.
    setTasks(items => items.map(item =>
      item.id === task.id ? { ...item, ...next } : item
    ));

    const { error: pauseError } = await supabase
      .from("workspace_tasks")
      .update(next)
      .eq("id", task.id)
      .eq("board_id", board.id);

    if (pauseError) {
      setError(pauseError.message);
      setTasks(items => items.map(item =>
        item.id === task.id ? previous : item
      ));
    }
  }

  async function changePriority(task, priority) {
    setPriorityOpenId(null);

    if (task.priority === priority) return;

    const previous = task;

    // Actualizar el color inmediatamente.
    setTasks(items => items.map(item =>
      item.id === task.id ? { ...item, priority } : item
    ));

    const { error: priorityError } = await supabase
      .from("workspace_tasks")
      .update({ priority })
      .eq("id", task.id)
      .eq("board_id", board.id);

    if (priorityError) {
      setError(priorityError.message);
      setTasks(items => items.map(item =>
        item.id === task.id ? previous : item
      ));
    }
  }

  function timerChange(task, newStatus) {
    if (task.status === newStatus) return {};

    const current = Date.now();
    const accumulated = elapsed(task, current);

    if (newStatus === "doing") {
      return {
        elapsed_seconds: accumulated,
        timer_started_at: new Date(current).toISOString(),
        is_paused: false,
        completed_at: null
      };
    }

    return {
      elapsed_seconds: accumulated,
      timer_started_at: null,
      is_paused: false,
      completed_at: newStatus === "done"
        ? new Date(current).toISOString() : null
    };
  }

  function findStage(id) {
    if (!id) return null;
    const raw = String(id);

    if (raw.startsWith("column:")) {
      return raw.slice("column:".length);
    }
    return tasks.find(t => t.id === id)?.status || null;
  }

  /* KANBAN STABLE MOVEMENT V2 */

  async function moveCard(event) {
    setActiveId(null);

    if (mutationRef.current) return;

    const { active, over } = event;
    if (!active || !over) return;

    const moving = tasks.find(t => t.id === active.id);
    const destination = findStage(over.id);

    if (!moving || !stages.some(s => s.id === destination)) {
      return;
    }

    const source = moving.status;
    const sameColumn = source === destination;

    const sourceItems = ordered(source);
    const targetItems = sameColumn
      ? sourceItems
      : ordered(destination);

    const oldIndex = sourceItems.findIndex(
      task => task.id === moving.id
    );

    if (oldIndex < 0) return;

    let newSource = [];
    let newTarget = [];

    if (sameColumn) {
      // arrayMove funciona tanto hacia arriba como abajo.
      const targetIndex = targetItems.findIndex(
        task => task.id === over.id
      );

      if (targetIndex < 0 || targetIndex === oldIndex) {
        return;
      }

      newTarget = arrayMove(
        sourceItems,
        oldIndex,
        targetIndex
      );
    } else {
      // Mover entre columnas, incluyendo columnas vacias.
      newSource = sourceItems.filter(
        task => task.id !== moving.id
      );

      newTarget = [...targetItems];

      const targetIndex = newTarget.findIndex(
        task => task.id === over.id
      );

      const insertIndex = targetIndex < 0
        ? newTarget.length
        : targetIndex;

      const changed = {
        ...moving,
        status: destination,
        ...timerChange(moving, destination)
      };

      newTarget.splice(insertIndex, 0, changed);
    }

    // Normalizar posiciones desde cero.
    const changes = [
      ...newSource.map((task, index) => ({
        ...task,
        position: index
      })),
      ...newTarget.map((task, index) => ({
        ...task,
        position: index
      }))
    ];

    const updates = changes.filter(task => {
      const previous = tasks.find(t => t.id === task.id);

      return previous && (
        previous.status !== task.status ||
        Number(previous.position || 0) !== task.position
      );
    });

    if (!updates.length) return;

    const previousTasks = tasks;

    const changedIds = new Set(
      changes.map(task => task.id)
    );

    const nextTasks = [
      ...tasks.filter(task => !changedIds.has(task.id)),
      ...changes
    ];

    mutationRef.current = true;
    setWorking(true);
    setError("");

    // Mostrar el movimiento antes de esperar Supabase.
    setTasks(nextTasks);

    try {
      const results = await Promise.all(
        updates.map(task => {
          const isMoving = task.id === moving.id;
          const changedStatus =
            isMoving && source !== destination;

          return supabase
            .from("workspace_tasks")
            .update({
              status: task.status,
              position: task.position,
              ...(changedStatus
                ? {
                    elapsed_seconds: task.elapsed_seconds,
                    timer_started_at: task.timer_started_at,
                    is_paused: task.is_paused,
                    completed_at: task.completed_at
                  }
                : {})
            })
            .eq("id", task.id)
            .eq("board_id", board.id);
        })
      );

      const failed = results.find(result => result.error);

      if (failed) {
        setError(failed.error.message);
        setTasks(previousTasks);
      }

      // Recuperar el orden definitivo una sola vez.
      await refresh();
    } catch (err) {
      setTasks(previousTasks);
      setError(
        err.message || "No se pudo mover la tarjeta."
      );
      await refresh();
    } finally {
      mutationRef.current = false;
      setWorking(false);
    }
  }

  const activeTask = tasks.find(t => t.id === activeId);

  return (
    <div className="kb-root">
      <header className="kb-heading">
        <div>
          <span className="kb-eyebrow">TABLERO KANBAN</span>
          <h1>{board.title}</h1>
          <p>Arrastra las tarjetas para organizar tus actividades.</p>
        </div>
      </header>

      <form className="kb-create" onSubmit={createTask}>
        <input value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="¿Qué necesitas hacer?"
          maxLength={150}
          aria-label="Nombre de nueva tarea"
        />
        <button type="submit" disabled={working || !newTitle.trim()}>
          <Plus size={18}/> Añadir tarea
        </button>
      </form>

      {error && <div className="kb-error" role="alert">{error}</div>}

      {loading ? (
        <p>Cargando tareas...</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={kanbanCollision}
          onDragStart={e => setActiveId(e.active.id)}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={moveCard}
        >
          <div className="kb-columns">
            {stages.map(stage => (
              <Column key={stage.id} stage={stage}
                tasks={ordered(stage.id)}
                now={now}
                onEdit={openEdit}
                onDelete={deleteTask}
                onPause={pauseTask}
                onPriority={changePriority}
                priorityOpenId={priorityOpenId}
                onTogglePriority={id => setPriorityOpenId(
                  current => current === id ? null : id
                )}
                deletingId={deletingId}/>
            ))}
          </div>
          <DragOverlay>
            {activeTask ? (
              <article className="kb-card kb-overlay">
                <CardBody task={activeTask} now={now}
                  onEdit={() => {}} onDelete={() => {}}
                  onPause={() => {}}/>
              </article>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {confirmTask && (
        <div className="kb-modal-overlay kb-delete-confirm"
          onMouseDown={event => {
            if (
              event.target === event.currentTarget &&
              !deleteBusy
            ) setConfirmTask(null);
          }}>
          <div
            className={"kb-delete-dialog" + (closingDelete ? " kb-pop-out" : "")}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="kb-delete-heading"
            aria-describedby="kb-delete-description"
          >
            <div className="kb-delete-icon">
              <Trash2 size={23}/>
            </div>

            <h2 id="kb-delete-heading">¿Eliminar tarea?</h2>

            <p id="kb-delete-description">
              Se eliminará <strong>{confirmTask.title}</strong>.
              Esta acción no se puede deshacer.
            </p>

            <div className="kb-delete-actions">
              <button type="button" disabled={deleteBusy}
                onClick={() => setConfirmTask(null)}>
                Cancelar
              </button>

              <button type="button" disabled={deleteBusy}
                className="kb-delete-danger"
                onClick={confirmDelete}>
                <Trash2 size={16}/>
                {deleteBusy ? "Eliminando..." : "Eliminar tarea"}
              </button>
            </div>
          </div>
        </div>
      )}
      {editing && (
        <div className="kb-modal-overlay"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setEditing(null);
          }}>
          <form className="kb-modal" onSubmit={saveEdit}>
            <div className="kb-modal-head">
              <h2>Editar tarea</h2>
              <button type="button" onClick={() => setEditing(null)}
                aria-label="Cerrar"><X size={19}/></button>
            </div>
            <label htmlFor="kb-title">Nombre</label>
            <input id="kb-title" value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              maxLength={150} required autoFocus/>
            <label htmlFor="kb-hours">Tiempo estimado (horas)</label>
            <input id="kb-hours" type="number" min="0"
              step="0.25" value={editHours}
              onChange={e => setEditHours(e.target.value)}
              placeholder="Ejemplo: 2.5"/>
            <div className="kb-modal-actions">
              <button type="button" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button type="submit" disabled={working}>
                <Check size={16}/> Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
