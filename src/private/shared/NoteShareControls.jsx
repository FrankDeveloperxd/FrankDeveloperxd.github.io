import React, { useEffect, useState } from "react";
import { Share2, Copy, Check, Link2Off, X, Link2 } from "lucide-react";
import { supabase } from "../client";
import "./NoteSharing.css";

export default function NoteShareControls({ noteId, user }) {
  const [open, setOpen] = useState(false);
  const [share, setShare] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      const { data, error: loadError } = await supabase
        .from("workspace_note_shares")
        .select("id, token, active")
        .eq("note_id", noteId)
        .maybeSingle();

      if (!active) return;

      if (loadError) setError(loadError.message);
      else setShare(data);

      setLoading(false);
    }

    void load();

    return () => { active = false; };
  }, [noteId]);

  const url = share?.active
    ? `${window.location.origin}/compartir?token=${share.token}`
    : "";

  async function activate() {
    if (busy || !user?.id) return;

    setBusy(true);
    setError("");

    try {
      let result;

      if (share) {
        // Reactivar usando otro token: el enlace revocado no vuelve a funcionar.
        result = await supabase
          .from("workspace_note_shares")
          .update({
            active: true,
            token: crypto.randomUUID()
          })
          .eq("id", share.id)
          .eq("owner_id", user.id)
          .select("id, token, active")
          .single();
      } else {
        result = await supabase
          .from("workspace_note_shares")
          .insert({
            note_id: noteId,
            owner_id: user.id
          })
          .select("id, token, active")
          .single();
      }

      if (result.error) throw result.error;
      setShare(result.data);
      // LIVE NOTE SHARE V2
      window.dispatchEvent(
        new CustomEvent("workspace-note-share-changed")
      );
    } catch (err) {
      setError(err.message || "No se pudo generar el enlace.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!share || busy) return;

    setBusy(true);
    setError("");

    const { data, error: revokeError } = await supabase
      .from("workspace_note_shares")
      .update({ active: false })
      .eq("id", share.id)
      .eq("owner_id", user.id)
      .select("id, token, active")
      .single();

    if (revokeError) {
      setError(revokeError.message);
    } else {
      setShare(data);
      window.dispatchEvent(
        new CustomEvent("workspace-note-share-changed")
      );
    }

    setBusy(false);
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("No se pudo copiar automáticamente. Selecciona el enlace.");
    }
  }

  return (
    <div className="ns-toolbar">
      <button type="button" className="ns-share-button"
        onClick={() => setOpen(true)}>
        <Share2 size={16}/>
        Compartir
      </button>

      {open && (
        <div className="ns-backdrop" onMouseDown={e => {
          if (e.target === e.currentTarget && !busy) setOpen(false);
        }}>
          <section className="ns-dialog" role="dialog"
            aria-modal="true" aria-label="Compartir bloc de notas">
            <div className="ns-dialog-top">
              <div>
                <h2>Compartir documento</h2>
                <p>Enlace exclusivo de solo lectura.</p>
              </div>
              <button type="button" className="ns-close"
                aria-label="Cerrar"
                onClick={() => setOpen(false)}>
                <X size={19}/>
              </button>
            </div>

            {loading ? (
              <p>Consultando enlace...</p>
            ) : share?.active ? (
              <>
                <label htmlFor="ns-url">Enlace compartido</label>
                <div className="ns-url-row">
                  <input id="ns-url" value={url} readOnly
                    onFocus={e => e.target.select()}/>
                  <button type="button" onClick={copyUrl}>
                    {copied ? <Check size={17}/> : <Copy size={17}/>}
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>

                <p>Quien tenga este enlace podrá visualizar el documento
                  sin iniciar sesión. No podrá modificarlo.</p>

                <button type="button" className="ns-revoke"
                  disabled={busy} onClick={revoke}>
                  <Link2Off size={16}/> Revocar enlace
                </button>
              </>
            ) : (
              <>
                <p>El documento es privado. Puedes activar un enlace
                  de lectura cuando quieras.</p>
                <button type="button" className="ns-create"
                  disabled={busy} onClick={activate}>
                  <Link2 size={17}/>
                  {busy ? "Generando..." : "Generar enlace"}
                </button>
              </>
            )}

            {error && <p className="ns-error" role="alert">{error}</p>}
          </section>
        </div>
      )}
    </div>
  );
}
