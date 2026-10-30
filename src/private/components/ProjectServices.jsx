// WORKSPACE USER ISOLATION V1
import {
  Columns3,
  NotebookPen,
  Plus
} from "lucide-react";

// PROJECT SERVICES LUCIDE ICONS V1
import { Pencil, Trash2 } from "lucide-react";
import { getCachedProjectServices, saveCachedProjectServices } from "../projectServicesCache.js";
import React, { useEffect, useState } from "react";
import { supabase } from "../client";
import { notifyWorkspace } from "./WorkspaceToasts";
import "./ProjectServices.css";

const OPTIONS = [
  {
    type: "kanban",
    title: "Kanban",
    description: "Tableros para organizar tus tareas",
    icon: ""
  },
  {
    type: "note",
    title: "Bloc de notas",
    description: "Documentos de texto libre",
    icon: ""
  }
];

export default function ProjectServices({ project, user, onOpenBoard, onOpenNote }) {
  /* PROJECT SERVICES CACHE V2 */

  const [boards, setBoards] = useState(() =>
    (getCachedProjectServices(user.id, project.id) || [])
      .filter(item => item.kind === "kanban")
      .map(({ kind, ...item }) => item)
  );

  const [notes, setNotes] = useState(() =>
    (getCachedProjectServices(user.id, project.id) || [])
      .filter(item => item.kind === "note")
      .map(({ kind, ...item }) => item)
  );

  const [loading, setLoading] = useState(
    () => getCachedProjectServices(user.id, project.id) === null
  );
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null);
  const [type, setType] = useState("kanban");
  const [title, setTitle] = useState("");
  const [editingNote, setEditingNote] = useState(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [content, setContent] = useState("");

  async function refresh() {
    const projectId = project.id;

    const [boardsResult, notesResult] = await Promise.all([
      supabase.from("workspace_boards")
        .select("*").eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase.from("workspace_notes")
        .select("*").eq("project_id", projectId)
        .order("created_at", { ascending: false })
    ]);

    if (boardsResult.error || notesResult.error) {
      notifyWorkspace(
        "error",
        boardsResult.error?.message ||
        notesResult.error?.message ||
        "No se pudo cargar el proyecto."
      );

      setLoading(false);
      return;
    }

    const nextBoards = boardsResult.data || [];
    const nextNotes = notesResult.data || [];

    // Guardar ambas listas en una cache independiente
    // para el proyecto actual.
    const cachedServices = [
      ...nextBoards.map(item => ({ ...item, kind: "kanban" })),
      ...nextNotes.map(item => ({ ...item, kind: "note" }))
    ];

    saveCachedProjectServices(user.id, projectId, cachedServices);

    setBoards(nextBoards);
    setNotes(nextNotes);
    setLoading(false);
  }

  useEffect(() => {
    const cached = getCachedProjectServices(user.id, project.id);

    setEditingNote(null);

    if (cached !== null) {
      // Mostrar las tarjetas conocidas inmediatamente.
      setBoards(
        cached
          .filter(item => item.kind === "kanban")
          .map(({ kind, ...item }) => item)
      );

      setNotes(
        cached
          .filter(item => item.kind === "note")
          .map(({ kind, ...item }) => item)
      );

      setLoading(false);
    } else {
      setBoards([]);
      setNotes([]);
      setLoading(true);
    }

    // Actualizacion posterior desde Supabase.
    void refresh();
  }, [project.id]);

  function createModal() {
    setType("kanban");
    setTitle("");
    setModal({ action: "create" });
  }

  function renameModal(item) {
    setTitle(item.title);
    setType(item.kind);
    setModal({ action: "rename", item });
  }

  function deleteModal(item) {
    setModal({ action: "delete", item });
  }

  function openNote(note) {
    setEditingNote(note);
    setNoteTitle(note.title);
    setContent(note.content || "");
  }

  async function saveService(event) {
    event.preventDefault();

    const name = title.trim();
    if (!name || busy) return;

    setBusy(true);
    const editing = modal?.action === "rename";
    const kind = editing ? modal.item.kind : type;
    const table = kind === "kanban"
      ? "workspace_boards"
      : "workspace_notes";

    let result;

    if (editing) {
      result = await supabase.from(table)
        .update({ title: name })
        .eq("id", modal.item.id)
        .eq("owner_id", user.id);
    } else {
      result = await supabase.from(table).insert({
        title: name,
        project_id: project.id,
        owner_id: user.id,
        ...(kind === "note" ? { content: "" } : {})
      });
    }

    setBusy(false);

    if (result.error) {
      notifyWorkspace("error", result.error.message);
      return;
    }

    setModal(null);
    notifyWorkspace(
      "success",
      editing ? "Nombre actualizado." : "Servicio creado."
    );
    await refresh();
  }

  async function removeService() {
    if (!modal?.item || busy) return;

    setBusy(true);
    const item = modal.item;
    const table = item.kind === "kanban"
      ? "workspace_boards"
      : "workspace_notes";

    const { error } = await supabase.from(table)
      .delete()
      .eq("id", item.id)
      .eq("owner_id", user.id);

    setBusy(false);

    if (error) {
      notifyWorkspace("error", error.message);
      return;
    }

    setModal(null);
    notifyWorkspace("success", "Servicio eliminado.");
    await refresh();
  }

  async function saveNote(event) {
    event.preventDefault();
    if (!editingNote || !noteTitle.trim() || busy) return;

    setBusy(true);

    const { error } = await supabase.from("workspace_notes")
      .update({
        title: noteTitle.trim(),
        content,
        updated_at: new Date().toISOString()
      })
      .eq("id", editingNote.id)
      .eq("owner_id", user.id);

    setBusy(false);

    if (error) {
      notifyWorkspace("error", error.message);
      return;
    }

    notifyWorkspace("success", "Nota guardada correctamente.");
    setEditingNote(null);
    await refresh();
  }

  const services = [
    ...boards.map(item => ({ ...item, kind: "kanban" })),
    ...notes.map(item => ({ ...item, kind: "note" }))
  ].sort((a, b) =>
    new Date(b.created_at) - new Date(a.created_at)
  );

  return (
    <section className="ps-root">
      <div className="ps-heading">
        <div>
          <span className="ps-eyebrow">ESPACIO DE PROYECTO</span>
          <h1>{project.title}</h1>
          <p>Organiza las herramientas que necesita este proyecto.</p>
        </div>
        <button
          type="button"
          className="ps-add"
          onClick={createModal}
        >
          <span aria-hidden="true">＋</span> Añadir servicio
        </button>
      </div>

      {loading ? (
        <div className="ps-empty"><div className="ps-loading-grid" aria-label="Cargando servicios">
  {[1, 2, 3].map(item => (
    <div className="ps-loading-card" key={item} aria-hidden="true">
      <span className="ps-loading-icon ps-shimmer" />
      <span className="ps-loading-line ps-loading-long ps-shimmer" />
      <span className="ps-loading-line ps-loading-medium ps-shimmer" />
      <span className="ps-loading-line ps-loading-short ps-shimmer" />
    </div>
  ))}
</div></div>
      ) : services.length === 0 ? (
        <div className="ps-empty">
          <div className="ps-empty-symbol">＋</div>
          <h2>Tu proyecto está listo</h2>
          <p>Agrega un Kanban o un Bloc de notas para comenzar.</p>
          <button type="button" className="ps-add" onClick={createModal}>
            Añadir primer servicio
          </button>
        </div>
      ) : (
        <div className="ps-grid">
          {services.map(item => (
            <article
              className={`ps-card ps-card-${item.kind}`}
              key={`${item.kind}-${item.id}`}
            >
              <button
                type="button"
                className="ps-card-open"
                onClick={() =>
                  item.kind === "kanban"
                    ? onOpenBoard(item)
                    : onOpenNote(item)
                }
                aria-label={`Abrir ${item.title}`}
              >
                <div className="ps-card-head">
  <div className="ps-card-copy">
    <strong>{item.title}</strong>
    <small>
      {item.kind === "kanban" ? "Kanban" : "Bloc de notas"}
    </small>
  </div>

  <span className="ps-card-icon">
    {item.kind === "kanban" ? (
      <Columns3
        size={23}
        strokeWidth={2}
        aria-hidden="true"
      />
    ) : (
      <NotebookPen
        size={23}
        strokeWidth={2}
        aria-hidden="true"
      />
    )}
  </span>
</div>

<span className="ps-open-label">Abrir servicio</span>
              </button>

              <div className="ps-card-actions">
  {/* PROJECT SERVICES ICON FIX V1 */}
  <button
    type="button"
    className="ps-icon-button ps-edit-button"
    title="Cambiar nombre"
    aria-label={`Editar ${item.title}`}
    onClick={(event) => {
      event.stopPropagation();
      renameModal(item);
    }}
  >
    <Pencil size={17} strokeWidth={2} aria-hidden="true" />
  </button>

  <button
    type="button"
    className="ps-icon-button ps-delete-button"
    title="Eliminar servicio"
    aria-label={`Eliminar ${item.title}`}
    onClick={(event) => {
      event.stopPropagation();
      deleteModal(item);
    }}
  >
    <Trash2 size={17} strokeWidth={2} aria-hidden="true" />
  </button>
</div>
            </article>
          ))}
          <button
            type="button"
            className="ps-card ps-new-card"
            onClick={createModal}
          >
            <span className="ps-new-icon"><Plus size={25} strokeWidth={2.2} /></span>
            <strong>Nuevo servicio</strong>
            <small>Kanban o Bloc de notas</small>
          </button>
        </div>
      )}

      {editingNote && (
        <div className="ps-overlay" role="presentation">
          <section
            className="ps-dialog ps-editor"
            role="dialog"
            aria-modal="true"
            aria-label="Editor de notas"
          >
            <form onSubmit={saveNote}>
              <div className="ps-dialog-head">
                <div>
                  <span className="ps-eyebrow">BLOC DE NOTAS</span>
                  <h2>Editar nota</h2>
                </div>
                <button
                  type="button"
                  className="ps-close"
                  onClick={() => setEditingNote(null)}
                  aria-label="Cerrar editor"
                ></button>
              </div>

              <label htmlFor="ps-note-title">Título</label>
              <input
                id="ps-note-title"
                value={noteTitle}
                onChange={e => setNoteTitle(e.target.value)}
                maxLength={150}
                required
              />

              <label htmlFor="ps-note-content">Contenido</label>
              <textarea
                id="ps-note-content"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Escribe tus ideas libremente..."
                rows={12}
              />

              <div className="ps-dialog-footer">
                <button type="button" onClick={() => setEditingNote(null)}>
                  Cancelar
                </button>
                <button className="ps-add" type="submit" disabled={busy}>
                  {busy ? "Guardando..." : "Guardar nota"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {modal && (
        <div className="ps-overlay" role="presentation">
          <section
            className="ps-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Administrar servicio"
          >
            {modal.action === "delete" ? (
              <>
                <div className="ps-dialog-head">
                  <div>
                    <span className="ps-eyebrow">CONFIRMACIÓN</span>
                    <h2>¿Eliminar servicio?</h2>
                  </div>
                  <button className="ps-close" onClick={() => setModal(null)}></button>
                </div>
                <p>
                  Se eliminará {modal.item.title} y su contenido.
                  Esta operación no se puede deshacer.
                </p>
                <div className="ps-dialog-footer">
                  <button onClick={() => setModal(null)}>Cancelar</button>
                  <button
                    className="ps-danger"
                    disabled={busy}
                    onClick={removeService}
                  >
                    {busy ? "Eliminando..." : "Eliminar"}
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={saveService}>
                <div className="ps-dialog-head">
                  <div>
                    <span className="ps-eyebrow">SERVICIOS</span>
                    <h2>
                      {modal.action === "rename"
                        ? "Editar nombre"
                        : "Añadir servicio"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="ps-close"
                    onClick={() => setModal(null)}
                  ></button>
                </div>

                {modal.action === "create" && (
                  <div className="ps-options">
                    {OPTIONS.map(option => (
                      <button
                        key={option.type}
                        type="button"
                        className={type === option.type ? "selected" : ""}
                        onClick={() => setType(option.type)}
                      >
                        <span className={`ps-option-icon ps-option-${option.type}`}>
                          {option.type === "kanban" ? (
                            <Columns3 size={23} strokeWidth={2} />
                          ) : (
                            <NotebookPen size={23} strokeWidth={2} />
                          )}
                        </span>
                        <strong>{option.title}</strong>
                        <small>{option.description}</small>
                      </button>
                    ))}
                  </div>
                )}

                <label htmlFor="ps-service-title">
                  Nombre del servicio
                </label>
                <input
                  id="ps-service-title"
                  placeholder={
                    type === "kanban"
                      ? "Ej. Planificación del proyecto"
                      : "Ej. Ideas y apuntes"
                  }
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={150}
                  autoFocus
                  required
                />

                <div className="ps-dialog-footer">
                  <button type="button" onClick={() => setModal(null)}>
                    Cancelar
                  </button>
                  <button type="submit" className="ps-add" disabled={busy}>
                    {busy ? "Guardando..." :
                      modal.action === "rename"
                        ? "Guardar cambios"
                        : "Crear servicio"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
