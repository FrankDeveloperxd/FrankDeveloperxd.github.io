import React, { useState } from "react";
import { ShieldCheck, LockKeyhole, Upload } from "lucide-react";

export default function VaultUnlock({
  exists,
  busy,
  onUnlock
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!exists && !file) {
      if (password.length < 16) {
        setError("La frase maestra debe tener al menos 16 caracteres.");
        return;
      }

      if (password !== confirmation) {
        setError("Las contraseñas no coinciden.");
        return;
      }
    }

    try {
      await onUnlock(password, file);
    } finally {
      setPassword("");
      setConfirmation("");
    }
  }

  return (
    <section className="vault-panel vault-unlock">
      <div className="vault-lock-icon">
        <ShieldCheck size={30}/>
      </div>

      <h2>{exists ? "Bóveda bloqueada" : "Crea tu bóveda"}</h2>

      <p>
        {exists
          ? "Introduce tu contraseña maestra."
          : "Protege tus credenciales con una frase maestra independiente."}
      </p>

      <form className="vault-form" onSubmit={submit}>
        <label>
          Contraseña maestra
          <input
            type="password"
            autoComplete={exists ? "current-password" : "new-password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            disabled={busy}
          />
        </label>

        {!exists && !file && (
          <label>
            Confirmar contraseña
            <input
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={e => setConfirmation(e.target.value)}
              required
              disabled={busy}
            />
          </label>
        )}

        {!exists && (
          <label className="vault-import">
            <span><Upload size={16}/> Restaurar respaldo local</span>
            <input
              type="file"
              accept=".kdbx"
              disabled={busy}
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </label>
        )}

        {error && <p role="alert">{error}</p>}

        <button className="private-primary" disabled={busy}>
          <LockKeyhole size={17}/>
          {busy ? "Procesando..." :
            exists || file ? "Desbloquear" : "Crear bóveda"}
        </button>
      </form>

      {!exists && (
        <small>No podemos recuperar tu contraseña maestra si la olvidas.</small>
      )}
    </section>
  );
}