import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import "./qr.css";

const themes = [
  { name: "Clásico", dark: "#14213d", light: "#ffffff" },
  { name: "Azul", dark: "#1559ff", light: "#ffffff" },
  { name: "Violeta", dark: "#6534dc", light: "#ffffff" },
  { name: "Verde", dark: "#086b58", light: "#ffffff" },
  { name: "Dorado", dark: "#765017", light: "#fff9ed" },
  { name: "Nocturno", dark: "#ffffff", light: "#111b32" },
];

export default function QRTool() {
  const [content, setContent] = useState("https://frankdeveloperxd.github.io");
  const [dark, setDark] = useState("#086b58");
  const [light, setLight] = useState("#ffffff");
  const [gradient, setGradient] = useState(false);
  const [second, setSecond] = useState("#18a07a");
  const [size, setSize] = useState(700);
  const [logo, setLogo] = useState(null);
  const [logoName, setLogoName] = useState("");
  const [logoSize, setLogoSize] = useState(14);
  const [customInner, setCustomInner] = useState(false);
  const [innerColor, setInnerColor] = useState("#086b58");
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function render() {
      if (!content.trim()) {
        setPreview("");
        setError("Escribe un enlace o texto.");
        return;
      }

      try {
        const canvas = document.createElement("canvas");

        await QRCode.toCanvas(canvas, content, {
          width: size,
          margin: 4,
          errorCorrectionLevel: "H",
          color: {
            dark,
            light,
          },
        });

        const ctx = canvas.getContext("2d");

        if (gradient) {
          const data = ctx.getImageData(0, 0, size, size);
          const pixels = data.data;

          const parse = (hex) => [
            parseInt(hex.slice(1, 3), 16),
            parseInt(hex.slice(3, 5), 16),
            parseInt(hex.slice(5, 7), 16),
          ];

          const a = parse(dark);
          const b = parse(second);
          const bg = parse(light);

          for (let y = 0; y < size; y++) {
            const t = y / Math.max(1, size - 1);
            const color = a.map((v, i) =>
              Math.round(v * (1 - t) + b[i] * t)
            );

            for (let x = 0; x < size; x++) {
              const k = (y * size + x) * 4;
              const diff =
                Math.abs(pixels[k] - bg[0]) +
                Math.abs(pixels[k + 1] - bg[1]) +
                Math.abs(pixels[k + 2] - bg[2]);

              if (diff > 45) {
                pixels[k] = color[0];
                pixels[k + 1] = color[1];
                pixels[k + 2] = color[2];
              }
            }
          }

          ctx.putImageData(data, 0, 0);
        }

        if (logo) {
          const image = new Image();

          await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = reject;
            image.src = logo;
          });

          const centerX = size / 2;
          const centerY = size / 2;

          const logoBox = size * (logoSize / 100);
          const badgePadding = size * 0.025;
          const badgeSize = logoBox + badgePadding * 2;
          const badgeRadius = badgeSize * 0.20;
          const badgeX = centerX - badgeSize / 2;
          const badgeY = centerY - badgeSize / 2;

          // Diseño premium: doble marco redondeado.
          const frameRadius = badgeSize * 0.22;
          const outerBorder = badgeSize * 0.085;
          const gap = badgeSize * 0.075;

          ctx.save();

          // Marco exterior verde o del color principal.
          ctx.fillStyle = dark;
          ctx.beginPath();
          ctx.roundRect(
            badgeX, badgeY,
            badgeSize, badgeSize,
            frameRadius
          );
          ctx.fill();

          // Separación blanca.
          const gapX = badgeX + outerBorder;
          const gapY = badgeY + outerBorder;
          const gapSize = badgeSize - outerBorder * 2;

          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.roundRect(
            gapX, gapY,
            gapSize, gapSize,
            Math.max(3, frameRadius - outerBorder)
          );
          ctx.fill();

          // Cuadrado central.
          const innerX = gapX + gap;
          const innerY = gapY + gap;
          const innerSize = gapSize - gap * 2;

          ctx.fillStyle = customInner ? innerColor : dark;
          ctx.beginPath();
          ctx.roundRect(
            innerX, innerY,
            innerSize, innerSize,
            innerSize * 0.20
          );
          ctx.fill();

          // Logo original con proporciones correctas.
          const safeSize = innerSize * 0.84;

          const ratio = Math.min(
            safeSize / image.naturalWidth,
            safeSize / image.naturalHeight
          );

          const w = image.naturalWidth * ratio;
          const h = image.naturalHeight * ratio;

          const drawX = innerX + (innerSize - w) / 2;
          const drawY = innerY + (innerSize - h) / 2;

          ctx.beginPath();
          ctx.roundRect(
            innerX, innerY,
            innerSize, innerSize,
            innerSize * 0.20
          );
          ctx.clip();

          ctx.drawImage(image, drawX, drawY, w, h);

          ctx.restore();
        }

        if (active) {
          setPreview(canvas.toDataURL("image/png"));
          setError("");
        }
      } catch (err) {
        if (active) {
          setError("No se pudo generar el código QR.");
          setPreview("");
        }
      }
    }

    const timer = setTimeout(render, 35);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [content, dark, light, gradient, second, size, logo, logoSize, customInner, innerColor]);

  function handleLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Selecciona una imagen PNG, JPG o WebP de hasta 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result);
      setLogoName(file.name);
      setError("");
    };
    reader.readAsDataURL(file);
  }

  function download() {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview;
    a.download = "franklabs-qr.png";
    a.click();
  }

  return (
    <div className="qrmini">
      <div className="qrmini-heading">
        <div>
          <span>FRANKLABS / QR STUDIO</span>
          <h2>Tu QR, a tu estilo.</h2>
          <p>Colores, logo central y descarga rápida con una vista limpia.</p>
        </div>
      </div>

      <div className="qrmini-layout">
        <section className="qrmini-editor">
          <div className="qrmini-block">
            <div className="qrmini-title">
              <span className="qrmini-number">01</span>
              <h3>Contenido</h3>
            </div>
            <label htmlFor="qr-content">Enlace o texto</label>
            <textarea
              id="qr-content"
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="https://tusitio.com"
            />
          </div>

          <div className="qrmini-block">
            <div className="qrmini-title">
              <span className="qrmini-number">02</span>
              <h3>Colores</h3>
            </div>

            <p className="qrmini-help">
              Elige una paleta o define tus propios colores.
            </p>

            <div className="qrmini-themes">
              {themes.map((theme) => (
                <button
                  key={theme.name}
                  type="button"
                  onClick={() => {
                    setDark(theme.dark);
                    setLight(theme.light);
                    setGradient(false);
                  }}
                  title={theme.name}
                >
                  <span
                    className="qrmini-theme-circle"
                    style={{
                      background: theme.light,
                      borderColor: theme.dark,
                    }}
                  >
                    <i style={{ background: theme.dark }} />
                  </span>
                  <small>{theme.name}</small>
                </button>
              ))}
            </div>

            <div className="qrmini-colors">
              <label>
                <span>Color del QR</span>
                <input
                  type="color"
                  value={dark}
                  onChange={(e) => setDark(e.target.value)}
                />
                <code>{dark.toUpperCase()}</code>
              </label>

              <label>
                <span>Color de fondo</span>
                <input
                  type="color"
                  value={light}
                  onChange={(e) => setLight(e.target.value)}
                />
                <code>{light.toUpperCase()}</code>
              </label>
            </div>

            <label className="qrmini-check">
              <input
                type="checkbox"
                checked={gradient}
                onChange={(e) => setGradient(e.target.checked)}
              />
              Usar degradado
            </label>

            {gradient && (
              <div className="qrmini-colors">
                <label>
                  <span>Segundo color</span>
                  <input
                    type="color"
                    value={second}
                    onChange={(e) => setSecond(e.target.value)}
                  />
                  <code>{second.toUpperCase()}</code>
                </label>
              </div>
            )}
          </div>

          <div className="qrmini-block">
            <div className="qrmini-title">
              <span className="qrmini-number">03</span>
              <h3>Logo central</h3>
            </div>

            <label className="qrmini-upload">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogo}
              />

              {logo ? (
                <img src={logo} alt="Logo seleccionado" />
              ) : (
                <span className="qrmini-upload-icon">+</span>
              )}

              <strong>{logo ? "Cambiar imagen" : "Agregar logo"}</strong>
              <small>PNG, JPG o WebP  Máximo 5 MB</small>
            </label>

            {logo && (
              <>
                <div className="qrmini-inner-color">
  <label className="qrmini-check">
    <input
      type="checkbox"
      checked={customInner}
      onChange={e => setCustomInner(e.target.checked)}
    />
    Personalizar color del cuadrado interior
  </label>

  {customInner && (
    <label className="qrmini-inner-picker">
      Color interior
      <input
        type="color"
        value={innerColor}
        onChange={e => setInnerColor(e.target.value)}
      />
      <code>{innerColor.toUpperCase()}</code>
    </label>
  )}
</div>
<div className="qrmini-image-row">
                  <span>{logoName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setLogo(null);
                      setLogoName("");
                    }}
                  >
                    Quitar
                  </button>
                </div>

                <div className="qrmini-range">
                  <label htmlFor="qr-logo-size">
                    Tamaño del logo
                    <strong>{logoSize}%</strong>
                  </label>
                  <input
                    id="qr-logo-size"
                    type="range"
                    min="8"
                    max="18"
                    value={logoSize}
                    onChange={(e) => setLogoSize(Number(e.target.value))}
                  />
                </div>
              </>
            )}
          </div>

          <div className="qrmini-block">
            <div className="qrmini-title">
              <span className="qrmini-number">04</span>
              <h3>Resolución</h3>
            </div>

            <div className="qrmini-sizes">
              {[320, 640, 1000].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={size === value ? "active" : ""}
                  onClick={() => setSize(value)}
                >
                  {value} px
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="qrmini-preview">
          <div className="qrmini-preview-heading">
            <h3>Vista previa</h3>
            <p>Diseño limpio, listo para descargar.</p>
          </div>

          <div className="qrmini-preview-stage">
            {preview ? (
              <img src={preview} alt="Tu código QR" />
            ) : (
              <span>Escribe contenido para crear tu QR.</span>
            )}
          </div>

          {error && <p className="qrmini-error">{error}</p>}

          <button
            className="qrmini-download"
            onClick={download}
            disabled={!preview}
          >
            Descargar PNG
          </button>

          <p className="qrmini-footnote">
            Usa un logo pequeño y contrastes altos para conservar buena lectura.
          </p>
        </section>
      </div>
    </div>
  );
}

