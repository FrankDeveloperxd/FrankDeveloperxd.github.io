import React, { useEffect, useState } from "react";
import {
  Copy, Eye, EyeOff, Pencil, Trash2, Star, Clipboard
} from "lucide-react";

import BovedaIcono from "./BovedaIcono.jsx";
import { readField } from "../services/vaultCrypto.js";

import {
  notifyWorkspace
} from "../../../shared/notifications/WorkspaceToasts.jsx";

export default function BovedaCredencial({
  entry,
  busy,
  onEdit,
  onDelete,
  onFavorite
}) {
  const [visible, setVisible] = useState(false);
  const title = readField(entry, "Title");
  const username = readField(entry, "UserName");
  const favorite = readField(entry, "VaultFavorite") === "1";

  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => setVisible(false), 20000);

    function conceal() {
      if (document.hidden) setVisible(false);
    }

    document.addEventListener("visibilitychange", conceal);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", conceal);
    };
  }, [visible]);

  async function copy(field) {
    try {
      const value = field === "both"
        ? `Usuario: ${username}\nContraseña: ${readField(entry, "Password")}`
        : readField(entry, field);

      if (!value) {
        notifyWorkspace("error", "Este campo está vacío.");
        return;
      }

      await navigator.clipboard.writeText(value);

      const message = {
        UserName: "Usuario copiado.",
        Password: "Contraseña copiada.",
        both: "Usuario y contraseña copiados."
      };

      notifyWorkspace("success", message[field]);
    } catch {
      notifyWorkspace("error", "No se pudo copiar al portapapeles.");
    }
  }

  return (
    <article className="vault-credential">

      <div className="vault-credential-header">

        <BovedaIcono
          name={readField(entry, "VaultIcon")}
          color={readField(entry, "VaultColor")}
          size={21}
        />

        <div className="vault-entry-information">
          <strong title={title}>{title}</strong>
          <small title={username}>
            {username || "Sin usuario"}
          </small>
        </div>

        <div className="vault-card-tools">

          <button
            type="button"
            title={favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
            aria-label={favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
            aria-pressed={favorite}
            className={favorite ? "vault-favorite is-active" : "vault-favorite"}
            disabled={busy}
            onClick={onFavorite}
          >
            <Star
              size={16}
              fill={favorite ? "currentColor" : "none"}
            />
          </button>

          <button
            type="button"
            title="Editar credencial"
            aria-label="Editar credencial"
            disabled={busy}
            onClick={onEdit}
          >
            <Pencil size={15}/>
          </button>

          <button
            type="button"
            className="vault-danger"
            title="Eliminar credencial"
            aria-label="Eliminar credencial"
            disabled={busy}
            onClick={onDelete}
          >
            <Trash2 size={15}/>
          </button>

        </div>
      </div>

      <div className="vault-credential-details">

        <span className="vault-category">
          {readField(entry, "Category") || "Otros"}
        </span>

        <div className="vault-secret">
          <span>
            {visible ? readField(entry, "Password") : "••••••••"}
          </span>

          <button
            type="button"
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            onClick={() => setVisible(value => !value)}
          >
            {visible ? <EyeOff size={16}/> : <Eye size={16}/>}
          </button>
        </div>

      </div>

      <div className="vault-copy-actions">

        <button
          type="button"
          title="Copiar usuario"
          onClick={() => copy("UserName")}
        >
          <Copy size={14}/> Usuario
        </button>

        <button
          type="button"
          className="vault-primary"
          title="Copiar contraseña"
          onClick={() => copy("Password")}
        >
          <Copy size={14}/> Clave
        </button>

        <button
          type="button"
          title="Copiar usuario y contraseña"
          onClick={() => copy("both")}
        >
          <Clipboard size={14}/> Ambos
        </button>

      </div>

    </article>
  );
}
