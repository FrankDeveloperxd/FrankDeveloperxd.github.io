import { notifyWorkspace } from "./WorkspaceToasts.jsx";
import React, { useEffect, useRef, useState } from 'react';
import { Target, BookOpen, Dumbbell, Droplets, Moon, Heart, Check, Plus, ChevronLeft, ChevronRight, Pencil, Archive, RotateCcw, Trash2, RefreshCw, X } from 'lucide-react';
import { supabase } from '../client';
import { habitsKey, readHabitsCache, writeHabitsCache, clearHabitsCache, loadHabits, watchHabitWrites, pendingHabitWrites, queueHabitMark, overlayHabitMarks } from './WorkspaceHabitsCache.js';
import { DAYS, keyOf, dateOf, shift, period, scheduleFor, planned, markKey, metrics } from './habitDates.js';
const ICONS={ target:Target, book:BookOpen, exercise:Dumbbell, water:Droplets, sleep:Moon, heart:Heart };
const COLORS=['#2867e9','#119A84','#8758D3','#ca8a04','#E54860','#475569'];
const pretty=d=>d.toLocaleDateString('es-PE',{ day:'numeric',month:'short' });

export default function WorkspaceHabits({ user }) {
  const [mode,setMode]=useState('week');
  const [anchor,setAnchor]=useState(()=>keyOf(new Date()));
  const [today,setToday]=useState(()=>keyOf(new Date()));
  const range=period(dateOf(anchor),mode);
  const cacheKey=habitsKey(user.id,range.from,range.to);
  const [snapshot,setSnapshot]=useState(()=>({ key:cacheKey, data:readHabitsCache(cacheKey) }));
  const base=snapshot.key===cacheKey ? snapshot.data : readHabitsCache(cacheKey);
  const data=overlayHabitMarks(user.id,base);
  const [syncing,setSyncing]=useState(false);
  const [saving,setBusy]=useState(false);
  const [,redraw]=useState(0);
  const pending=pendingHabitWrites(user.id);
  const busy=saving || pending>0;
  const [error,setError]=useState('');

  const [filter,setFilter]=useState('active');
  const [search,setSearch]=useState('');
  const [form,setForm]=useState(null);
  const [leaving,setLeaving]=useState(null);
  const [deleteTarget,setDeleteTarget]=useState(null);
  /* HABITS FLOATING RESULT V2 */
  const [flash,setFlash]=useState(null);

  /* HABITS ACTION ANIMATIONS V1 */
  useEffect(()=>{
    if(!flash) return;
    const timer=setTimeout(()=>{
      
      setFlash(null);
    },1600);
    return ()=>clearTimeout(timer);
  },[flash]);
  const serial=useRef(0), mounted=useRef(false), lock=useRef(false);
  const activeKey=useRef(cacheKey); activeKey.current=cacheKey;
  const newButton=useRef(null), dialog=useRef(null);

  useEffect(()=>watchHabitWrites(user.id, message=>{
    redraw(n=>n+1);
    if(message) setError(message);
  }),[user.id]);

  useEffect(()=>{
    mounted.current=true;
    const timer=setInterval(()=>setToday(keyOf(new Date())),30000);
    return ()=>{ mounted.current=false; serial.current++; clearInterval(timer); };
  },[]);

  async function refresh(force=false) {
    if(lock.current || pendingHabitWrites(user.id)) return;
    const id=++serial.current, key=cacheKey;
    setSyncing(true);
    try {
      const next=await loadHabits(user.id,range.from,range.to,force);
      if(mounted.current && id===serial.current && activeKey.current===key) {
        setSnapshot({key,data:next}); setError('');
      }
    } catch(err) {
      if(mounted.current && id===serial.current && activeKey.current===key)
        setError(err.message || 'No se pudo actualizar. Conservamos los últimos datos disponibles.');
    } finally {
      if(mounted.current && id===serial.current && activeKey.current===key) setSyncing(false);
    }
  }
  useEffect(()=>{
    setSnapshot({key:cacheKey,data:readHabitsCache(cacheKey)});
    setError('');  void refresh();
    const focus=()=>{ if(document.visibilityState==='visible') void refresh(); };
    window.addEventListener('focus',focus);
    document.addEventListener('visibilitychange',focus);
    return ()=>{ serial.current++; window.removeEventListener('focus',focus); document.removeEventListener('visibilitychange',focus); };
  },[cacheKey]);

  function closeForm() { if(!lock.current) { setForm(null); requestAnimationFrame(()=>newButton.current?.focus()); } }
  useEffect(()=>{
    if(!form) return;
    const before=document.body.style.overflow;
    document.body.style.overflow='hidden';
    dialog.current?.querySelector('input')?.focus();
    return ()=>{ document.body.style.overflow=before; };
  },[!!form]);

  async function mutate(operation, apply, optimistic, message='Guardado', exitId=null) {
    if(lock.current || !data) return false;
    lock.current=true; serial.current++;
    const key=cacheKey, before=data;
    setBusy(true); setSyncing(false); setError(''); 
    if(optimistic) setSnapshot({key,data:optimistic(before)});
    try {
      const result=await operation();
      if(result.error) throw result.error;

      if(exitId && mounted.current && activeKey.current===key) {
        setLeaving(exitId);
        await new Promise(resolve=>setTimeout(resolve,180));
      }
      // Cache failures must never turn a successful database write into a failed save.
      const next=apply(before,result.data);
      clearHabitsCache(user.id);
      if(mounted.current && activeKey.current===key) {
        setSnapshot({key,data:writeHabitsCache(key,next)}); notifyWorkspace("success",message);
      }
      return true;
    } catch(err) {
      if(mounted.current && activeKey.current===key) {
        setSnapshot({key,data:before}); setError(err.message || 'No se pudo guardar. Inténtalo de nuevo.');
      }
      return false;
    } finally { lock.current=false; if(mounted.current) {setBusy(false);setLeaving(null);} }
  }
  function toggle(habit,date) {
    const day=keyOf(date);
    if(saving || habit.archived || day>today || !planned(habit,date)) return;
    const exists=data.entries.some(e=>e.habit_id===habit.id && e.day===day);
    setError(''); 
    queueHabitMark(user.id,habit.id,day,!exists,exists);
  }
  function openCreate() {
    setError(''); setForm({id:crypto.randomUUID(),isNew:true,title:'',icon:'target',color:COLORS[0],days:[0,1,2,3,4,5,6]});
  }
  function edit(habit) {
    setError(''); setForm({...habit,isNew:false,days:scheduleFor(habit,today)});
  }
  async function save(event) {
    event.preventDefault();
    if(!form.title.trim() || !form.days.length || busy) return;
    const duplicate=data.habits.find(h=>!h.archived && h.id!==form.id && h.title.trim().toLocaleLowerCase()===form.title.trim().toLocaleLowerCase());
    if(duplicate) { setError('Ya tienes un hábito activo con ese nombre. Cámbialo para distinguirlos.'); return; }
    const habit=data.habits.find(h=>h.id===form.id);
    const previous=habit?.schedule?.length ? habit.schedule : habit ? [{from:habit.start_date,days:habit.weekdays}] : [];
    const sameDays=habit && [...scheduleFor(habit,today)].sort().join() === [...form.days].sort().join();
    const values={title:form.title.trim(),icon:form.icon,color:form.color};
    if(!habit || !sameDays) values.schedule=[...previous.filter(s=>s.from<today),{from:today,days:form.days}];
    const ok=await mutate(()=>form.isNew
      ? supabase.from('workspace_habits').upsert({...values,id:form.id,owner_id:user.id,weekdays:form.days,start_date:today},{onConflict:'id'}).select().single()
      : supabase.from('workspace_habits').update(values).eq('owner_id',user.id).eq('id',form.id).select().single(),
      (current,row)=>({...current,habits:current.habits.some(h=>h.id===row.id) ? current.habits.map(h=>h.id===row.id?row:h) : [...current.habits,row]}),
      null,form.isNew?'Hábito creado':'Hábito actualizado');
    if(ok && mounted.current) { setFlash(form.id); setForm(null); requestAnimationFrame(()=>newButton.current?.focus()); }
  }
  async function archive(habit) {
    await mutate(()=>supabase.from('workspace_habits').update({archived:!habit.archived}).eq('owner_id',user.id).eq('id',habit.id).select().single(),
      (current,row)=>({...current,habits:current.habits.map(h=>h.id===row.id?row:h)}),null,habit.archived?'Hábito restaurado':'Hábito archivado',habit.id);
  }
  function remove(habit) {
    setError('');
    setDeleteTarget(habit);
  }

  async function removeConfirmed(habit) {

    return await mutate(()=>supabase.from('workspace_habits').delete().eq('owner_id',user.id).eq('id',habit.id).select('id').single(),
      current=>({habits:current.habits.filter(h=>h.id!==habit.id),entries:current.entries.filter(e=>e.habit_id!==habit.id)}),null,'Hábito eliminado',habit.id);
  }
  function navigate(direction) {
    const next=mode==='week' ? shift(dateOf(anchor),direction*7) : new Date(range.start.getFullYear(),range.start.getMonth()+direction,1,12);
    setAnchor(keyOf(next));
  }
  const visible=(data?.habits || []).filter(h=>(filter==='archived'?h.archived:!h.archived) && h.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const marks=new Set((data?.entries || []).map(e=>markKey(e.habit_id,e.day)));
  const stats=metrics(visible,data?.entries || [],range.days,today);
  const title=mode==='month' ? range.start.toLocaleDateString('es-PE',{month:'long',year:'numeric'}) : `${pretty(range.start)} — ${pretty(range.end)} · ${range.end.getFullYear()}`;
  const canNext=range.to<today;

  const chart=range.days.map(date=>({date,...metrics(visible,data?.entries || [],[date],today)}));
  const chartWidth=Math.max(500,range.days.length*37);
  const chartX=i=>38+i*(chartWidth-76)/Math.max(1,range.days.length-1);
  const chartY=rate=>94-(rate/100)*68;
  const segments=[];
  let segment=[];
  chart.forEach((item,i)=>{
    if(item.rate===null || keyOf(item.date)>today) { if(segment.length) segments.push(segment); segment=[]; }
    else segment.push({x:chartX(i),y:chartY(item.rate),item});
  });
  if(segment.length) segments.push(segment);
  const gradientId=`habit-area-${user.id}`;

  return <section className="hv-root" aria-label="Seguimiento de hábitos">
    <header className="hv-heading">
      <h1><span className="hv-title-icon"><Target size={23}/></span>Hábitos</h1>
      <div className="hv-heading-actions">
        <span className="hv-save-state" role="status">{saving?'Guardando…':pending?`Guardando ${pending} ${pending===1?'marca':'marcas'}…`:syncing?'Actualizando…':error?'Revisar guardado':data?'Guardado':''}</span>
        <button className="hv-refresh" disabled={busy || syncing} title="Actualizar desde tu cuenta" aria-label="Actualizar desde tu cuenta" onClick={()=>void refresh(true)}><RefreshCw size={16}/></button>
        <button ref={newButton} className="hv-primary" disabled={busy || !data} onClick={openCreate}><Plus size={17}/> Nuevo hábito</button>
      </div>
    </header>

    {error && <div className="hv-error" role="alert">{error}<button disabled={busy || syncing} onClick={()=>void refresh(true)}>Reintentar</button></div>}
    <div className="hv-toolbar">
      <div className="hv-switch hv-view-switch" aria-label="Vista"><button disabled={busy} aria-pressed={mode==='week'} onClick={()=>setMode('week')}>Semana</button><button disabled={busy} aria-pressed={mode==='month'} onClick={()=>setMode('month')}>Mes</button></div>
      <div className="hv-period"><button disabled={busy} aria-label="Periodo anterior" onClick={()=>navigate(-1)}><ChevronLeft size={17}/></button><strong>{title}</strong><button disabled={busy || !canNext} aria-label="Periodo siguiente" onClick={()=>navigate(1)}><ChevronRight size={17}/></button><button className="hv-today-button" disabled={busy} onClick={()=>{setToday(keyOf(new Date()));setAnchor(keyOf(new Date()));}}>Hoy</button></div>
    </div>
    <div className="hv-filter">
      <div className="hv-switch hv-filter-switch"><button disabled={busy} aria-pressed={filter==='active'} onClick={()=>setFilter('active')}>Activos</button><button disabled={busy} aria-pressed={filter==='archived'} onClick={()=>setFilter('archived')}>Archivados</button></div>
      <input aria-label="Buscar hábito" placeholder="Buscar hábito…" value={search} onChange={e=>setSearch(e.target.value)}/>
      {data && <span className="hv-inline-summary"><strong>{stats.rate===null?'—':`${stats.rate}%`}</strong> · {stats.done}/{stats.due} hasta hoy</span>}
    </div>
    {!data ? <div className="hv-empty" role="status">{error?'No hay datos disponibles. Pulsa Reintentar.':'Cargando tus hábitos…'}</div> : !visible.length ? <div className="hv-empty"><Target size={28}/><h2>{search?'Sin coincidencias':filter==='archived'?'No hay hábitos archivados':'Tu primer hábito empieza aquí'}</h2><p>{search?'Prueba otro nombre.':'Elige una actividad sencilla y los días en que quieres repetirla.'}</p><button className="hv-primary" disabled={busy} onClick={openCreate}><Plus size={16}/> Nuevo hábito</button></div> :
      <div className="hv-surface">
      <div className="hv-table-scroll" tabIndex={0} role="region" aria-label="Tabla de hábitos; desplázate para ver más fechas">
        <table className={`hv-table ${mode==='month'?'is-month':''}`}>
          <caption className="hv-sr">Hábitos de {title}</caption>
          <colgroup><col className="hv-col-name"/>{range.days.map(date=><col className="hv-col-day" key={keyOf(date)}/>)}<col className="hv-col-progress"/><col className="hv-col-actions"/></colgroup>
          <thead><tr><th scope="col" className="hv-name-cell">Hábito</th>{range.days.map(date=><th scope="col" key={keyOf(date)} className={keyOf(date)===today?'is-today':''}><span>{DAYS[(date.getDay()+6)%7]}</span><strong>{date.getDate()}</strong></th>)}<th scope="col">Avance</th><th scope="col">Opciones</th></tr></thead>
          <tbody>{visible.map(h=>{
            const Symbol=ICONS[h.icon] || Target;
            const result=metrics([h],data.entries,range.days,today);
            return <tr key={h.id} className={leaving===h.id ? "hv-row-leaving" : flash===h.id ? "hv-row-updated" : ""} style={{'--habit-color':h.color}}>
              <th scope="row" className="hv-name-cell"><div className="hv-habit"><span className="hv-icon" style={{color:h.color,background:`${h.color}14`}}><Symbol size={23} strokeWidth={2} aria-hidden="true"/></span><div><strong>{h.title}</strong><small>{scheduleFor(h,today).length===7?'Todos los días':scheduleFor(h,today).map(d=>DAYS[d]).join(' · ')}</small></div></div></th>
              {range.days.map(date=>{
                const day=keyOf(date),due=planned(h,date),done=marks.has(markKey(h.id,day)),future=day>today;
                const state=!due?'rest':done?'done':future?'future':day<today?'missed':'pending';
                return <td key={day} className={day===today?'is-today':''}><button className={`hv-cell ${state}`} disabled={saving || h.archived || !due || future} aria-pressed={done && due} title={`${h.title} · ${pretty(date)}: ${!due?'no programado':done?'completado':future?'día futuro':day<today?'sin completar':'pendiente hoy'}`} aria-label={`${h.title}, ${pretty(date)}, ${!due?'no programado':done?'completado':future?'día futuro':'sin completar'}`} onClick={()=>toggle(h,date)}>{!due?'—':done?<Check size={16}/>:state==='missed'?<span aria-hidden="true">·</span>:null}</button></td>;
              })}
              <td className="hv-advance"><strong>{result.done}<span>/{result.due}</span></strong><div><span style={{width:`${result.rate || 0}%`,background:h.color}}/></div></td>
              <td><div className="hv-actions"><button className="hv-edit" disabled={busy} title="Editar" aria-label={`Editar ${h.title}`} onClick={()=>edit(h)}><Pencil size={17} strokeWidth={2} aria-hidden="true"/></button><button className="hv-archive" disabled={busy} title={h.archived?'Restaurar':'Archivar'} aria-label={`${h.archived?'Restaurar':'Archivar'} ${h.title}`} onClick={()=>void archive(h)}>{h.archived?<RotateCcw size={17} strokeWidth={2} aria-hidden="true"/>:<Archive size={17} strokeWidth={2} aria-hidden="true"/>}</button><button className="hv-delete" disabled={busy} title="Eliminar permanentemente" aria-label={`Eliminar ${h.title}`} onClick={()=>void remove(h)}><Trash2 size={17} strokeWidth={2} aria-hidden="true"/></button></div></td>
            </tr>;
          })}</tbody>
          <tfoot><tr><td colSpan={range.days.length+3}>
            <div className="hv-chart-heading"><strong>Cumplimiento diario</strong><span>{stats.rate===null?'Sin datos transcurridos':`${stats.rate}% hasta hoy`}</span></div>
            <div className="hv-line-scroll"><svg className="hv-line-chart" viewBox={`0 0 ${chartWidth} 131`} role="img" aria-label={`Cumplimiento diario de ${title}. ${chart.map(c=>`${pretty(c.date)}: ${c.rate===null?'sin datos':c.rate+'%'}`).join('; ')}`}>
              <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity=".22"/><stop offset="100%" stopColor="#2563eb" stopOpacity="0"/></linearGradient></defs>
              {[26,60,94].map((y,i)=><g key={y}><line x1="30" y1={y} x2={chartWidth-22} y2={y} stroke="#e8edf5" strokeDasharray={i===2?'0':'3 5'}/><text x="1" y={y+3} className="hv-axis-label">{100-i*50}</text></g>)}
              {segments.map((points,i)=><g key={i}>{points.length>1 && <><path d={`M ${points[0].x} 94 L ${points.map(p=>`${p.x} ${p.y}`).join(' L ')} L ${points[points.length-1].x} 94 Z`} fill={`url(#${gradientId})`}/><polyline points={points.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/></>}{points.map(p=><circle key={keyOf(p.item.date)} cx={p.x} cy={p.y} r="3.5" fill="#2563eb" stroke="white" strokeWidth="1.5"><title>{pretty(p.item.date)} · {p.item.rate}%</title></circle>)}</g>)}
              {chart.map((item,i)=><text key={keyOf(item.date)} x={chartX(i)} y="116" textAnchor="middle" className="hv-date-label">{mode==='week'?`${DAYS[(item.date.getDay()+6)%7]} ${item.date.getDate()}`:item.date.getDate()}</text>)}
            </svg></div>
          </td></tr></tfoot>
        </table>
      </div>
      <div className="hv-legend"><span><i className="done"/>Completado</span><span><i className="pending"/>Hoy</span><span><i className="missed"/>Sin completar</span><span>— Descanso</span><span className="hv-future-note">Futuros sin penalización</span></div>
      </div>}
    {deleteTarget && (
      <div className="hv-overlay">
        <section
          className="hv-dialog hv-delete-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hv-delete-title"
          onKeyDown={event=>{
            if(event.key==='Escape' && !busy) setDeleteTarget(null);
            if(event.key==='Tab') {
              const items=[...event.currentTarget.querySelectorAll('button:not(:disabled)')];
              const first=items[0],last=items[items.length-1];
              if(event.shiftKey && document.activeElement===first) {
                event.preventDefault();last?.focus();
              } else if(!event.shiftKey && document.activeElement===last) {
                event.preventDefault();first?.focus();
              }
            }
          }}
        >
          <div className="hv-dialog-heading">
            <h2 id="hv-delete-title">Eliminar hábito</h2>
            <button
              type="button"
              disabled={busy}
              aria-label="Cerrar"
              onClick={()=>setDeleteTarget(null)}
            ><X size={19}/></button>
          </div>

          <p>
            Se eliminará <strong>{deleteTarget.title}</strong> y todas
            sus marcas. Esta acción es permanente.
          </p>

          {error && <p className="hv-error" role="alert">{error}</p>}

          <div className="hv-dialog-actions">
            <button
              type="button"
              autoFocus
              disabled={busy}
              onClick={()=>setDeleteTarget(null)}
            >Cancelar</button>

            <button
              className="hv-delete-confirm"
              type="button"
              disabled={busy}
              onClick={async()=>{
                const ok=await removeConfirmed(deleteTarget);
                if(ok && mounted.current) setDeleteTarget(null);
              }}
            >{busy?'Eliminando…':'Eliminar hábito'}</button>
          </div>
        </section>
      </div>
    )}
    {form && <div className="hv-overlay"><section ref={dialog} className="hv-dialog" role="dialog" aria-modal="true" aria-labelledby="hv-dialog-title" onKeyDown={event=>{
      if(event.key==='Escape') closeForm();
      if(event.key==='Tab') {const items=[...event.currentTarget.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary')].filter(item=>item.getClientRects().length>0);const first=items[0],last=items[items.length-1];if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}}
    }}><form onSubmit={save}><div className="hv-dialog-heading"><h2 id="hv-dialog-title">{form.isNew?'Nuevo hábito':'Editar hábito'}</h2><button type="button" disabled={busy} aria-label="Cerrar" onClick={closeForm}><X size={19}/></button></div>
      <label>Nombre<input required maxLength={100} disabled={busy} value={form.title} placeholder="Ej. Leer 15 minutos" onChange={e=>setForm({...form,title:e.target.value})}/></label>

      <fieldset disabled={busy}><legend>Días de la semana</legend><div className="hv-days-select">{DAYS.map((day,i)=><button key={i} type="button" aria-pressed={form.days.includes(i)} onClick={()=>setForm({...form,days:form.days.includes(i)?form.days.filter(d=>d!==i):[...form.days,i].sort()})}>{day}</button>)}</div></fieldset>
      {/* HABITS PROJECT STYLE V5 */}
      <details className="hv-personalize">
        <summary>
          <span
            className="hv-personalize-icon"
            style={{color:form.color,background:`${form.color}14`}}
          >
            {React.createElement(
              ICONS[form.icon] || Target,
              {size:23,strokeWidth:2,"aria-hidden":true}
            )}
          </span>
          <span>
            Personalizar
            <small>Icono y color · opcional</small>
          </span>
          <ChevronRight size={16} aria-hidden="true"/>
        </summary>
        <div className="hv-personalize-body">
<fieldset disabled={busy}><legend>Icono</legend><div className="hv-icon-picker">{Object.entries(ICONS).map(([name,Symbol])=><button type="button" key={name} aria-label={{target:'Objetivo',book:'Lectura',exercise:'Ejercicio',water:'Agua',sleep:'Descanso',heart:'Bienestar'}[name]} title={{target:'Objetivo',book:'Lectura',exercise:'Ejercicio',water:'Agua',sleep:'Descanso',heart:'Bienestar'}[name]} aria-pressed={form.icon===name} style={form.icon===name?{color:form.color,borderColor:form.color,background:`${form.color}14`}:undefined} onClick={()=>setForm({...form,icon:name})}><Symbol size={23} strokeWidth={2} aria-hidden="true"/></button>)}</div></fieldset>
<fieldset disabled={busy}><legend>Color</legend><div className="hv-colors">{COLORS.map(color=><button type="button" key={color} style={{background:color}} aria-label={`Color ${color}`} aria-pressed={form.color===color} onClick={()=>setForm({...form,color})}>{form.color===color && <Check size={18}/>}</button>)}<input type="color" aria-label="Color personalizado" value={form.color} onChange={e=>setForm({...form,color:e.target.value})}/></div></fieldset>
        </div>
      </details>
      <p className="hv-help">{form.isNew?'El seguimiento comienza hoy. Elige al menos un día.':'Los cambios de frecuencia se aplican desde hoy. Las fechas anteriores conservan su programación.'}</p>
      {error && <p className="hv-error" role="alert">{error}</p>}
      <div className="hv-dialog-actions"><button type="button" disabled={busy} onClick={closeForm}>Cancelar</button><button className="hv-primary" disabled={busy || !form.title.trim() || !form.days.length}>{busy?'Guardando…':'Guardar hábito'}</button></div>
    </form></section></div>}
  </section>;
}
