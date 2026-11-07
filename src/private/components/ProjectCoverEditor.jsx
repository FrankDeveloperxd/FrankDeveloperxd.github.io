import React, { useRef, useState } from "react";
import { ImagePlus, Palette, Trash2, X } from "lucide-react";
import "./ProjectCoverEditor.css";
import BackgroundColorPicker from "./BackgroundColorPicker.jsx";

const MAX_BYTES = 30 * 1024;

async function compressImage(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Usa una imagen JPG, PNG o WebP.");
  }

  if (file.size > 12 * 1024 * 1024) {
    throw new Error("La imagen original no debe superar 12 MB.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const img = new Image();
    img.src = objectUrl;
    await img.decode();

    if (!img.naturalWidth || !img.naturalHeight) {
      throw new Error("La imagen no es válida.");
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("No se pudo procesar la imagen.");

    for (const maxWidth of [800, 640, 480, 360, 280, 200, 140]) {
      const ratio = Math.min(
        1,
        maxWidth / img.naturalWidth,
        450 / img.naturalHeight
      );

      canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.75, 0.6, 0.45, 0.3, 0.2, 0.1]) {
        const result = canvas.toDataURL("image/webp", quality);

        if (!result.startsWith("data:image/webp;base64,")) {
          throw new Error("Tu navegador no admite compresión WebP.");
        }

        const base64 = result.split(",")[1];
        const bytes = Math.floor(base64.length * 3 / 4) -
          (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);

        if (bytes <= MAX_BYTES) {
          return { image: result, bytes };
        }
      }
    }

    throw new Error("No se pudo reducir la imagen a 30 KB.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

const COLORS = [
  "#173B63",
  "#0A84FF",
  "#292D36",
  "#075E55",
  "#6B315B",
  "#84512A",
  "#4A436D",
  "#111827"
];

export default function ProjectCoverEditor({
  project,
  initial,
  onClose,
  onSave
}) {
  const [color, setColor] = useState(initial?.color || "#173B63");
  const [backgroundEnabled, setBackgroundEnabled] = useState(!!initial?.color);
  const backgroundPickerRef = useRef(null);
  const [folderColor, setFolderColor] = useState(initial?.folderColor || "#0A84FF");
  const [folderEnabled, setFolderEnabled] = useState(!!initial?.folderColor);
  const [image, setImage] = useState(initial?.image || initial?.storedImage || null);
  const [bytes, setBytes] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  async function selectImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setProcessing(true);
    setError("");

    try {
      const result = await compressImage(file);
      setImage(result.image);
      // AUTO ENABLE BACKGROUND IMAGE V1
      setBackgroundEnabled(true);
      setBytes(result.bytes);
    } catch (err) {
      setError(err.message || "No se pudo procesar la imagen.");
    } finally {
      setProcessing(false);
    }
  }

  const style = {
    backgroundColor: color,
    backgroundImage: image
      ? `linear-gradient(180deg,rgba(7,18,36,.15),rgba(7,18,36,.85)),url("${image}")`
      : "linear-gradient(180deg,rgba(7,18,36,.08),rgba(7,18,36,.65))"
  };

  return (
    <div className="pce-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget && !processing) onClose();
    }}>
      <section className="pce-dialog" role="dialog"
        aria-modal="true" aria-labelledby="pce-title">

        <header className="pce-heading">
          <div>
            <h2 id="pce-title">Personalizar proyecto</h2>
            <p>{project.title}</p>
          </div>
          <button type="button" onClick={onClose}
            aria-label="Cerrar" disabled={processing}>
            <X size={19}/>
          </button>
        </header>

        <div className={`pce-preview ${!backgroundEnabled ? "pce-preview-off" : ""}`} style={backgroundEnabled ? style : {backgroundColor:"#ffffff",backgroundImage:"none"}}>
          <span className="pce-preview-icon">
            <Palette size={20}/>
          </span>
          <div>
            <strong>{project.title}</strong>
            <small>Espacio de proyecto</small>
          </div>
        </div>

        {/* PROJECT OPTIONAL COLORS V1 */}
        <div className="pce-color-heading">
          <span className="pce-label">Color de fondo</span>
          <button type="button" className="pce-switch" role="switch"
            aria-checked={backgroundEnabled} aria-label="Activar o desactivar color de fondo"
            onClick={() => setBackgroundEnabled(value => !value)}>
            <span className="pce-switch-track"><span className="pce-switch-thumb"/></span>
          </button>
        </div>
        <div className={`pce-palette ${!backgroundEnabled ? "is-disabled" : ""}`}>
          {COLORS.map(value => (
            <button
              type="button"
              key={value}
              className={backgroundEnabled && color === value ? "is-chosen" : ""}
              aria-label={`Seleccionar color ${value}`}
              aria-pressed={color === value}
              title={value}
              style={{backgroundColor:value}}
              onClick={() => { setColor(value); setBackgroundEnabled(true); }}
            />
          ))}
          <BackgroundColorPicker value={color} empty={!backgroundEnabled} onChange={value => { setColor(value); setBackgroundEnabled(true); }}/>
        </div>

                <div className="pce-color-heading">
          <span className="pce-label">Color de carpeta</span>
          <button type="button" className="pce-switch" role="switch"
            aria-checked={folderEnabled} aria-label="Activar o desactivar color de carpeta"
            onClick={() => setFolderEnabled(value => !value)}>
            <span className="pce-switch-track"><span className="pce-switch-thumb"/></span>
          </button>
        </div>
        <div className={`pce-palette pce-folder-palette ${!folderEnabled ? "is-disabled" : ""}`}>
          {[
            "#0A84FF",
            "#16A34A",
            "#F97316",
            "#A855F7",
            "#DC2626",
            "#0891B2",
            "#EAB308",
            "#64748B"
          ].map(value => (
            <button
              type="button"
              key={value}
              className={folderEnabled && folderColor === value ? "is-chosen" : ""}
              title={value}
              aria-label={`Color de carpeta ${value}`}
              aria-pressed={folderColor === value}
              style={{ backgroundColor: value }}
              onClick={() => { setFolderColor(value); setFolderEnabled(true); }}
            />
          ))}
          <BackgroundColorPicker
            value={folderColor}
            empty={!folderEnabled}
            direction="down"
            onChange={value => {
              setFolderColor(value);
              setFolderEnabled(true);
            }}
          />
        </div>
        <p className="pce-hint">
          Este color se mostrará en el icono de la carpeta.
        </p>
        <label className="pce-upload">
          <ImagePlus size={19}/>
          {processing ? "Comprimiendo imagen..." : "Elegir imagen de fondo"}
          <input type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={processing}
            onChange={selectImage}/>
        </label>

        <p className="pce-hint">
          WebP, máximo 30 KB. La imagen cubrirá toda la tarjeta.
        </p>

        {image && (
          <button type="button" className="pce-remove"
            onClick={() => { setImage(null); setBytes(null); }}>
            <Trash2 size={15}/> Quitar imagen y usar color
          </button>
        )}

        {bytes !== null && (
          <p className="pce-success">
            Imagen comprimida: {(bytes / 1024).toFixed(1)} KB
          </p>
        )}

        {error && <p className="pce-error" role="alert">{error}</p>}

        <footer className="pce-actions">
          <button type="button" onClick={onClose}
            disabled={processing}>Cancelar</button>
          <button type="button" className="pce-primary"
            disabled={processing}
            onClick={async () => {
              if (processing) return;
              setProcessing(true);
              setError("");
              try {
                await onSave({
                  color: backgroundEnabled ? color : null,
                  image: backgroundEnabled ? image : null,
                  storedImage: image,
                  folderColor: folderEnabled ? folderColor : null
                });
              } catch (err) {
                setError(err.message || "No se pudo guardar la apariencia.");
              } finally {
                setProcessing(false);
              }
            }}>
            Guardar apariencia
          </button>
        </footer>
      </section>
    </div>
  );
}