import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import './qr.css';

const escapeWifi = value => String(value).replace(/([\\;,:"])/g, '\\$1');
const escapeVCard = value => String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([;,])/g, '\\$1');

function encode(form, type) {
  if (type === 'url') return form.url.trim();
  if (type === 'text') return form.text;
  if (type === 'wifi') return `WIFI:T:${form.security};S:${escapeWifi(form.ssid)};P:${form.security === 'nopass' ? '' : escapeWifi(form.password)};;`;
  if (type === 'email') return `mailto:${form.email}?subject=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(form.message)}`;
  if (type === 'whatsapp') return `https://wa.me/${form.phone.replace(/\D/g, '')}?text=${encodeURIComponent(form.message)}`;
  if (type === 'contact') return `BEGIN:VCARD\nVERSION:3.0\nFN:${escapeVCard(form.name)}\nTEL:${form.phone.replace(/[^+\d]/g, '')}\nEMAIL:${escapeVCard(form.email)}\nEND:VCARD`;
  return '';
}
function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function QRTool() {
  const [type, setType] = useState('url');
  const [form, setForm] = useState({ url:'https://frankdeveloperxd.github.io',text:'Hola',ssid:'',password:'',security:'WPA',email:'',subject:'',message:'',phone:'',name:'' });
  const [dark, setDark] = useState('#1658ff');
  const [light, setLight] = useState('#ffffff');
  const [size, setSize] = useState(320);
  const [logo, setLogo] = useState(null);
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState('');
  const canvasRef = useRef(null);
  const payload = encode(form, type);
  const update = (key, value) => setForm(old => ({ ...old, [key]: value }));
  useEffect(() => {
    let cancelled = false;
    const generate = async () => {
      if (!payload.trim()) { setDataUrl(''); setError('Introduce contenido para generar el código.'); return; }
      if (type === 'whatsapp' && !form.phone.replace(/\D/g, '')) { setError('Introduce un teléfono válido.'); setDataUrl(''); return; }
      try {
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, payload, { width:size, margin:3, errorCorrectionLevel:'H', color:{ dark, light } });
        if (logo) {
          const img = new Image(); img.src = logo;
          await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
          const ctx = canvas.getContext('2d');
          const w = canvas.width * .15, x=(canvas.width-w)/2;
          ctx.fillStyle = light; ctx.fillRect(x-6,x-6,w+12,w+12);
          ctx.drawImage(img,x,x,w,w);
        }
        if (!cancelled) { setDataUrl(canvas.toDataURL('image/png')); setError(''); canvasRef.current = canvas; }
      } catch { if (!cancelled) { setError('No se pudo generar el QR. Reduce el texto o cambia los ajustes.'); setDataUrl(''); } }
    };
    generate(); return () => {cancelled=true;};
  }, [payload, size, dark, light, logo, type, form.phone]);
  const fields = {
    url:[['url','Enlace','url']],text:[['text','Texto','textarea']],wifi:[['ssid','Nombre de la red','text'],['password','Contraseña','text']],
    email:[['email','Correo electrónico','email'],['subject','Asunto','text'],['message','Mensaje','textarea']],
    whatsapp:[['phone','Número con código de país','tel'],['message','Mensaje','textarea']],
    contact:[['name','Nombre completo','text'],['phone','Teléfono','tel'],['email','Correo','email']]
  };
  const exportSVG = async () => {
    if (!payload.trim()) return;
    try {
      // Sin logo se exportan vectores reales. Con logo, SVG contiene PNG incrustado.
      const xml = logo
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><image width="${size}" height="${size}" href="${dataUrl}"/></svg>`
        : await QRCode.toString(payload,{type:'svg',width:size,margin:3,errorCorrectionLevel:'H',color:{dark,light}});
      saveBlob(new Blob([xml],{type:'image/svg+xml'}),'franklabs-qr.svg');
    } catch { setError('No se pudo exportar el SVG.'); }
  };
  return <div className="qr-studio">
    <section className="qr-controls">
      <div className="qr-tabs" role="group" aria-label="Tipo de código QR">{[['url','Enlace'],['text','Texto'],['wifi','Wi-Fi'],['email','Correo'],['whatsapp','WhatsApp'],['contact','Contacto']].map(([id,name])=><button type="button" className={type===id?'active':''} key={id} onClick={()=>setType(id)}>{name}</button>)}</div>
      <div className="qr-fields">{fields[type].map(([key,label,inputType])=><label key={key}>{label}{inputType==='textarea'?<textarea rows={3} value={form[key]} onChange={e=>update(key,e.target.value)}/>:<input type={inputType} value={form[key]} onChange={e=>update(key,e.target.value)}/>}</label>)}
        {type==='wifi'&&<label>Seguridad<select value={form.security} onChange={e=>update('security',e.target.value)}><option value="WPA">WPA / WPA2 / WPA3</option><option value="WEP">WEP</option><option value="nopass">Red abierta</option></select></label>}</div>
      <h3>Personalización</h3><div className="qr-colors"><label>Color QR<input aria-label="Color del QR" type="color" value={dark} onChange={e=>setDark(e.target.value)}/></label><label>Fondo<input aria-label="Color de fondo" type="color" value={light} onChange={e=>setLight(e.target.value)}/></label><label>Tamaño<select value={size} onChange={e=>setSize(Number(e.target.value))}><option value="256">256 px</option><option value="320">320 px</option><option value="512">512 px</option><option value="1024">1024 px</option></select></label></div>
      <label className="qr-logo-input">Logo opcional (PNG o JPG, máximo 2 MB)<input type="file" accept="image/png,image/jpeg" onChange={e=>{const file=e.target.files?.[0];if(!file){setLogo(null);return;}if(file.size>2_000_000){setError('El logo supera 2 MB.');return;}const reader=new FileReader();reader.onload=()=>setLogo(String(reader.result));reader.readAsDataURL(file);}}/></label>
      {logo&&<button className="qr-text-button" onClick={()=>setLogo(null)}>Quitar logo</button>}
    </section>
    <section className="qr-preview"><h3>Vista previa</h3><div className="qr-canvas">{dataUrl?<img src={dataUrl} alt="Código QR generado"/>:<p>Escribe contenido para generar tu QR.</p>}</div>{error&&<p className="qr-error" role="alert">{error}</p>}
      <div className="qr-actions"><button disabled={!dataUrl} onClick={()=>fetch(dataUrl).then(r=>r.blob()).then(b=>saveBlob(b,'franklabs-qr.png'))}>Descargar PNG</button><button disabled={!dataUrl} onClick={exportSVG}>Descargar SVG</button></div>
      <p className="qr-note">Se genera en tu navegador. No se guarda en servidores. Prueba el QR con tu teléfono antes de compartirlo, especialmente si añades un logo.</p>
    </section>
  </div>;
}
