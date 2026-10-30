import React, { useEffect, useState } from "react";
import "./WorkspaceToasts.css";

export function notifyWorkspace(type, message) {
  window.dispatchEvent(new CustomEvent("workspace:notify", {
    detail: { type, message }
  }));
}

export default function WorkspaceToasts() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const onNotify = (event) => {
      const { type, message } = event.detail || {};
      if (!message) return;

      const id = crypto.randomUUID();

      setToasts(current => [
        ...current.slice(-3),
        { id, type: type || "info", message }
      ]);

      window.setTimeout(() => {
        setToasts(current => current.filter(item => item.id !== id));
      }, 4200);
    };

    window.addEventListener("workspace:notify", onNotify);

    return () => {
      window.removeEventListener("workspace:notify", onNotify);
    };
  }, []);

  return (
    <div className="workspace-toast-stack" aria-label="Notificaciones">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`workspace-toast workspace-toast-${toast.type}`}
          role={toast.type === "error" ? "alert" : "status"}
        >
          <span className="workspace-toast-icon" aria-hidden="true">
            {toast.type === "success" ? "" :
             toast.type === "error" ? "!" : "i"}
          </span>

          <div className="workspace-toast-body">
            <strong>
              {toast.type === "success" ? "Acción completada" :
               toast.type === "error" ? "Algo salió mal" :
               "Información"}
            </strong>
            <p>{toast.message}</p>
          </div>

          <button
            type="button"
            aria-label="Cerrar notificación"
            onClick={() =>
              setToasts(current =>
                current.filter(item => item.id !== toast.id)
              )
            }
          >

          </button>
        </div>
      ))}
    </div>
  );
}
