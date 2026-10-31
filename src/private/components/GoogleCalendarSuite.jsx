import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../client';
import './GoogleCalendarSuite.css';

const monthStart = d => new Date(d.getFullYear(),d.getMonth(),1);
const dateInput = d => { const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`; };
const datetimeInput = d => `${dateInput(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
const defaultDraft = day => ({title:'',description:'',start:datetimeInput(new Date(day.getFullYear(),day.getMonth(),day.getDate(),9)),end:datetimeInput(new Date(day.getFullYear(),day.getMonth(),day.getDate(),10)),all_day:false,reminder_minutes:10});
async function invoke(body) {
  const {data,error}=await supabase.functions.invoke('google-calendar-api',{body});
  if(error){let detail='';try{const response=error.context;if(response && typeof response.json==='function'){const parsed=await response.json();detail=parsed?.error??'';}}catch{}throw new Error(detail || error.message || 'No fue posible contactar a Google Calendar');}
  if(data?.error)throw new Error(data.error);return data;
}
export default function GoogleCalendarSuite({user}) {
  const [month,setMonth]=useState(()=>monthStart(new Date()));
  const [selected,setSelected]=useState(()=>dateInput(new Date()));
  const [calendars,setCalendars]=useState([]);
  const [selectedIds,setSelectedIds]=useState(null);
  const [events,setEvents]=useState([]);
  const [connected,setConnected]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [editing,setEditing]=useState(null);
  const [calendarId,setCalendarId]=useState('');
  const [draft,setDraft]=useState(defaultDraft(new Date()));
  const [saving,setSaving]=useState(false);
  const [email,setEmail]=useState('');
  const first=useMemo(()=>new Date(month.getFullYear(),month.getMonth(),1),[month]);
  const last=useMemo(()=>new Date(month.getFullYear(),month.getMonth()+1,1),[month]);
  const load=useCallback(async()=>{
    setBusy(true);setError('');
    try{
      const data=await invoke({action:'list',from:first.toISOString(),to:last.toISOString(),...(selectedIds?{calendar_ids:selectedIds}:{})});
      setConnected(!!data.connected);setCalendars(data.calendars??[]);setEvents(data.events??[]);setEmail(data.google_email??'');
      if(!selectedIds && data.connected)setSelectedIds((data.calendars??[]).filter(c=>c.selected).map(c=>c.id));
    }catch(e){setError(e.message);}finally{setBusy(false);}
  },[first,last,selectedIds,user.id]);
  useEffect(()=>{setSelectedIds(null);setCalendars([]);setEvents([]);setConnected(false);setEmail('');},[user.id]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    if(!params.has('google'))return;
    const status=params.get('google');const url=new URL(location.href);url.searchParams.delete('google');url.searchParams.set('vista','calendar');
    history.replaceState(history.state,'',url.pathname+url.search+url.hash);
    if(status==='cancelled')setError('Se canceló la autorización de Google.');
  },[]);
  async function connect(){setBusy(true);setError('');try{
    const returnTo=location.hostname==='localhost'?'http://localhost:5173/mi-espacio':'https://frankdeveloperxd.github.io/mi-espacio';
    const {data,error}=await supabase.functions.invoke('google-calendar-connect',{body:{returnTo}});
    if(error)throw new Error(error.message);if(!data?.authorization_url)throw new Error('No se pudo iniciar OAuth');
    location.assign(data.authorization_url);
  }catch(e){setError(e.message);setBusy(false);}}
  async function disconnectGoogle() {
    if (!connected || busy) return;
    if (!window.confirm('Â¿Desconectar Google Calendar? No se borrarÃ¡n los eventos de Google ni los del Workspace.')) return;
    setBusy(true);
    setError('');
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-disconnect', { body: {} });
      if (error) {
        let detail = error.message;
        try { if (error.context?.json) detail = (await error.context.json())?.error || detail; } catch {}
        throw new Error(detail);
      }
      if (!data?.disconnected) throw new Error(data?.error || 'No se confirmÃ³ la desconexiÃ³n.');
      setConnected(false);
      setCalendars([]);
      setSelectedIds(null);
      setEvents([]);
      setEmail('');
    } catch (e) {
      setError(e.message || 'No fue posible desconectar Google.');
    } finally {
      setBusy(false);
    }
  }
  function toggle(id){setSelectedIds(old=>{const active=old??calendars.map(c=>c.id);return active.includes(id)?active.filter(x=>x!==id):[...active,id];});}
  const days=useMemo(()=>{const pad=(first.getDay()+6)%7;return [...Array.from({length:pad},()=>null),...Array.from({length:last.getDate()?new Date(first.getFullYear(),first.getMonth()+1,0).getDate():0},(_,i)=>i+1)];},[first,last]);
  const byDay=useMemo(()=>{const result={};for(const e of events){if(!e.start||!e.end)continue;const start=new Date(e.start.length===10?`${e.start}T00:00:00`:e.start);const end=new Date(e.end.length===10?`${e.end}T00:00:00`:e.end);if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime()))continue;for(let d=new Date(start.getFullYear(),start.getMonth(),start.getDate());d<end&&d<last;d.setDate(d.getDate()+1)){const key=dateInput(d);(result[key]??=[]).push(e);} }return result;},[events,last]);
  function openNew(date=selected){const d=new Date(`${date}T12:00:00`);setEditing({type:'create'});setDraft(defaultDraft(d));setCalendarId(calendars.find(c=>c.writable&&selectedIds?.includes(c.id))?.id??calendars.find(c=>c.writable)?.id??'');}
  function openEdit(e){setEditing({type:'update',id:e.id});setCalendarId(e.calendar_id);const start=e.start.length===10?`${e.start}T09:00:00`:datetimeInput(new Date(e.start));const end=e.end.length===10?`${e.end}T10:00:00`:datetimeInput(new Date(e.end));setDraft({title:e.title,description:e.description,start,end,all_day:e.all_day,reminder_minutes:e.reminder_minutes});}
  async function save(){setSaving(true);setError('');try{
    let start=draft.start,end=draft.end;
    if(draft.all_day){start=start.slice(0,10);const endDate=new Date(`${end.slice(0,10)}T12:00:00`);endDate.setDate(endDate.getDate()+1);end=dateInput(endDate);}else{start=new Date(start).toISOString();end=new Date(end).toISOString();}
    await invoke({action:editing.type,calendar_id:calendarId,...(editing.id?{event_id:editing.id}:{}),event:{title:draft.title,description:draft.description,start,end,all_day:draft.all_day,reminder_minutes:draft.reminder_minutes}});
    setEditing(null);await load();
  }catch(e){setError(e.message);}finally{setSaving(false);}}
  async function remove(){if(!editing?.id||!window.confirm('¿Eliminar este evento de Google Calendar?'))return;setSaving(true);try{await invoke({action:'delete',calendar_id:calendarId,event_id:editing.id});setEditing(null);await load();}catch(e){setError(e.message);}finally{setSaving(false);}}
  return <section className="gcs" aria-label="Google Calendar">
    <header className="gcs-top"><div className="gcs-brand"><span className="gcs-g">G</span><div><h2>Google Calendar</h2><p>{connected?`Cuenta conectada${email?`: ${email}`:''}`:'Conecta tu cuenta de Google para consultar tus calendarios'}</p></div></div><div className="gcs-actions"><button type="button" onClick={load} disabled={busy}>Actualizar</button><button type="button" className="gcs-primary" onClick={connect} disabled={busy}>{connected?'Reconectar Google':'Conectar Google'}</button><button type="button" onClick={disconnectGoogle} disabled={busy} aria-label="Desconectar Google Calendar">Desconectar Google</button></div></header>
    {error&&<p className="gcs-error" role="alert">{error}</p>}
    {connected&&<><div className="gcs-controls"><div><strong>Calendarios visibles</strong><div className="gcs-checks">{calendars.map(c=><label key={c.id}><input type="checkbox" checked={(selectedIds??[]).includes(c.id)} onChange={()=>toggle(c.id)}/><span className="gcs-dot" style={{background:c.color}}/>{c.name}</label>)}</div></div><button type="button" className="gcs-primary" onClick={()=>openNew()} disabled={!calendars.some(c=>c.writable)}>+ Evento en Google</button></div>
    <div className="gcs-calendar-header"><button type="button" onClick={()=>setMonth(new Date(first.getFullYear(),first.getMonth()-1,1))} aria-label="Mes anterior">‹</button><strong>{first.toLocaleDateString('es-PE',{month:'long',year:'numeric'})}</strong><button type="button" onClick={()=>setMonth(new Date(first.getFullYear(),first.getMonth()+1,1))} aria-label="Mes siguiente">›</button></div>
    <div className="gcs-grid">{['L','M','M','J','V','S','D'].map((label,i)=><span className="gcs-weekday" key={i}>{label}</span>)}{days.map((day,i)=>day?<button key={`day-${day}`} type="button" className={`gcs-day ${selected===dateInput(new Date(first.getFullYear(),first.getMonth(),day))?'gcs-selected':''}`} onClick={()=>setSelected(dateInput(new Date(first.getFullYear(),first.getMonth(),day)))}><span>{day}</span>{(byDay[dateInput(new Date(first.getFullYear(),first.getMonth(),day))]??[]).slice(0,3).map((e,j)=><small key={`${e.calendar_id}-${e.id}-${j}`} style={{borderLeftColor:e.color}}>{e.title}</small>)}</button>:<span key={`blank-${i}`} className="gcs-day-blank"/> )}</div>
    <div className="gcs-agenda"><div className="gcs-agenda-head"><h3>Eventos · {new Date(`${selected}T12:00:00`).toLocaleDateString('es-PE',{day:'numeric',month:'long'})}</h3><button type="button" onClick={()=>openNew(selected)}>+ Crear</button></div>{(byDay[selected]??[]).length===0?<p>Sin eventos de Google para esta fecha.</p>:(byDay[selected]??[]).map((e,j)=><div className="gcs-event" key={`${e.calendar_id}-${e.id}-${j}`}><span className="gcs-dot" style={{background:e.color}}/><div><strong>{e.title}</strong><small>{e.calendar_name}</small></div>{e.writable&&<button type="button" onClick={()=>openEdit(e)}>Editar</button>}{e.link&&<a target="_blank" rel="noreferrer" href={e.link}>Abrir</a>}</div>)}</div></>}
    {editing&&<div className="gcs-backdrop" role="presentation"><form className="gcs-dialog" onSubmit={e=>{e.preventDefault();save();}}><h3>{editing.type==='create'?'Nuevo evento en Google':'Editar evento de Google'}</h3><label>Título<input required maxLength={200} value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))}/></label><label>Calendario<select value={calendarId} onChange={e=>setCalendarId(e.target.value)} disabled={editing.type==='update'}>{calendars.filter(c=>c.writable).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Inicio<input type="datetime-local" required value={draft.start} onChange={e=>setDraft(d=>({...d,start:e.target.value}))}/></label><label>Fin<input type="datetime-local" required value={draft.end} onChange={e=>setDraft(d=>({...d,end:e.target.value}))}/></label><label><input type="checkbox" checked={draft.all_day} onChange={e=>setDraft(d=>({...d,all_day:e.target.checked}))}/> Todo el día</label><label>Recordatorio<select value={draft.reminder_minutes??''} onChange={e=>setDraft(d=>({...d,reminder_minutes:e.target.value===''?null:Number(e.target.value)}))}><option value="">Predeterminado</option>{[0,5,10,15,30,60,1440].map(n=><option key={n} value={n}>{n} minutos</option>)}</select></label><label>Descripción<textarea value={draft.description} onChange={e=>setDraft(d=>({...d,description:e.target.value}))}/></label><div className="gcs-dialog-actions">{editing.id&&<button type="button" className="gcs-danger" onClick={remove} disabled={saving}>Eliminar</button>}<button type="button" onClick={()=>setEditing(null)}>Cancelar</button><button type="submit" className="gcs-primary" disabled={saving||!calendarId}>Guardar en Google</button></div></form></div>}
  </section>;
}
