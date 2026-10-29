import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import './TemporaryImageUpload.css';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = url && key ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
}) : null;

export default function TemporaryImageUpload({ onPublished }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function publish(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setError('Sube un PNG, JPG o WebP de máximo 2 MB.'); return;
    }
    if (!supabase) { setError('Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'); return; }
    setBusy(true); setError(''); setResult(null);
    try {
      let { data: auth } = await supabase.auth.getSession();
      if (!auth.session) {
        const signed = await supabase.auth.signInAnonymously();
        if (signed.error) throw signed.error;
        auth.session = signed.data.session;
      }
      const response = await fetch(`${url}/functions/v1/qr-temporary-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.session.access_token}`, apikey: key },
        body: file,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'No se pudo publicar.');
      setResult(body);
      onPublished(body.url);
    } catch (e) { setError(e.message || 'Error de conexión.'); }
    finally { setBusy(false); }
  }

  return <section className="qrtemp">
    <label className="qrtemp-upload">
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={publish} disabled={busy}/>
      <span aria-hidden="true">{busy ? '◌' : '↑'}</span>
      <strong>{busy ? 'Publicando…' : 'Subir imagen y crear QR'}</strong>
      <small>Máximo 2 MB · El enlace dura 24 horas</small>
    </label>
    {result && <div className="qrtemp-result">
      <strong>Imagen disponible por 24 horas</strong>
      <p>El QR ya contiene el enlace temporal.</p>
      <div className="qrtemp-actions">
        <button type="button" onClick={() => navigator.clipboard.writeText(result.url)}>Copiar enlace</button>
        <a href={result.url} target="_blank" rel="noopener noreferrer">Abrir imagen</a>
      </div>
    </div>}
    {error && <p className="qrtemp-error" role="alert">{error}</p>}
  </section>;
}
