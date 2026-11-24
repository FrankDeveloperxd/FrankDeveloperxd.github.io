import React, { useEffect, useState } from "react";

import {
  ShieldCheck, LockKeyhole, Plus, Search,
  KeyRound, Star, Download
} from "lucide-react";

import { useVault } from "./hooks/useVault.js";

import {
  readField, listCredentials,
  saveCredential, removeCredential
} from "./services/vaultCrypto.js";

import {
  confirmWorkspace
} from "../../shared/feedback/workspaceFeedback.js";

import {
  notifyWorkspace
} from "../../shared/notifications/WorkspaceToasts.jsx";

import { readWorkspaceTheme } from "../../theme/WorkspaceTheme.jsx";

import VaultUnlock from "./components/VaultUnlock.jsx";
import CredentialForm from "./components/CredentialForm.jsx";
import BovedaCredencial from "./components/BovedaCredencial.jsx";

import "./BovedaInicio.css";

const EMPTY = {
  title: "",
  username: "",
  password: "",
  url: "",
  notes: "",
  category: "Cuentas",
  icon: "key",
  color: "#2563eb",
  favorite: false
};

function useBovedaTheme(owner) {
  const read = () => readWorkspaceTheme(owner) === "light"
    ? "light"
    : "dark";

  const [theme, setTheme] = useState(read);

  useEffect(() => {
    const update = () => setTheme(read());
    const observer = new MutationObserver(update);

    for (const element of [
      document.documentElement,
      document.body,
      document.querySelector(".private-root")
    ]) {
      if (element) {
        observer.observe(element, { attributes: true });
      }
    }

    window.addEventListener("storage", update);
    update();

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", update);
    };
  }, [owner]);

  return theme;
}

function readCredential(entry) {
  return {
    id: entry.uuid.toString(),
    title: readField(entry, "Title"),
    username: readField(entry, "UserName"),
    password: readField(entry, "Password"),
    url: readField(entry, "URL"),
    notes: readField(entry, "Notes"),
    category: readField(entry, "Category") || "Otros",
    icon: readField(entry, "VaultIcon") || "key",
    color: readField(entry, "VaultColor") || "#2563eb",
    favorite: readField(entry, "VaultFavorite") === "1"
  };
}

function BovedaContenido({ vault }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [editing, setEditing] = useState(null);

  const entries = listCredentials(vault.db);


  const categories = [...new Set(entries.map(
    entry => readField(entry, "Category") || "Otros"
  ))];

  const filtered = entries.filter(entry => {
    const text = [
      readField(entry, "Title"),
      readField(entry, "UserName"),
      readField(entry, "URL"),
      readField(entry, "Category")
    ].join(" ").toLowerCase();

    const favorite = readField(entry, "VaultFavorite") === "1";
    const group = readField(entry, "Category") || "Otros";

    const matches = category === "Todas" ||
      (category === "Favoritos" && favorite) ||
      category === group;

    return matches && text.includes(search.trim().toLowerCase());
  }).sort((a, b) =>
    readField(b, "VaultFavorite").localeCompare(readField(a, "VaultFavorite")) ||
    readField(a, "Title").localeCompare(readField(b, "Title"))
  );

  async function remove(entry) {
    const id = entry.uuid.toString();

    if (!await confirmWorkspace({
      title: "Eliminar credencial",
      message: "Esta acción eliminará el acceso de tu bóveda.",
      confirmLabel: "Eliminar"
    })) return;

    const ok = await vault.mutate(db => removeCredential(db, id));

    if (ok) {
      notifyWorkspace("success", "Credencial eliminada.");
    }
  }

  async function toggleFavorite(entry) {
    const id = entry.uuid.toString();

    const ok = await vault.mutate(db => {
      const current = listCredentials(db).find(
        item => item.uuid.toString() === id
      );

      if (!current) throw new Error("Credencial no encontrada.");

      const next = readField(current, "VaultFavorite") !== "1";
      current.fields.set("VaultFavorite", next ? "1" : "0");
      current.times.update();
    });

    if (ok) notifyWorkspace("success", "Favoritos actualizados.");
  }

  return (
    <>
      <section className="vault-session-banner">
        <div className="vault-status">
          <span className="vault-session-icon">
            <ShieldCheck size={28}/>
          </span>

          <div>
            <strong>Bóveda desbloqueada</strong>
            <small role="status">
    {vault.syncMessage} · Bloqueo tras 15 minutos.
  </small>
          </div>
        </div>

        <button type="button" onClick={() => {
          vault.lock();
          notifyWorkspace("success", "Bóveda bloqueada.");
        }}>
          <LockKeyhole size={18}/> Bloquear
        </button>
      </section>

      {editing ? (
        <CredentialForm
          key={editing.id || "new"}
          initial={editing}
          busy={vault.busy || vault.readOnly}
          onCancel={() => setEditing(null)}
          onSave={async data => {
            const ok = await vault.mutate(db => {
              saveCredential(db, data, editing.id);
            });

            if (ok) {
              setEditing(null);

              notifyWorkspace("success",
                editing.id ? "Credencial actualizada." : "Credencial guardada."
              );
            }
          }}
        />
      ) : (
        <>
          <div className="vault-toolbar">
            <div className="vault-search">
              <Search size={20}/>
              <input
                placeholder="Buscar credenciales..."
                aria-label="Buscar credenciales"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <button className="vault-primary"
              disabled={vault.busy || vault.readOnly}
              onClick={() => setEditing({ ...EMPTY })}>
              <Plus size={20}/> Nueva credencial
            </button>
          </div>

          <div className="vault-filters">
            {["Todas", "Favoritos", ...categories.filter(
              item => !["Todas", "Favoritos"].includes(item)
            )].map(item => (
              <button
                key={item}
                type="button"
                className={category === item ? "is-active" : ""}
                onClick={() => setCategory(item)}
              >
                {item === "Favoritos" && <Star size={16}/>}
                {item}
              </button>
            ))}
          </div>

          <div className="vault-section-title">
            <h2>Mis credenciales</h2>
            <small>{filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}</small>
          </div>

          {filtered.length ? (
            <div className="vault-grid">
              {filtered.map(entry => (
                <BovedaCredencial
                  key={entry.uuid.toString()}
                  entry={entry}
                  busy={vault.busy || vault.readOnly}
                  onEdit={() => setEditing(readCredential(entry))}
                  onDelete={() => remove(entry)}
                  onFavorite={() => toggleFavorite(entry)}
                />
              ))}
            </div>
          ) : (
            <div className="vault-panel vault-empty">
              <KeyRound size={40}/>
              <h3>No hay credenciales</h3>
              <p>Añade un acceso o modifica los filtros.</p>

              <button type="button" onClick={() => {
                setSearch("");
                setCategory("Todas");
              }}>
                Limpiar filtros
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function BovedaInicio({ user, active = true }) {
  const vault = useVault(user.id);
  const theme = useBovedaTheme(user.id);

  // El hook permanece activo, pero las credenciales
  // desaparecen del DOM al abandonar la pantalla.
  if (!active) return null;

  return (
    <div className="vault-page" data-vault-theme={theme}>
      <div className="vault-heading">
        <div>
          <h1>Bóveda</h1>
          <p>Tus accesos, en un solo lugar.</p>
        </div>

        {vault.record && (
          <button type="button"
            disabled={vault.busy}
            onClick={async () => {
              if (await vault.exportFile()) {
                notifyWorkspace("success", "Exportación cifrada generada.");
              }
            }}>
            <Download size={18}/> Exportar KDBX
          </button>
        )}
      </div>

      {vault.error && (
        <div className="vault-error" role="alert">
          {vault.error}
        </div>
      )}

      {vault.record === undefined ? (
        <div className="vault-panel" role="status">
          Comprobando almacenamiento local...
        </div>
      ) : vault.mode === "offline" && !vault.record ? (
        <div className="vault-panel" role="status">
          Supabase no disponible y sin copia local.
        </div>
      ) : vault.db ? (
        <BovedaContenido vault={vault}/>
      ) : (
        <VaultUnlock
          exists={!!vault.record}
          busy={vault.busy}
          onUnlock={async (password, file) => {
            if (await vault.start(password, file)) {
              notifyWorkspace("success", "Bóveda desbloqueada.");
            }
          }}
        />
      )}

      <div className="vault-footer">
        <ShieldCheck size={17}/>
        <span role="status">
    {vault.db
      ? "Almacenamiento cifrado KDBX"
      : vault.syncMessage}
  </span>

  {!vault.db && (
    <button
      type="button"
      disabled={vault.busy}
      onClick={vault.refresh}
    >
      Reintentar conexión
    </button>
  )}
      </div>
    </div>
  );
}