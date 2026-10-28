import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import './bloc-libre.css';

const endpoint = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = endpoint && key ? createClient(endpoint, key, {auth:{persistSession:false}}) : null;
const storageKey = 'franklabs-bloc-link';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const request = async (action, values={}) => {
  if (!supabase) throw new Error('Falta configurar Supabase en .env.local');
  const {data,error}=await supabase.functions.invoke('bloc-libre',{body:{action,...values}});
  if(error) {
    let message=error.message;
    try { const body=await error.context?.json(); message=body?.error||message; } catch { /* no body */ }
    throw new Error(message);
  }
  if(data?.error) throw new Error(data.error);
  return data;
};
const roomFromUrl = () => {
  const id=new URLSearchParams(window.location.search).get('bloc');
  return id && uuid.test(id) ? id : null;
};
export default function BlocLibreTool() {
  const [id,setId]=useState(roomFromUrl);
  const [title,setTitle]=useState('Mi bloc libre');
  const [body,setBody]=useState('');
  const [version,setVersion]=useState(0);
  const [files,setFiles]=useState([]);
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const [dirty,setDirty]=useState(false);
  const [loading,setLoading]=useState(Boolean(roomFromUrl()));
  const titleRef=useRef(title); const bodyRef=useRef(body); const dirtyRef=useRef(false);const versionRef=useRef(0);
  const refresh=useCallback(async(silent=false)=>{
    if(!id) return;
    try {
      const state=await request('read',{id});
      setFiles(state.files||[]);
      if(!dirtyRef.current) {setTitle(state.pad.title);setBody(state.pad.body);titleRef.current=state.pad.title;bodyRef.current=state.pad.body;setVersion(state.pad.version);versionRef.current=state.pad.version;}
      if(!silent) setStatus('Sincronizado');
    } catch(e) { setStatus(e.message); }
    finally {setLoading(false);}
  },[id]);
  useEffect(()=>{
    if(!id||!supabase) return;
    refresh();
    const channel=supabase.channel(`pad:${id}`,{config:{private:false}}).on('broadcast',{event:'changed'},()=>refresh(true)).subscribe();
    const fallback=window.setInterval(()=>refresh(true),12000);
    return ()=>{window.clearInterval(fallback);supabase.removeChannel(channel);};
  },[id,refresh]);
  useEffect(()=>{
    const onPop=()=>{setId(roomFromUrl());setDirty(false);dirtyRef.current=false;};
    window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop);
  },[]);
  const markDirty=(t,b)=>{titleRef.current=t;bodyRef.current=b;dirtyRef.current=true;setDirty(true);setStatus('Sin guardar');};
  const save=useCallback(async()=>{
    if(!id||!dirtyRef.current)return;
    try {
      const data=await request('save',{id,title:titleRef.current,text:bodyRef.current,version:versionRef.current});
      versionRef.current=data.version;setVersion(data.version);dirtyRef.current=false;setDirty(false);setStatus('Guardado y compartido');
    } catch(e) {setStatus(e.message);}
  },[id]);
  useEffect(()=>{
    if(!dirty||!id) return;
    const timer=window.setTimeout(save,1400);
    return()=>clearTimeout(timer);
  },[dirty,title,body,id,save]);
  const create=async()=>{setBusy(true);setStatus('Creando bloc…');try{const result=await request('create');const next=result.id;const u=new URL(window.location.href);u.pathname='/labs/bloc';u.searchParams.set('bloc',next);history.pushState({},'',u);setId(next);setDirty(false);dirtyRef.current=false;setStatus('Bloc creado. Comparte el enlace.');}catch(e){setStatus(e.message);}finally{setBusy(false);}};
  const share=async()=>{try{await navigator.clipboard.writeText(location.href);setStatus('Enlace copiado');}catch{setStatus('Copia la dirección desde la barra del navegador.');}};
  const upload=async(file)=>{
    if(!file || !id || !supabase)return;
    if(file.size>10_000_000){setStatus('Máximo 10 MB por archivo');return;}
    setBusy(true);
    try {
      const ticket=await request('upload-ticket',{id,filename:file.name,mime:file.type||'application/octet-stream',size:file.size});
      const result=await supabase.storage.from('franklabs-pads').uploadToSignedUrl(ticket.path,ticket.token,file,{contentType:ticket.mime});
      if(result.error)throw result.error;
      await request('upload-complete',{id,fileId:ticket.fileId,filename:ticket.filename,mime:ticket.mime});
      await refresh(true);setStatus('Archivo compartido');
    } catch(e){setStatus(`Error al subir: ${e.message}`);}finally{setBusy(false);}
  };
  const download=async(file)=>{try{const result=await request('download',{id,fileId:file.id});const a=document.createElement('a');a.href=result.url;a.target='_blank';a.rel='noopener noreferrer';a.click();}catch(e){setStatus(e.message);}};
  const remove=async(file)=>{if(!confirm(`¿Eliminar ${file.filename} para todas las personas con acceso?`))return;setBusy(true);try{await request('delete-file',{id,fileId:file.id});await refresh(true);}catch(e){setStatus(e.message);}finally{setBusy(false);}};
  const erase=async()=>{if(!confirm('¿Eliminar definitivamente este bloc y todos sus archivos para todas las personas?'))return;setBusy(true);try{await request('delete-pad',{id});const u=new URL(location.href);u.searchParams.delete('bloc');history.pushState({},'',u);setId(null);setTitle('Mi bloc libre');setBody('');setFiles([]);setStatus('Bloc eliminado.');}catch(e){setStatus(e.message);}finally{setBusy(false);}};
  return <div className="bloc-root">
    {!supabase&&<p className="bloc-warning">El Bloc libre necesita la configuración de Supabase. Revisa el archivo GUIA_INSTALACION.md incluido en el paquete.</p>}
    {!id?<section className="bloc-welcome"><h2>Un espacio para compartir, sin registro.</h2><p>Escribe, adjunta archivos y abre el mismo enlace desde cualquier dispositivo. Quien tenga el enlace podrá modificar o eliminar todo el contenido.</p><button className="bloc-primary" disabled={!supabase||busy} onClick={create}>Crear nuevo bloc</button><p className="bloc-muted">No guardes contraseñas, datos bancarios ni archivos confidenciales. No es un almacenamiento privado.</p></section>:<>
      <div className="bloc-toolbar"><div><strong>Bloc compartido</strong><p className="bloc-muted">Cualquier persona con el enlace puede editar y borrar.</p></div><div className="bloc-toolbar-actions"><button onClick={share}>Copiar enlace</button><button onClick={()=>{const u=new URL(location.href);u.searchParams.delete('bloc');history.pushState({},'',u);setId(null);setStatus('');}}>Nuevo bloc</button><button className="bloc-danger" disabled={busy} onClick={erase}>Eliminar bloc</button></div></div>
      <div className="bloc-grid"><section className="bloc-editor"><label>Título<input maxLength={120} value={title} onChange={e=>{setTitle(e.target.value);markDirty(e.target.value,body);}} /></label><label>Notas compartidas<textarea rows={15} maxLength={30000} value={body} onChange={e=>{setBody(e.target.value);markDirty(title,e.target.value);}} placeholder="Escribe aquí…"/></label><div className="bloc-editor-foot"><span>{dirty?'Cambios pendientes':'Guardado'} · versión {version}</span><button className="bloc-primary" onClick={save} disabled={!dirty}>Guardar ahora</button></div></section>
      <section className="bloc-files"><h3>Archivos compartidos</h3><label className="bloc-upload">Añadir archivo (máximo 10 MB)<input type="file" disabled={busy} onChange={e=>{upload(e.target.files?.[0]);e.target.value='';}}/></label><p className="bloc-muted">Hasta 50 MB por bloc. Descarga mediante enlaces temporales. No hay caducidad automática.</p>{loading?<p>Cargando…</p>:files.length===0?<p className="bloc-empty">Aún no hay archivos.</p>:<ul>{files.map(file=><li key={file.id}><span><strong>{file.filename}</strong><small>{Math.round(file.byte_size/1024)} KB</small></span><div><button onClick={()=>download(file)}>Abrir</button><button className="bloc-danger" disabled={busy} onClick={()=>remove(file)}>Borrar</button></div></li>)}</ul>}</section></div>
    </>}
    {status&&<p className="bloc-status" role="status">{status}</p>}
    <p className="bloc-muted">Sincronización por eventos y comprobación periódica. Si dos personas editan exactamente al mismo tiempo, se detectará un conflicto al guardar; revisa los cambios antes de reintentar.</p>
  </div>;
}
