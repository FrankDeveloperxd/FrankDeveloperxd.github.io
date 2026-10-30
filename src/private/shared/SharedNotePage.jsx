import React, { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import {
  NotebookPen,
  LockKeyhole,
  FileQuestion
} from "lucide-react";
import { supabase } from "../client";
import "./NoteSharing.css";

export default function SharedNotePage() {
  const token = new URLSearchParams(
    window.location.search
  ).get("token");

  const validToken =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(token || "");

  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState(null);
  const [connection, setConnection] = useState("connecting");
  // LIVE NOTE SHARE V2

  useEffect(() => {
    let active = true;
    let requestId = 0;
    let channel = null;

    async function loadDocument() {
      if (!active || !validToken || !supabase) {
        if (active) {
          setNote(null);
          setLoading(false);
        }
        return;
      }

      const currentRequest = ++requestId;

      try {
        const { data, error } = await supabase.rpc(
          "read_shared_workspace_note",
          { p_token: token }
        );

        if (!active || currentRequest !== requestId) return;

        if (error) {
          console.error("Error leyendo la nota compartida:", error);
          return;
        }

        setNote(data?.length ? data[0] : null);
      } finally {
        if (active && currentRequest === requestId) {
          setLoading(false);
        }
      }
    }

    if (!validToken || !supabase) {
      setLoading(false);
      setConnection("offline");
      return;
    }

    setLoading(true);
    setConnection("connecting");

    // Suscripcion independiente para cada enlace.
    channel = supabase
      .channel(`shared-note:${token}`, {
        config: {
          private: true
        }
      })
      .on(
        "broadcast",
        { event: "note_changed" },
        () => {
          // Solo recibimos una notificacion.
          // El contenido se obtiene mediante RPC.
          void loadDocument();
        }
      )

      .on(
        "broadcast",
        { event: "live-draft" },
        ({ payload }) => {
          if (!active || !payload ||
              typeof payload.title !== "string" ||
              typeof payload.content !== "string") return;

          // Invalidar lecturas previas para que no
          // reemplacen un borrador mas reciente.
          requestId++;

          setNote(previous => previous ? {
            ...previous,
            title: payload.title,
            content: payload.content
          } : previous);
        }
      )
      .subscribe(status => {
        if (!active) return;

        if (status === "SUBSCRIBED") {
          setConnection("connected");

          // Recuperar cualquier cambio ocurrido
          // mientras el WebSocket se conectaba.
          void loadDocument();
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setConnection("offline");
        }
      });

    // Primera lectura sin esperar al WebSocket.
    void loadDocument();

    // Respaldo en caso de perder una notificacion.
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadDocument();
      }
    }, 20000);

    // Volver a consultar al regresar a la pestaña.
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void loadDocument();
      }
    }

    document.addEventListener(
      "visibilitychange",
      onVisibilityChange
    );

    return () => {
      active = false;
      requestId++;

      window.clearInterval(interval);

      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange
      );

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [token, validToken]);

  const safeHtml = note
    ? DOMPurify.sanitize(note.content || "", {
        USE_PROFILES: { html: true }
      })
    : "";

  return (
    <main className="ns-public-page">
      <header className="ns-public-header">
        <NotebookPen size={21}/>
        <strong>Documento compartido</strong>

        <span>
          <LockKeyhole size={14}/>
          Solo lectura
        </span>
      </header>

      <div className="ns-public-container">
        {loading ? (
          <div className="ns-public-paper">
            <p>Cargando documento...</p>
          </div>
        ) : !note ? (
          <div className="ns-public-paper ns-public-missing">
            <FileQuestion size={35}/>
            <h1>Documento no disponible</h1>
            <p>
              El enlace no existe, fue revocado
              o ya no permite acceder al documento.
            </p>
          </div>
        ) : (
          <article className="ns-public-paper">
            <div className="ns-public-label">
              BLOC DE NOTAS · SOLO LECTURA
            </div>

            <h1>{note.title}</h1>

            <div
              className="ns-public-content"
              dangerouslySetInnerHTML={{
                __html: safeHtml
              }}
            />
          </article>
        )}
      </div>
    </main>
  );
}