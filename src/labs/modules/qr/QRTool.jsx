import TemporaryImageUpload from "./components/TemporaryImageUpload.jsx";
import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import "./qr.css";
import "./qr-types.css";

const TYPES = [
  { id: "link", name: "Enlace", color: "#205cff", icon: "", help: "Abre una página web." },
  { id: "text", name: "Texto", color: "#7048d9", icon: "", help: "Muestra un mensaje." },
  { id: "wifi", name: "Wi-Fi", color: "#087eab", icon: "", help: "Facilita conectarse a una red." },
  { id: "whatsapp", name: "WhatsApp", color: "#128c57", icon: "", help: "Abre una conversación." },
  { id: "email", name: "Correo", color: "#bd493d", icon: "", help: "Prepara un correo electrónico." },
  { id: "contact", name: "Contacto", color: "#99651a", icon: "", help: "Guarda una tarjeta de contacto." },
  { id: "image", name: "Imagen", color: "#a443ba", icon: "", help: "Abre una imagen publicada en Internet." }
];

const PALETTES = [
  ["Azul", "#1559ff", "#ffffff"],
  ["Verde", "#086b58", "#ffffff"],
  ["Violeta", "#6534dc", "#ffffff"],
  ["Negro", "#14213d", "#ffffff"],
  ["Dorado", "#765017", "#fff9ed"],
  ["Nocturno", "#ffffff", "#111b32"]
];

function Icon({ type }) {
  const base = {
    viewBox: "0 0 24 24", width: 24, height: 24,
    fill: "none", stroke: "currentColor",
    strokeWidth: 1.8, strokeLinecap: "round",
    strokeLinejoin: "round", "aria-hidden": true
  };

  const drawings = {
    link: <><path d="M10 13a5 5 0 0 1 0-7l2-2a5 5 0 0 1 7 7l-2 2"/><path d="M14 11a5 5 0 0 1 0 7l-2 2a5 5 0 0 1-7-7l2-2"/></>,
    text: <><path d="M4 5h16v12H8l-4 3V5Z"/><path d="M8 9h8M8 13h5"/></>,
    wifi: <><path d="M2 9a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 15.5a6 6 0 0 1 7 0"/><circle cx="12" cy="19" r="1" fill="currentColor"/></>,
    whatsapp: <><path d="M20 11.5A8.5 8.5 0 0 1 7.7 19L4 20l1-3.5A8.5 8.5 0 1 1 20 11.5Z"/><path d="M9 8c1 4 3 6 7 7"/></>,
    email: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
    contact: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="9" r="3"/><path d="M6 18c1-3 3-4 6-4s5 1 6 4"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="9" r="2"/><path d="m4 18 5-5 4 4 3-3 4 4"/></>
  };

  return <svg {...base}>{drawings[type] || drawings.link}</svg>;
}

function escapeWifi(value) {
  return String(value || "").replace(/([\\;,:"])/g, "\\$1");
}

function escapeVcard(value) {
  return String(value || "").replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n").replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function payloadOf(type, data) {
  switch (type) {
    case "image": {
      try {
        const url = new URL(data.imageUrl.trim());
        return ["http:", "https:"].includes(url.protocol)
          ? url.href
          : "";
      } catch {
        return "";
      }
    }

    case "text":
      return data.text.trim();

    case "wifi": {
      if (!data.ssid.trim()) return "";
      const security = data.security === "nopass" ? "nopass" : data.security;
      const pass = security === "nopass" ? "" : escapeWifi(data.password);
      return `WIFI:T:${security};S:${escapeWifi(data.ssid)};P:${pass};H:${data.hidden ? "true" : "false"};;`;
    }

    case "whatsapp": {
      const number = data.phone.replace(/\D/g, "");
      if (!number) return "";
      return `https://wa.me/${number}${data.message ? `?text=${encodeURIComponent(data.message)}` : ""}`;
    }

    case "email":
      if (!data.email.trim()) return "";
      return `mailto:${data.email.trim()}?${new URLSearchParams({
        subject: data.subject, body: data.body
      }).toString()}`;

    case "contact":
      if (!data.name.trim()) return "";
      return [
        "BEGIN:VCARD", "VERSION:3.0",
        `FN:${escapeVcard(data.name)}`,
        data.phone ? `TEL:${escapeVcard(data.phone)}` : "",
        data.email ? `EMAIL:${escapeVcard(data.email)}` : "",
        "END:VCARD"
      ].filter(Boolean).join("\r\n");

    default:
      return data.url.trim();
  }
}

function ContextCard({ type, data, uploadedImage }) {
  const meta = TYPES.find(item => item.id === type) || TYPES[0];

  const primary = {
    link: data.url || "https://tusitio.com",
    image: data.imageUrl || "Publica tu imagen para compartirla",
    text: data.text || "Tu mensaje aparecerá aquí.",
    wifi: data.ssid || "Nombre de tu red",
    whatsapp: data.message || "Hola, quisiera conversar contigo.",
    email: data.subject || "Asunto del correo",
    contact: data.name || "Nombre completo"
  }[type];

  const secondary = {
    link: "Página web",
    image: "Fotografia o ilustracion",
    text: "Mensaje de texto",
    wifi: data.security === "nopass" ? "Red abierta" : "Red protegida",
    whatsapp: data.phone || "Número de WhatsApp",
    email: data.email || "destinatario@ejemplo.com",
    contact: data.phone || data.email || "Información de contacto"
  }[type];

  return (
    <div className="qrcontext" style={{ "--accent": meta.color }}>
      <div className="qrcontext-header">
        <div className="qrcontext-icon"><Icon type={type}/></div>
        <div>
          <strong>{meta.name}</strong>
          <small>{meta.help}</small>
        </div>
      </div>

      <div className={`qrcontext-demo qrcontext-${type}`}>
        {type === "image" && (
          <div className="qrcontext-image">
            {uploadedImage ? (
              <img src={uploadedImage} alt="Vista previa de la imagen subida"/>
            ) : data.imageUrl ? (
              <div className="qrcontext-big-icon"><Icon type="image"/></div>
            ) : (
              <div className="qrcontext-image-empty">
                <Icon type="image"/>
                <span>Selecciona una imagen</span>
              </div>
            )}
          </div>
        )}
        {type === "wifi" && <div className="qrcontext-big-icon"><Icon type="wifi"/></div>}
        {type === "email" && <div className="qrcontext-big-icon"><Icon type="email"/></div>}
        {type === "contact" && <div className="qrcontext-avatar"><Icon type="contact"/></div>}
        {type === "link" && <div className="qrcontext-browser"><i/><i/><i/><span>Vista de enlace</span></div>}
        {(type === "text" || type === "whatsapp") && (
          <span className="qrcontext-bubble-label">
            <Icon type={type}/> {type === "whatsapp" ? "Conversación" : "Nota"}
          </span>
        )}
        <strong className="qrcontext-primary">{primary}</strong>
        <span className="qrcontext-secondary">{secondary}</span>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, multiline = false, type = "text" }) {
  return (
    <label className="qrform-field">
      <span>{label}</span>
      {multiline
        ? <textarea rows={4} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}/>
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}/>}
    </label>
  );
}

export default function QRTool() {
  const [type, setType] = useState("link");
  const [uploadedImage, setUploadedImage] = useState("");
  const [uploadedImageName, setUploadedImageName] = useState("");
  const [data, setData] = useState({
    url: "https://frankdeveloperxd.github.io",
    imageUrl: "",
    text: "", ssid: "", password: "", security: "WPA",
    hidden: false, phone: "", message: "",
    email: "", subject: "", body: "", name: ""
  });

  const [dark, setDark] = useState("#086b58");
  const [light, setLight] = useState("#ffffff");
  const [gradient, setGradient] = useState(false);
  const [second, setSecond] = useState("#1446c4");
  const [size, setSize] = useState(640);
  const [logo, setLogo] = useState(null);
  const [logoName, setLogoName] = useState("");
  const [logoSize, setLogoSize] = useState(12);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");

  const payload = payloadOf(type, data);
  const change = (name, value) => setData(old => ({ ...old, [name]: value }));

  useEffect(() => {
    let alive = true;

    async function generate() {
      if (!payload) {
        if (alive) { setPreview(""); setError(""); }
        return;
      }

      try {
        const canvas = document.createElement("canvas");
        await QRCode.toCanvas(canvas, payload, {
          width: size, margin: 4, errorCorrectionLevel: "H",
          color: { dark, light }
        });

        const ctx = canvas.getContext("2d");
        const w = canvas.width, h = canvas.height;

        if (gradient) {
          const pixels = ctx.getImageData(0, 0, w, h);
          const a = [1, 3, 5].map(i => parseInt(dark.slice(i, i + 2), 16));
          const b = [1, 3, 5].map(i => parseInt(second.slice(i, i + 2), 16));
          const bg = [1, 3, 5].map(i => parseInt(light.slice(i, i + 2), 16));

          for (let y = 0; y < h; y++) {
            const t = y / Math.max(h - 1, 1);
            for (let x = 0; x < w; x++) {
              const k = (y * w + x) * 4;
              const distance = Math.abs(pixels.data[k] - bg[0]) +
                Math.abs(pixels.data[k+1] - bg[1]) +
                Math.abs(pixels.data[k+2] - bg[2]);
              if (distance < 80) continue;
              for (let c = 0; c < 3; c++)
                pixels.data[k+c] = Math.round(a[c]*(1-t) + b[c]*t);
            }
          }
          ctx.putImageData(pixels, 0, 0);
        }

        if (logo) {
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = logo;
          });

          const outer = w * (logoSize / 100 + .045);
          const x = (w - outer) / 2;
          const y = (h - outer) / 2;
          const radius = outer * .22;

          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.roundRect(x, y, outer, outer, radius);
          ctx.fill();

          ctx.strokeStyle = "rgba(86,108,140,.22)";
          ctx.lineWidth = Math.max(1, w * .002);
          ctx.stroke();

          const safe = outer * .77;
          const ratio = Math.min(
            safe / img.naturalWidth, safe / img.naturalHeight
          );
          const iw = img.naturalWidth * ratio;
          const ih = img.naturalHeight * ratio;

          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y, outer, outer, radius);
          ctx.clip();
          ctx.drawImage(img, w/2-iw/2, h/2-ih/2, iw, ih);
          ctx.restore();
        }

        if (alive) {
          setPreview(canvas.toDataURL("image/png"));
          setError("");
        }
      } catch {
        if (alive) {
          setPreview("");
          setError("No se pudo generar el QR. Revisa los datos ingresados.");
        }
      }
    }

    const timer = setTimeout(generate, 80);
    return () => { alive = false; clearTimeout(timer); };
  }, [payload, dark, light, gradient, second, size, logo, logoSize]);

  function uploadPreviewImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Selecciona PNG, JPG o WebP de hasta 5 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setUploadedImage(String(reader.result));
      setUploadedImageName(file.name);
      setError("");
    };

    reader.readAsDataURL(file);
  }

  function uploadLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024) {
      setError("Usa PNG, JPG o WebP de máximo 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result);
      setLogoName(file.name);
    };
    reader.readAsDataURL(file);
  }

  function download() {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview;
    a.download = `franklabs-${type}-qr.png`;
    a.click();
  }

  return (
    <div className="qrmini qrtypes-page">
      <div className="qrmini-heading">
        <span>FRANKLABS / QR STUDIO</span>
        <h2>Un QR para cada idea.</h2>
        <p>Elige su función, personaliza su diseño y descárgalo.</p>
      </div>

      <div className="qrmini-layout">
        <section className="qrmini-editor">
          <div className="qrmini-block">
            <div className="qrmini-title">
              <span className="qrmini-number">01</span><h3>¿Qué quieres compartir?</h3>
            </div>

            <div className="qrtypes-selector">
              {TYPES.map(item => (
                <button key={item.id} type="button"
                  className={type === item.id ? "active" : ""}
                  aria-pressed={type === item.id}
                  onClick={() => setType(item.id)}>
                  <span style={{ color: item.color }}><Icon type={item.id}/></span>
                  <strong>{item.name}</strong>
                </button>
              ))}
            </div>

            <ContextCard type={type} data={data} uploadedImage={uploadedImage}/>

            <div className="qrtypes-fields">
              {type === "image" && (
                <div className="qrimage-panel">
                  <Field
                    label="URL publica de la imagen"
                    value={data.imageUrl}
                    onChange={v => change("imageUrl", v)}
                    placeholder="https://ejemplo.com/foto.jpg"
                    type="url"
                  />
                  <p className="qrimage-hint">
                    Pega el enlace publico de una imagen.
                    Al escanear el QR, se abrira esa imagen.
                  </p>
                </div>
              )}
              {type === "link" &&
                <Field label="Dirección web" value={data.url} onChange={v => change("url",v)} placeholder="https://ejemplo.com"/>}

              {type === "text" &&
                <Field label="Escribe tu mensaje" value={data.text} onChange={v => change("text",v)} placeholder="Escribe el mensaje..." multiline/>}

              {type === "wifi" && <>
                <Field label="Nombre de la red" value={data.ssid} onChange={v => change("ssid",v)} placeholder="Mi Wi-Fi"/>
                <label className="qrform-field">
                  <span>Seguridad</span>
                  <select value={data.security} onChange={e => change("security",e.target.value)}>
                    <option value="WPA">WPA / WPA2 / WPA3-Personal</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">Red abierta</option>
                  </select>
                </label>
                {data.security !== "nopass" &&
                  <Field label="Contraseña" value={data.password} onChange={v => change("password",v)} placeholder="Contraseña de tu red"/>}
                <label className="qrtypes-checkbox">
                  <input type="checkbox" checked={data.hidden} onChange={e => change("hidden",e.target.checked)}/>
                  Red oculta
                </label>
              </>}

              {type === "whatsapp" && <>
                <Field label="Número con código de país" value={data.phone} onChange={v => change("phone",v)} placeholder="51987654321" type="tel"/>
                <Field label="Mensaje opcional" value={data.message} onChange={v => change("message",v)} placeholder="Hola, quisiera consultar..." multiline/>
              </>}

              {type === "email" && <>
                <Field label="Correo destinatario" value={data.email} onChange={v => change("email",v)} placeholder="contacto@ejemplo.com" type="email"/>
                <Field label="Asunto" value={data.subject} onChange={v => change("subject",v)} placeholder="Consulta"/>
                <Field label="Mensaje" value={data.body} onChange={v => change("body",v)} placeholder="Hola..." multiline/>
              </>}

              {type === "contact" && <>
                <Field label="Nombre completo" value={data.name} onChange={v => change("name",v)} placeholder="Nombre y apellido"/>
                <Field label="Teléfono" value={data.phone} onChange={v => change("phone",v)} placeholder="+51..." type="tel"/>
                <Field label="Correo" value={data.email} onChange={v => change("email",v)} placeholder="nombre@ejemplo.com" type="email"/>
              </>}
            </div>
          </div>

          <div className="qrmini-block">
            <div className="qrmini-title">
              <span className="qrmini-number">02</span><h3>Personaliza los colores</h3>
            </div>
            <div className="qrmini-themes">
              {PALETTES.map(([name, fg, bg]) => (
                <button type="button" key={name} title={name}
                  onClick={() => { setDark(fg); setLight(bg); setGradient(false); }}>
                  <span className="qrmini-theme-circle" style={{ background:bg, borderColor:fg }}>
                    <i style={{background:fg}}/>
                  </span>
                  <small>{name}</small>
                </button>
              ))}
            </div>
            <div className="qrmini-colors">
              <label><span>Color del QR</span>
                <input type="color" value={dark} onChange={e=>setDark(e.target.value)}/>
                <code>{dark.toUpperCase()}</code>
              </label>
              <label><span>Fondo</span>
                <input type="color" value={light} onChange={e=>setLight(e.target.value)}/>
                <code>{light.toUpperCase()}</code>
              </label>
            </div>
            <label className="qrmini-check">
              <input type="checkbox" checked={gradient} onChange={e=>setGradient(e.target.checked)}/>
              Usar degradado
            </label>
            {gradient && <div className="qrmini-colors">
              <label><span>Segundo color</span>
                <input type="color" value={second} onChange={e=>setSecond(e.target.value)}/>
                <code>{second.toUpperCase()}</code>
              </label>
            </div>}
          </div>

          <div className="qrmini-block">
            <div className="qrmini-title">
              <span className="qrmini-number">03</span><h3>Logo central (opcional)</h3>
            </div>
            <label className="qrmini-upload">
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadLogo}/>
              {logo ? <img src={logo} alt="Logo seleccionado"/> : <span className="qrmini-upload-icon">+</span>}
              <strong>{logo ? "Cambiar logo" : "Añadir imagen"}</strong>
              <small>PNG, JPG o WebP · Máximo 5 MB</small>
            </label>
            {logo && <>
              <div className="qrmini-image-row">
                <span>{logoName}</span>
                <button type="button" onClick={()=>{setLogo(null);setLogoName("");}}>Quitar</button>
              </div>
              <div className="qrmini-range">
                <label>Tamaño del logo <strong>{logoSize}%</strong></label>
                <input type="range" min="6" max="16" value={logoSize}
                  onChange={e=>setLogoSize(Number(e.target.value))}/>
              </div>
            </>}
          </div>

          <div className="qrmini-block">
            <div className="qrmini-title">
              <span className="qrmini-number">04</span><h3>Resolución</h3>
            </div>
            <div className="qrmini-sizes">
              {[320,640,1000].map(n=>
                <button key={n} type="button" className={size===n?"active":""}
                  onClick={()=>setSize(n)}>{n} px</button>
              )}
            </div>
          </div>
        </section>

        <section className="qrmini-preview">
          <div className="qrmini-preview-heading">
            <h3>Tu código QR</h3>
            <p>{TYPES.find(item=>item.id===type)?.help}</p>
          </div>
          <div className="qrmini-preview-stage">
            {preview ? <img src={preview} alt={`Código QR de ${type}`}/> :
              <span>Completa los datos para generar tu QR.</span>}
          </div>
          {error && <p className="qrmini-error">{error}</p>}
          <button type="button" className="qrmini-download"
            disabled={!preview} onClick={download}>
            Descargar PNG
          </button>
          <p className="qrmini-footnote">
            Se genera en tu navegador, sin subir datos a un servidor.
            Comprueba la lectura con tu teléfono antes de imprimirlo.
          </p>
        </section>
      </div>
    </div>
  );
}
