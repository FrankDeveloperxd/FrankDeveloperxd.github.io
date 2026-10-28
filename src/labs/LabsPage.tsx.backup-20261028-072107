import React, {useEffect,useMemo,useState} from 'react';
import {tools} from './registry';
import Icon from './shared/Icons.jsx';
import {navigate} from './shared/navigation.js';
import QRTool from './modules/qr';
import FilesTool from './modules/archivosTemporales';
import ImagesTool from './modules/imagenes';
import AudioTool from './modules/audio';
import KanbanTool from './modules/kanban';
import NotesTool from './modules/notas';
import SpacesTool from './modules/espacios';
import '../labs.css';

const pages: Record<string,React.ComponentType>={qr:QRTool,files:FilesTool,images:ImagesTool,audio:AudioTool,kanban:KanbanTool,notes:NotesTool,spaces:SpacesTool};
function useToolPath(){const [path,setPath]=useState(location.pathname);useEffect(()=>{const update=()=>setPath(location.pathname);window.addEventListener('popstate',update);return()=>window.removeEventListener('popstate',update)},[]);return path.split('/').filter(Boolean)[1]||null;}
export default function LabsPage(){const page=useToolPath();const [search,setSearch]=useState('');const selected=tools.find(t=>t.id===page);const found=useMemo(()=>tools.filter(t=>(t.title+' '+t.desc).toLowerCase().includes(search.toLowerCase())),[search]);const Tool=page?pages[page]:undefined;
return <main className="labs-page"><div className="labs-shell">{selected&&Tool?<><nav className="labs-breadcrumb"><button onClick={()=>navigate(null)}><Icon name="back" size={18}/> Todas las herramientas</button><span>/</span><span>{selected.title}</span></nav><div className="labs-tool-heading"><span className={'labs-tool-icon tone-'+selected.tone}><Icon name={selected.icon} size={32}/></span><div><h1>{selected.title}</h1><p>{selected.desc}</p></div></div><Tool/><div className="labs-bottom-nav"><button onClick={()=>navigate(null)}><Icon name="back" size={18}/> Volver a herramientas</button></div></>:<><div className="labs-catalog-header"><div><h1>FrankLabs<span>.</span></h1><p>Tus herramientas, a un clic.</p></div><label className="labs-search"><Icon name="search" size={20}/><input type="search" placeholder="Buscar herramientas…" value={search} onChange={e=>setSearch(e.target.value)} autoFocus/></label></div><div className="labs-cards">{found.map(t=><button key={t.id} className={'labs-tool tone-'+t.tone} onClick={()=>navigate(t.id)}><span className="labs-card-head"><span className="labs-tool-icon"><Icon name={t.icon} size={31}/></span><span className="labs-card-arrow"><Icon name="arrow" size={21}/></span></span><strong>{t.title}</strong><p>{t.desc}</p></button>)}{!found.length&&<div className="labs-empty">No encontramos una herramienta con ese nombre.</div>}</div></>}</div></main>}
