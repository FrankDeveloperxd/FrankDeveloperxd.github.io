import React, { useState } from "react";
import { Download, Link2, RefreshCw } from "lucide-react";
import { supabase } from "../client";
import "./WorkspaceCalendarExport.css";

const clean = (value) => String(value ?? "").replace(/\\/g, "\\\\").replace(/\r\n?|\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
const stamp = (date) => new Date(date).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const fold = (line) => {
  const chunks = [];
  let current = "";
  const encoder = new TextEncoder();
  for (const char of line) {
    if (encoder.encode(current + char).length > 73) {
      chunks.push(current);
      current = " " + char;
    } else current += char;
  }
  chunks.push(current);
  return chunks.join("\r\n");
};
function toIcs(events) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Workspace//Agenda Personal//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Workspace"];
  events.forEach(event => {
    const begin = new Date(event.start_at);
    const end = new Date(event.end_at);
    if (isNaN(begin.getTime()) || isNaN(end.getTime())) return;
    lines.push("BEGIN:VEVENT", `UID:${event.id}@workspace`, `DTSTAMP:${stamp(event.updated_at || new Date())}`, `DTSTART:${stamp(begin)}`, `DTEND:${stamp(end)}`, `SUMMARY:${clean(event.title)}`, `DESCRIPTION:${clean(event.description)}`, "END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
const cfgUrl = import.meta.env.VITE_SUPABASE_URL;
const fnUrl = cfgUrl ? `${cfgUrl.replace(/\/$/, "")}/functions/v1/workspace-ical` : "";

export default function WorkspaceCalendarExport({ user }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [subscription, setSubscription] = useState("");
  async function fetchEvents() {
    const batch = 500;
    let offset = 0;
    let result = [];
    while (true) {
      const { data, error } = await supabase.from("workspace_calendar_events")
        .select("id,title,description,start_at,end_at,updated_at")
        .eq("owner_id", user.id)
        .order("start_at", { ascending: true })
        .range(offset, offset + batch - 1);
      if (error) throw error;
      result = result.concat(data || []);
      if (!data || data.length < batch) return result;
      offset += batch;
      if (offset > 10000) throw new Error("Demasiados eventos para exportar a la vez.");
    }
  }
  async function download() {
    setError(""); setBusy(true);
    try {
      const events = await fetchEvents();
      const blob = new Blob([toIcs(events)], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "mi-workspace.ics"; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e.message || "No se pudo exportar."); }
    finally { setBusy(false); }
  }
  async function generate(rotate = false) {
    setError(""); setBusy(true);
    try {
      if (!fnUrl) throw new Error("Falta configurar VITE_SUPABASE_URL.");
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session?.access_token) throw new Error("Inicia sesión de nuevo.");
      const response = await fetch(fnUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}`, "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "" },
        body: JSON.stringify({ rotate })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo crear el enlace.");
      setSubscription(payload.url);
    } catch (e) { setError(e.message || "Error al generar enlace."); }
    finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(subscription); }
    catch { setError("No se pudo copiar. Selecciona y copia el enlace manualmente."); }
  }
  return <details className="wc-export" aria-label="Integración iCalendar">
    <summary className="wc-export-summary">
  <span className="wc-export-summary-icon"><Download size={17}/></span>
  <span className="wc-export-summary-text">
    <strong>Calendarios externos</strong>
    <small>Exportar .ics y administrar la suscripción privada</small>
  </span>
  <span className="wc-export-chevron" aria-hidden="true"></span>
</summary>
<div className="wc-export-body">
    <div className="wc-export-actions">
      <button type="button" disabled={busy} onClick={download}><Download size={16}/> Descargar .ics</button>
      <button type="button" disabled={busy} onClick={() => generate(false)}><Link2 size={16}/> Obtener suscripción privada</button>
    </div>
    {subscription && <div className="wc-export-link"><label htmlFor="wc-subscription">Tu enlace privado (solo lectura)</label><input id="wc-subscription" type="text" readOnly value={subscription} onFocus={e => e.target.select()}/><div className="wc-export-actions"><button type="button" onClick={copy}>Copiar enlace</button><button type="button" disabled={busy} onClick={() => generate(true)}><RefreshCw size={16}/> Revocar y generar nuevo</button></div></div>}
    <p className="wc-export-help">La descarga .ics importa una copia. La suscripción es de solo lectura y se actualiza cuando el proveedor refresca los datos. Cualquiera con el enlace puede leer tu agenda: no lo publiques.</p>
    {error && <p className="wc-export-error" role="alert">{error}</p>}
  </div></details>;
}
