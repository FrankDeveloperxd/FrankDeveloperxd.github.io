import React, { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, X } from "lucide-react";
import { supabase } from "../client";
import "./SystemNotifications.css";

/*
 * Novedades del sistema.
 * Agrega aquí un aviso concreto cuando publiques una mejora o corrección.
 * El id debe ser único y no debe cambiar después de publicarlo.
 */


function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

/* NOTIFICATION STATE CACHE V1 */
function readCachedNotificationIds(userId) {
  if (!userId) return null;

  try {
    const value = JSON.parse(
      localStorage.getItem(`workspace-notification-reads:${userId}`) || "null"
    );
    return Array.isArray(value)
      ? value.filter(id => typeof id === "string")
      : null;
  } catch {
    return null;
  }
}

function saveCachedNotificationIds(userId, ids) {
  if (!userId) return;

  try {
    localStorage.setItem(
      `workspace-notification-reads:${userId}`,
      JSON.stringify([...ids])
    );
  } catch {
    // Supabase sigue guardando el estado aunque el caché local no esté disponible.
  }
}
/* NOTIFICATIONS DATABASE V4 */
function readCachedNotifications(userId) {
  try {
    const value = JSON.parse(
      localStorage.getItem(`workspace-notifications:${userId}`) || "null"
    );
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}
export default function SystemNotifications({ userId }) {
  const [notifications, setNotifications] = useState(
    () => readCachedNotifications(userId) || []
  );
  const [notificationsReady, setNotificationsReady] = useState(
    () => readCachedNotifications(userId) !== null
  );
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState(
    () => new Set(readCachedNotificationIds(userId) || [])
  );
  const [readStateReady, setReadStateReady] = useState(
    () => readCachedNotificationIds(userId) !== null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const rootRef = useRef(null);

  useEffect(() => {
    let active = true;
    let requestId = 0;
    let inFlight = false;

    const cached = readCachedNotifications(userId);
    const cachedReads = readCachedNotificationIds(userId);
    setNotifications(cached || []);
    setReadIds(new Set(cachedReads || []));
    setNotificationsReady(cached !== null);
    setReadStateReady(cachedReads !== null);
    setLoading(cached === null || cachedReads === null);

    async function refresh() {
      if (!userId || !active || inFlight) return;
      inFlight = true;
      const request = ++requestId;

      try {
        const [noticesResult, readsResult] = await Promise.all([
          supabase
            .from("workspace_system_notifications")
            .select("id,category,title,message,published_at")
            .eq("is_active", true)
            .lte("published_at", new Date().toISOString())
            .order("published_at", { ascending: false })
            .limit(100),
          supabase
            .from("workspace_notification_reads")
            .select("notification_id")
            .eq("owner_id", userId)
        ]);

        if (!active || request !== requestId) return;
        if (noticesResult.error) throw noticesResult.error;
        if (readsResult.error) throw readsResult.error;

        const next = (noticesResult.data || []).map(item => ({
          id: item.id,
          type: item.category,
          title: item.title,
          description: item.message,
          publishedAt: item.published_at
        }));
        const ids = new Set(
          (readsResult.data || []).map(item => item.notification_id)
        );

        setNotifications(next);
        setReadIds(ids);
        setNotificationsReady(true);
        setReadStateReady(true);
        setError("");
        saveCachedNotificationIds(userId, ids);

        try {
          localStorage.setItem(
            `workspace-notifications:${userId}`,
            JSON.stringify(next)
          );
        } catch {
          // El contenido sigue disponible aunque no se pueda guardar el caché.
        }
      } catch (queryError) {
        if (active && request === requestId) {
          console.error("Notificaciones:", queryError);
          setError("No se pudieron actualizar los avisos. Intenta nuevamente.");
        }
      } finally {
        inFlight = false;
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
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [userId]);
  useEffect(() => {
    if (!open) return undefined;

    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }

    function onKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const unreadCount = notifications.filter(
    item => !readIds.has(item.id)
  ).length;

  async function markAsRead(notificationId) {
    if (!userId || readIds.has(notificationId)) return;

    setSaving(true);
    setError("");

    const { error: saveError } = await supabase
      .from("workspace_notification_reads")
      .upsert(
        {
          owner_id: userId,
          notification_id: notificationId,
          read_at: new Date().toISOString()
        },
        { onConflict: "owner_id,notification_id" }
      );

    setSaving(false);

    if (saveError) {
      console.error("No se pudo guardar la lectura:", saveError);
      setError("No se pudo marcar el aviso como leído.");
      return;
    }

    setReadIds(current => {
      const next = new Set([...current, notificationId]);
      saveCachedNotificationIds(userId, next);
      return next;
    });
  }

  async function markAllAsRead() {
    const unread = notifications.filter(
      item => !readIds.has(item.id)
    );

    if (!userId || unread.length === 0 || saving) return;

    setSaving(true);
    setError("");

    const readAt = new Date().toISOString();
    const rows = unread.map(item => ({
      owner_id: userId,
      notification_id: item.id,
      read_at: readAt
    }));

    const { error: saveError } = await supabase
      .from("workspace_notification_reads")
      .upsert(rows, { onConflict: "owner_id,notification_id" });

    setSaving(false);

    if (saveError) {
      console.error("No se pudieron marcar los avisos:", saveError);
      setError("No se pudieron marcar todos como leídos.");
      return;
    }

    setReadIds(current => {
      const next = new Set([
        ...current,
        ...unread.map(item => item.id)
      ]);
      saveCachedNotificationIds(userId, next);
      return next;
    });
  }

  return (
    <div className="system-notifications" ref={rootRef}>
      <button
        type="button"
        className="system-notifications-trigger"
        aria-label={
          unreadCount > 0
            ? `Notificaciones, ${unreadCount} sin leer`
            : "Notificaciones"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(value => !value)}
      >
        <Bell size={18} strokeWidth={2} aria-hidden="true" />
        
        {notificationsReady && readStateReady && unreadCount > 0 && (
          <span className="system-notifications-badge" aria-hidden="true">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          className="system-notifications-panel"
          role="dialog"
          aria-label="Notificaciones del sistema"
        >
          <header className="system-notifications-header">
            <div>
              <span className="system-notifications-eyebrow">NOVEDADES</span>
              <h2>Notificaciones</h2>
              <p>
                {!readStateReady
                  ? (error || "Comprobando avisos...")
                  : unreadCount === 0
                    ? "Estás al día."
                    : `${unreadCount} aviso${unreadCount === 1 ? "" : "s"} sin leer`}
              </p>
            </div>

            <div className="system-notifications-header-actions">
              {notificationsReady && readStateReady && unreadCount > 0 && (
                <button
                  type="button"
                  className="system-notifications-read-all"
                  onClick={markAllAsRead}
                  disabled={saving}
                >
                  <CheckCheck size={15} aria-hidden="true" />
                  <span>Marcar todos</span>
                </button>
              )}
              <button
                type="button"
                className="system-notifications-close"
                aria-label="Cerrar notificaciones"
                onClick={() => setOpen(false)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </header>

          {error && (
            <p className="system-notifications-error" role="alert">{error}</p>
          )}

          {loading ? (
            <p className="system-notifications-empty">Cargando avisos...</p>
          ) : (
            <div className="system-notifications-list">
              {/* NOTIFICATION EMPTY V5 */}
              {notifications.length === 0 && (
                <div className="system-notifications-zero">
                  <span className="system-notifications-zero-icon">
                    <Bell size={25} strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <strong>Todo al día</strong>
                  <span>Las próximas novedades aparecerán aquí.</span>
                </div>
              )}
              {notifications.map(item => {
                const isRead = readIds.has(item.id);

                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`system-notification-item${isRead ? " is-read" : " is-unread"}`}
                    onClick={() => markAsRead(item.id)}
                    aria-pressed={isRead}
                    aria-label={`${item.type}: ${item.title}. ${isRead ? "Leído" : "Marcar como leído"}`}
                    disabled={saving}
                  >
                    <span className="system-notification-indicator" aria-hidden="true" />
                    <span className="system-notification-content">
                      <span className="system-notification-meta">
                        <span className="system-notification-category">{item.type}</span>
                        <time dateTime={item.publishedAt}>
                          {formatDate(item.publishedAt)}
                        </time>
                      </span>
                      <span className="system-notification-title">{item.title}</span>
                      <span className="system-notification-description">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}