import React, { useEffect, useState } from "react";
import { CalendarDays, Link2, RefreshCw } from "lucide-react";
import { supabase } from "../client";
import "./GoogleCalendarConnection.css";

export default function GoogleCalendarConnection({ user }) {
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  async function invoke(name, body) {
    const { data, error } = await supabase.functions.invoke(name, {
      body,
    });

    if (error) {
      throw new Error(
        data?.error || error.message || "Error de conexion"
      );
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  }

  async function loadEvents() {
    setLoading(true);
    setMessage("");

    try {
      const first = new Date();
      first.setMonth(first.getMonth() - 1);

      const last = new Date();
      last.setMonth(last.getMonth() + 2);

      const data = await invoke("google-calendar-events", {
        timeMin: first.toISOString(),
        timeMax: last.toISOString(),
      });

      setConnected(Boolean(data.connected));
      setEmail(data.google_email || "");
      setEvents(data.events || []);

      if (data.reconnect_required) {
        setMessage("Google requiere una nueva autorizacion.");
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const result = params.get("google");

    if (result) {
      const url = new URL(window.location.href);
      url.searchParams.delete("google");
      url.searchParams.set("vista", "calendar");

      window.history.replaceState(
        window.history.state,
        "",
        url.pathname + url.search + url.hash
      );
    }

    if (result === "cancelled" && active) {
      setMessage("Se cancelo la autorizacion de Google.");
    }

    loadEvents();

    return () => {
      active = false;
    };
  }, [user.id]);

  async function connect() {
    setConnecting(true);
    setMessage("");

    try {
      const returnTo = window.location.hostname === "localhost"
        ? "http://localhost:5173/mi-espacio"
        : "https://frankdeveloperxd.github.io/mi-espacio";

      const data = await invoke("google-calendar-connect", {
        returnTo,
      });

      if (!data.authorization_url) {
        throw new Error("Google no devolvio una URL de autorizacion.");
      }

      window.location.assign(data.authorization_url);
    } catch (error) {
      setMessage(error.message);
      setConnecting(false);
    }
  }

  return (
    <section className="gc-panel" aria-label="Google Calendar">
      <div className="gc-heading">
        <div>
          <h2><span className="gc-google-mark gc-google-title-mark" aria-hidden="true">G</span> Google Calendar</h2>
          <p>
            {connected
              ? "Eventos de tu cuenta Google conectada."
              : "Conecta tu cuenta para consultar sus eventos."}
          </p>
        </div>

        <div className="gc-actions">
          {connected && (
            <button type="button" onClick={loadEvents} disabled={loading}>
              <RefreshCw size={15} />
              Actualizar
            </button>
          )}

          <button
            className="gc-connect"
            type="button"
            disabled={connecting}
            onClick={connect}
          >
            <span className="gc-google-mark" aria-hidden="true">G</span>
            {connecting ? "Conectando..." :
              connected ? "Reconectar Google" : "Conectar Google"}
          </button>
        </div>
      </div>

      {email && <p className="gc-account">{email}</p>}
      {message && <p className="gc-message" role="status">{message}</p>}
      {loading && <p className="gc-muted">Consultando Google Calendar...</p>}

      {!loading && connected && (
        <div className="gc-events">
          {events.length === 0 ? (
            <p className="gc-muted">
              No hay eventos de Google en el rango consultado.
            </p>
          ) : (
            events.map((event) => (
              <article className="gc-event" key={event.id}>
                <div>
                  <strong>{event.title}</strong>
                  <small>
                    {event.start_at
                      ? new Date(event.start_at).toLocaleString("es-PE")
                      : "Sin fecha"}
                  </small>
                  {event.description && <p>{event.description}</p>}
                </div>
                {event.html_link && (
                  <a
                    href={event.html_link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver en Google
                  </a>
                )}
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}