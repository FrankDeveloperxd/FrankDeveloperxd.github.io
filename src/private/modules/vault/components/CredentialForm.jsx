import React, { useEffect, useId, useState } from "react";

import {
  Eye, EyeOff, RefreshCw, X, Save, Star,
  ChevronDown, ChevronUp, NotebookPen
} from "lucide-react";

import { generatePassword } from "../utils/passwordGenerator.js";

import BovedaIcono, {
  BovedaIconoSelector
} from "./BovedaIcono.jsx";

import "./CredentialForm.css";

export default function CredentialForm({
  initial,
  busy,
  onSave,
  onCancel
}) {
  const [data, setData] = useState(initial);
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const passwordId = useId();
  const customizationId = useId();
  const notesId = useId();

  function update(field, value) {
    setData(current => ({
      ...current,
      [field]: value
    }));
  }

  useEffect(() => {
    function conceal() {
      if (document.hidden) setVisible(false);
    }

    document.addEventListener(
      "visibilitychange",
      conceal
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        conceal
      );
    };
  }, []);

  const categories = [
    ...new Set([
      "Cuentas",
      "API Keys",
      "Servidores",
      "Bases de datos",
      "Personal",
      "Otros",
      data.category
    ].filter(Boolean))
  ];

  async function submit(event) {
    event.preventDefault();

    if (!data.title.trim() || busy) return;

    await onSave(data);
  }

  return (
    <section className="vault-panel vault-editor vault-compact-editor">

      {/* ENCABEZADO */}

      <div className="vault-editor-heading">

        <button
          type="button"
          className="vault-icon-trigger"
          title="Personalizar icono"
          aria-label="Personalizar icono"
          aria-expanded={customizing}
          aria-controls={customizationId}
          disabled={busy}
          onClick={() => setCustomizing(value => !value)}
        >
          <BovedaIcono
            name={data.icon}
            color={data.color}
            size={23}
          />
        </button>

        <div className="vault-editor-title">

          <h2>
            {initial.id
              ? "Editar credencial"
              : "Nueva credencial"}
          </h2>

          <button
            type="button"
            className="vault-text-action"
            aria-expanded={customizing}
            aria-controls={customizationId}
            disabled={busy}
            onClick={() => setCustomizing(value => !value)}
          >
            Personalizar icono
            {customizing
              ? <ChevronUp size={13}/>
              : <ChevronDown size={13}/>}
          </button>

        </div>

        <button
          type="button"
          title={data.favorite
            ? "Quitar de favoritos"
            : "Añadir a favoritos"}
          aria-label={data.favorite
            ? "Quitar de favoritos"
            : "Añadir a favoritos"}
          aria-pressed={!!data.favorite}
          className={
            data.favorite
              ? "vault-favorite is-active"
              : "vault-favorite"
          }
          disabled={busy}
          onClick={() => update(
            "favorite",
            !data.favorite
          )}
        >
          <Star
            size={18}
            fill={data.favorite
              ? "currentColor"
              : "none"}
          />
        </button>

        <button
          type="button"
          title="Cerrar"
          aria-label="Cerrar formulario"
          disabled={busy}
          onClick={onCancel}
        >
          <X size={18}/>
        </button>

      </div>

      <form className="vault-form" onSubmit={submit}>

        <fieldset disabled={busy}>

          {/* PERSONALIZACION DESPLEGABLE */}

          {customizing && (
            <div
              id={customizationId}
              className="vault-editor-customization"
            >
              <BovedaIconoSelector
                icon={data.icon}
                color={data.color}
                onChange={update}
              />
            </div>
          )}

          {/* CAMPOS PRINCIPALES */}

          <div className="vault-form-grid">

            <label>
              Nombre del servicio
              <input
                required
                maxLength={150}
                value={data.title}
                placeholder="Ej. GitHub"
                onChange={e => update(
                  "title",
                  e.target.value
                )}
              />
            </label>

            <label>
              Categoría
              <select
                value={data.category}
                onChange={e => update(
                  "category",
                  e.target.value
                )}
              >
                {categories.map(item => (
                  <option key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Usuario o correo
              <input
                autoComplete="off"
                value={data.username}
                placeholder="Usuario"
                onChange={e => update(
                  "username",
                  e.target.value
                )}
              />
            </label>

            <label>
              Sitio web
              <input
                value={data.url}
                placeholder="https://"
                onChange={e => update(
                  "url",
                  e.target.value
                )}
              />
            </label>

          </div>

          {/* CONTRASENA Y GENERADOR */}

          <div className="vault-password-group">

            <label htmlFor={passwordId}>
              Contraseña o clave
            </label>

            <div className="vault-password-input">

              <input
                id={passwordId}
                type={visible ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                value={data.password}
                onChange={e => update(
                  "password",
                  e.target.value
                )}
              />

              <button
                type="button"
                aria-label={visible
                  ? "Ocultar contraseña"
                  : "Mostrar contraseña"}
                title={visible ? "Ocultar" : "Mostrar"}
                onClick={() => setVisible(value => !value)}
              >
                {visible
                  ? <EyeOff size={17}/>
                  : <Eye size={17}/>}
              </button>

              <button
                type="button"
                className="vault-generate"
                onClick={() => update(
                  "password",
                  generatePassword()
                )}
              >
                <RefreshCw size={15}/>
                Generar
              </button>

            </div>
          </div>

          {/* NOTAS OPCIONALES */}

          <div className="vault-notes-group">

            <button
              type="button"
              className="vault-notes-toggle"
              aria-expanded={showNotes}
              aria-controls={notesId}
              onClick={() => setShowNotes(value => !value)}
            >
              <NotebookPen size={16}/>

              <span>
                Notas privadas
                {data.notes?.trim()
                  ? " (con contenido)"
                  : " (opcional)"}
              </span>

              {showNotes
                ? <ChevronUp size={16}/>
                : <ChevronDown size={16}/>}
            </button>

            {showNotes && (
              <textarea
                id={notesId}
                aria-label="Notas privadas"
                rows={2}
                placeholder="Información adicional..."
                value={data.notes}
                onChange={e => update(
                  "notes",
                  e.target.value
                )}
              />
            )}

          </div>

        </fieldset>

        {/* ACCIONES */}

        <div className="vault-form-footer">

          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
          >
            Cancelar
          </button>

          <button
            className="vault-primary"
            type="submit"
            disabled={busy}
          >
            <Save size={16}/>
            {busy ? "Guardando..." : "Guardar"}
          </button>

        </div>

      </form>
    </section>
  );
}