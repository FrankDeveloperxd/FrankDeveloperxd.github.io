import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  X,
  AlertCircle,
  Info
} from "lucide-react";
import "./WorkspaceToasts.css";

// Se conserva la API utilizada por los demas modulos.
export function notifyWorkspace(type, message) {
  window.dispatchEvent(new CustomEvent("workspace:notify", {
    detail: { type, message }
  }));
}

const DURATION = 4200;
const EXIT_DURATION = 260;

export default function WorkspaceToasts() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  function clearTimers(id) {
    const entry = timers.current.get(id);
    if (!entry) return;

    window.clearTimeout(entry.dismiss);
    window.clearTimeout(entry.remove);
    timers.current.delete(id);
  }

  function dismissToast(id) {
    setToasts(current => current.map(toast =>
      toast.id === id ? { ...toast, exiting: true } : toast
    ));

    const entry = timers.current.get(id);
    if (entry) window.clearTimeout(entry.dismiss);

    const remove = window.setTimeout(() => {
      setToasts(current =>
        current.filter(toast => toast.id !== id)
      );
      clearTimers(id);
    }, EXIT_DURATION);

    timers.current.set(id, { ...entry, remove });
  }

  useEffect(() => {
    const scheduled = timers.current;

    function onNotify(event) {
      const { type, message } = event.detail || {};
      if (!message) return;

      const id = crypto.randomUUID();
      const kind = ["success", "error", "info"].includes(type)
        ? type
        : "info";

      setToasts(current => {
        const next = [...current, {
          id,
          type: kind,
          message,
          exiting: false
        }];

        if (next.length > 4) {
          const removed = next.splice(0, next.length - 4);
          for (const old of removed) {
            const entry = scheduled.get(old.id);
            if (entry) {
              window.clearTimeout(entry.dismiss);
              window.clearTimeout(entry.remove);
              scheduled.delete(old.id);
            }
          }
        }

        return next;
      });

      const dismiss = window.setTimeout(() => {
        setToasts(current => current.map(toast =>
          toast.id === id
            ? { ...toast, exiting: true }
            : toast
        ));

        const remove = window.setTimeout(() => {
          setToasts(current =>
            current.filter(toast => toast.id !== id)
          );
          scheduled.delete(id);
        }, EXIT_DURATION);

        scheduled.set(id, { remove });
      }, DURATION);

      scheduled.set(id, { dismiss });
    }

    window.addEventListener("workspace:notify", onNotify);

    return () => {
      window.removeEventListener("workspace:notify", onNotify);

      for (const entry of scheduled.values()) {
        window.clearTimeout(entry.dismiss);
        window.clearTimeout(entry.remove);
      }

      scheduled.clear();
    };
  }, []);

  return (
    <div className="workspace-toast-stack" aria-label="Notificaciones">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={
            `workspace-toast workspace-toast-${toast.type}` +
            (toast.exiting ? " is-exiting" : "")
          }
          role={toast.type === "error" ? "alert" : "status"}
        >
          <div className="workspace-toast-icon" aria-hidden="true">
            {toast.type === "success" ? (
              <Check size={19} strokeWidth={3}/>
            ) : toast.type === "error" ? (
              <AlertCircle size={20} strokeWidth={2.2}/>
            ) : (
              <Info size={20} strokeWidth={2.2}/>
            )}
          </div>

          <div className="workspace-toast-body">
            <strong>
              {toast.type === "success"
                ? "Acción completada"
                : toast.type === "error"
                  ? "Algo salió mal"
                  : "Información"}
            </strong>
            <p>{toast.message}</p>
          </div>

          <button
            type="button"
            className="workspace-toast-close"
            aria-label="Cerrar notificación"
            onClick={() => dismissToast(toast.id)}
          >
            <X size={16} strokeWidth={2}/>
          </button>

          <div className="workspace-toast-progress" aria-hidden="true"/>
        </div>
      ))}
    </div>
  );
}
