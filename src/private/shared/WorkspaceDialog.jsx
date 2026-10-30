import React, { useEffect } from "react";
import { AlertTriangle, Pencil, Trash2, X } from "lucide-react";
import "./WorkspaceDialog.css";

export default function WorkspaceDialog({
  mode,
  item,
  value,
  onChange,
  onClose,
  onConfirm,
  busy = false,
  closing = false
}) {
  useEffect(() => {
    if (!item) return;

    const onKeyDown = event => {
      if (event.key === "Escape" && !busy) onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [item, busy, onClose]);

  if (!item) return null;

  const deleting = mode === "delete";

  return (
    <div
      className="wkd-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <form
        className={"wkd-dialog" + (closing ? " wkd-out" : "")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wkd-title"
        onSubmit={event => {
          event.preventDefault();
          onConfirm();
        }}
      >
        <div className="wkd-heading">
          <span className={
            "wkd-icon " + (deleting ? "wkd-danger" : "wkd-edit")
          }>
            {deleting ? <Trash2 size={21}/> : <Pencil size={21}/>}
          </span>
          <button
            type="button"
            className="wkd-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Cerrar"
          >
            <X size={19}/>
          </button>
        </div>

        <h2 id="wkd-title">
          {deleting ? "¿Eliminar este proyecto?" : "Editar proyecto"}
        </h2>

        {deleting ? (
          <>
            <p>
              Vas a eliminar <strong>{item.title}</strong>.
              Este proyecto puede contener tableros Kanban,
              tareas y blocs de notas.
            </p>
            <div className="wkd-warning">
              <AlertTriangle size={18}/>
              <span>
                La eliminación puede afectar a todo su contenido
                relacionado y no se puede deshacer.
              </span>
            </div>
          </>
        ) : (
          <>
            <label htmlFor="wkd-project-name">
              Nombre del proyecto
            </label>
            <input
              id="wkd-project-name"
              value={value}
              maxLength={150}
              onChange={event => onChange(event.target.value)}
              autoFocus
              required
            />
          </>
        )}

        <div className="wkd-actions">
          <button type="button" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="submit"
            className={deleting ? "wkd-confirm-danger" : "wkd-confirm-edit"}
            disabled={busy || (!deleting && !value.trim())}
          >
            {deleting ? <Trash2 size={16}/> : <Pencil size={16}/>}
            {busy
              ? "Procesando..."
              : deleting ? "Eliminar proyecto" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
