import NotificationGuide, {
  getKind,
  cleanTitle
} from "./NotificationGuide.jsx";
import React, { useEffect, useRef, useState } from "react";
import {
  Bell, CheckCheck, X, Sparkles,
  Image as ImageIcon, Activity,
  CalendarDays, ShieldCheck, Columns3
} from "lucide-react";
import { supabase } from "../services/client";
import "./SystemNotifications.css";

/*
 * Novedades del sistema.
 * Agrega aquí un aviso concreto cuando publiques una mejora o corrección.
 * El id debe ser único y no debe cambiar después de publicarlo.
 */














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
/* NOTIFICATION MODAL V2 */

function readMotionPreference(key) {
  try {
    return localStorage.getItem(key) !== "off";
  } catch {
    return true;
  }
}

function formatNoticeDate(value) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("es-PE", {
        day: "numeric",
        month: "short",
        year: "numeric"
      }).format(date);
}

const NOTICE_ICONS = {
  kanban: Columns3,
  notes: ImageIcon,
  activity: Activity,
  calendar: CalendarDays,
  vault: ShieldCheck,
  general: Bell
};

export default function SystemNotifications({ userId }) {
  const [notifications, setNotifications] = useState(
    () => readCachedNotifications(userId) || []
  );
  const [notificationsReady, setNotificationsReady] = useState(
    () => readCachedNotifications(userId) !== null
  );
  const [open, setOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const motionKey = "workspace-notification-motion:" + userId;

  const [motionPreference, setMotionPreference] = useState(() => ({
    key: motionKey,
    enabled: readMotionPreference(motionKey)
  }));

  const animate = motionPreference.key === motionKey
    ? motionPreference.enabled
    : readMotionPreference(motionKey);

  function toggleMotion() {
    const next = !animate;

    setMotionPreference({
      key: motionKey,
      enabled: next
    });

    try {
      localStorage.setItem(motionKey, next ? "on" : "off");
    } catch {
      // La preferencia sigue funcionando durante la sesion.
    }
  }
  

  
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
    let lastRefresh = 0;

    const cached = readCachedNotifications(userId);
    const cachedReads = readCachedNotificationIds(userId);
    setNotifications(cached || []);
    setReadIds(new Set(cachedReads || []));
    setNotificationsReady(cached !== null);
    setReadStateReady(cachedReads !== null);
    setLoading(cached === null || cachedReads === null);

    async function refresh() {
      if (!userId || !active || inFlight || Date.now() - lastRefresh < 10000) return;
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

        lastRefresh = Date.now();
        setNotifications(current =>
          JSON.stringify(current) === JSON.stringify(next) ? current : next
        );
        setReadIds(current =>
          current.size === ids.size && [...current].every(id => ids.has(id))
            ? current
            : ids
        );
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
    }, 120000);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [userId]);
  

  const unreadCount = notifications.filter(
    item => !readIds.has(item.id)
  ).length;

  async function markAsRead(notificationId) {
    if (!userId) return false;
    if (readIds.has(notificationId)) return true;

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
      return false;
    }

    setReadIds(current => {
      const next = new Set([...current, notificationId]);
      saveCachedNotificationIds(userId, next);
      return next;
    });
    return true;
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

  



  function closePanel() {
    setGuideOpen(false);
    setOpen(false);
  }

  function openNotice(item) {

    if (!readIds.has(item.id) && !saving) {
      void markAsRead(item.id).catch(() => {
        setSaving(false);
        setError("No se pudo guardar la lectura.");
      });
    }
  }

  useEffect(() => {
    if (!open || guideOpen) return;

    function outside(event) {
      if (!rootRef.current?.contains(event.target)) {
        closePanel();
      }
    }

    function keyboard(event) {
      if (event.key === "Escape") {
        closePanel();
      }
    }

    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keyboard);

    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keyboard);
    };
  }, [open, guideOpen]);

  useEffect(() => {
    setGuideOpen(false);
    setOpen(false);
  }, [userId]);

  return (
    <div className="system-notifications"
      ref={rootRef}
      data-motion={animate ? "on" : "off"}>
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
          aria-label="Notificaciones"
        >
          <header className="system-notifications-header">

            <div className="system-notifications-heading">
              <h2>Notificaciones</h2>

              {readStateReady && unreadCount > 0 && (
                <p>{unreadCount} sin leer</p>
              )}
            </div>

            <div className="system-notifications-header-actions">

              <button
                type="button"
                className="system-notifications-close"
                title="Descubrir Mi Workspace"
                aria-label="Abrir guía de novedades"
                onClick={() => setGuideOpen(true)}
              >
                <Sparkles size={19}/>
              </button>

              {readStateReady &&
                notificationsReady &&
                unreadCount > 0 && (
                  <button
                    type="button"
                    className="system-notifications-read-all"
                    title="Marcar todas como leídas"
                    aria-label="Marcar todas como leídas"
                    onClick={markAllAsRead}
                    disabled={saving}
                  >
                    <CheckCheck size={19}/>
                  </button>
                )}

              <button
                type="button"
                className="system-notifications-close"
                aria-label="Cerrar notificaciones"
                onClick={closePanel}
              >
                <X size={19}/>
              </button>

            </div>

          </header>

          {error && (
            <p className="system-notifications-error" role="alert">
              {error}
            </p>
          )}

          {loading && notifications.length === 0 ? (
            <p className="system-notifications-empty">
              Cargando avisos...
            </p>
          ) : (
            <div className="system-notifications-list">

              {notifications.length === 0 && (
                <div className="system-notifications-zero">
                  <span className="system-notifications-zero-icon">
                    <Bell size={25}/>
                  </span>
                  <strong>Todo al día</strong>
                  <span>Las próximas novedades aparecerán aquí.</span>
                </div>
              )}

              {notifications.map(item => {
                const isRead = readIds.has(item.id);
                const title = cleanTitle(item.title);
                const Icon = NOTICE_ICONS[getKind(item)] || Bell;

                return (
                  <button
                    type="button"
                    key={item.id}
                    className={
                      "system-notification-item" +
                      (isRead ? " is-read" : " is-unread")
                    }
                    aria-label={
                      title + (isRead ? ". Leído" : ". Sin leer")
                    }
                    disabled={saving}
                    onClick={() => openNotice(item)}
                  >
                    <span className="system-notification-icon">
                      <Icon size={21} strokeWidth={1.8}/>
                    </span>

                    <span className="system-notification-content">
                      <span className="system-notification-title">
                        {title}
                      </span>

                      <span className="system-notification-description">
                        {item.description}
                      </span>

                      <time
                        className="system-notification-date"
                        dateTime={item.publishedAt}
                      >
                        {formatNoticeDate(item.publishedAt)}
                      </time>
                    </span>

                    <span className="sn-row-end">
                      {!isRead && (
                        <span
                          className="system-notification-indicator"
                          aria-hidden="true"
                        />
                      )}

                    </span>

                  </button>
                );
              })}

            </div>
          )}

        </section>
      )}

      {open && guideOpen && (
        <NotificationGuide
          animate={animate}
          onToggleMotion={toggleMotion}
          onClose={() => setGuideOpen(false)}
        />
      )}
    </div>
  );
}