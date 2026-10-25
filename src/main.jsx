import LabsPage from './labs/LabsPage.tsx';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const projects = [
  { name:'MODCONTROL', group:'Monitoreo industrial', desc:'App para visualizar variables, sensores y alertas desde dispositivos conectados.', color:'blue', art:'monitor', tags:['Android','MQTT'] },
  { name:'Plancito', group:'Eventos', desc:'Producto para descubrir, organizar y gestionar eventos con un flujo más claro.', color:'violet', art:'events', tags:['Web','Móvil'] },
  { name:'Ambulancias en tiempo real', group:'Geolocalización', desc:'Representación de unidades, estados y ubicación en tiempo real dentro de un mapa.', color:'green', art:'map', tags:['Mapas','Realtime'] },
  { name:'Hetwin', group:'Asistente de voz', desc:'Asistente de escritorio por voz para ejecutar acciones y automatizar tareas.', color:'cyan', art:'voice', tags:['Python','Automatización'] },
  { name:'Remove Background', group:'Visión por computadora', desc:'Herramienta para eliminar fondo de imágenes y generar recortes rápidos.', color:'orange', art:'cutout', tags:['Imagen','IA'] },
  { name:'Heatmap', group:'Análisis visual', desc:'Exploración visual mediante mapas de calor para estudiar atención e interacción.', color:'pink', art:'heat', tags:['Python','Visualización'] },
];


const projectDetails = {
 'MODCONTROL': {slug:'modcontrol', overview:'Exploración de monitoreo industrial desde una aplicación móvil: variables, estados y alertas en una interfaz de lectura rápida.', challenges:['Leer variables de proceso sin sobrecargar la pantalla','Conectar la interfaz con mensajes MQTT','Organizar alertas y estados de equipos'], modules:['Aplicación Android','Mensajería MQTT','Visualización','Sensores y dispositivos'], stage:'Prototipo técnico'},
 'Plancito': {slug:'plancito', overview:'Plataforma personal para descubrir eventos y facilitar la organización, con experiencias diferenciadas para asistentes y organizadores.', challenges:['Exploración de eventos y lugares','Gestión de eventos y asistentes','Diseñar una experiencia clara para móvil y web'], modules:['Explorar eventos','Página de evento','Organización','Asistencia'], stage:'Producto en desarrollo'},
 'Ambulancias en tiempo real': {slug:'ambulancias', overview:'Concepto de seguimiento de unidades sobre mapas, visualización de sus estados y actualizaciones en tiempo real.', challenges:['Ubicar unidades geográficamente','Presentar cambios de estado','Mantener información legible sobre mapas'], modules:['Mapa','Unidades','Estados','Actualizaciones'], stage:'Exploración técnica'},
 'Hetwin': {slug:'hetwin', overview:'Asistente de escritorio basado en voz y automatizaciones locales para ejecutar tareas y obtener respuestas habladas.', challenges:['Reconocer activaciones por voz','Vincular comandos con acciones','Producir respuestas claras mediante audio'], modules:['Entrada de voz','Intenciones','Acciones','Audio'], stage:'Prototipo personal'},
 'Remove Background': {slug:'remove-background', overview:'Herramienta experimental para separar sujetos del fondo de sus fotografías y producir recortes reutilizables.', challenges:['Seleccionar una imagen','Procesar la separación del fondo','Exportar el resultado'], modules:['Entrada','Procesamiento','Vista previa','Exportación'], stage:'Experimento'},
 'Heatmap': {slug:'heatmap', overview:'Estudio de visualización de atención e interacción mediante mapas de calor y métricas exploratorias.', challenges:['Recoger puntos de interacción','Representar intensidad espacial','Interpretar patrones visuales'], modules:['Captura','Procesamiento','Mapa de calor','Análisis'], stage:'Experimento'}
};
const slugOf = (p) => projectDetails[p.name].slug;

function Arrow({size=18}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>}
function WhatsApp(){return <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.52 3.48A11.8 11.8 0 0 0 12.02 0C5.4 0 .02 5.38.02 12c0 2.1.55 4.16 1.6 5.98L0 24l6.2-1.58A11.95 11.95 0 0 0 12.02 24c6.62 0 12-5.38 12-12 0-3.2-1.24-6.2-3.5-8.52ZM12.02 21.9c-1.78 0-3.52-.47-5.04-1.36l-.36-.21-3.68.94.98-3.59-.24-.37A9.85 9.85 0 0 1 2.12 12c0-5.46 4.44-9.9 9.9-9.9 2.65 0 5.14 1.03 7 2.9a9.83 9.83 0 0 1 2.9 7c0 5.46-4.44 9.9-9.9 9.9Zm5.43-7.43c-.3-.15-1.76-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.16-.17.2-.35.22-.65.08-.3-.15-1.25-.46-2.38-1.48a8.9 8.9 0 0 1-1.65-2.05c-.17-.3-.02-.47.13-.62.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.08-.8.37s-1.05 1.02-1.05 2.48 1.08 2.88 1.23 3.08c.15.2 2.12 3.25 5.14 4.56.72.31 1.28.5 1.72.64.72.23 1.37.2 1.88.12.58-.09 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.08-.12-.28-.2-.58-.35Z"/></svg>}

function Art({type}){
 if(type==='monitor')return <svg viewBox="0 0 440 260" role="img" aria-label="Vista ilustrada de un panel de monitoreo"><rect x="57" y="38" width="326" height="184" rx="20" fill="#10329A"/><rect x="71" y="53" width="298" height="152" rx="12" fill="#F7FAFF"/><rect x="86" y="72" width="120" height="14" rx="7" fill="#CEDAFC"/><rect x="88" y="106" width="168" height="80" rx="13" fill="#E0EEFF"/><path d="M105 158 Q125 120 146 146T187 129T239 121" stroke="#1261FF" strokeWidth="6" strokeLinecap="round" fill="none"/><rect x="271" y="106" width="78" height="80" rx="13" fill="#D8E9FF"/><circle cx="310" cy="145" r="23" stroke="#2A6DF9" strokeWidth="11" strokeDasharray="103 42" fill="none"/><rect x="177" y="218" width="85" height="11" rx="5" fill="#1C3281"/></svg>;
 if(type==='events')return <svg viewBox="0 0 440 260" role="img" aria-label="Ilustración de entradas para eventos"><circle cx="327" cy="62" r="52" fill="#D8CCFF"/><rect x="89" y="35" width="253" height="193" rx="24" fill="#FFF" transform="rotate(-7 215 132)"/><rect x="109" y="55" width="216" height="154" rx="15" fill="#EFE9FF" transform="rotate(-7 215 132)"/><circle cx="166" cy="120" r="26" fill="#7943F8"/><path d="m154 119 9 10 17-20" stroke="#FFF" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round"/><rect x="205" y="99" width="92" height="9" rx="4" fill="#9476D7"/><rect x="205" y="119" width="70" height="9" rx="4" fill="#B6A0E9"/><path d="M114 176H307" stroke="#A48DE0" strokeWidth="4" strokeDasharray="5 9"/><circle cx="313" cy="188" r="10" fill="#FFBE45"/></svg>;
 if(type==='map')return <svg viewBox="0 0 440 260" role="img" aria-label="Mapa con ruta de ambulancia"><path d="M0 75 135 25 250 76 440 0v260l-150-64-123 44L0 176Z" fill="#D9F4EB"/><path d="m30 15 102 245M230 0 145 260M343 10l24 255M0 125h440" stroke="#FFF" strokeWidth="18" fill="none"/><path d="M82 164Q156 210 223 128T355 95" fill="none" stroke="#1572FB" strokeWidth="7" strokeDasharray="8 12" strokeLinecap="round"/><rect x="202" y="99" width="53" height="45" rx="12" fill="#FFF" stroke="#0B65E3" strokeWidth="5"/><path d="M228 108v27m-13-13h26" stroke="#E64B5D" strokeWidth="7"/><circle cx="83" cy="165" r="13" fill="#FF705E"/><circle cx="355" cy="95" r="13" fill="#165FFF"/></svg>;
 if(type==='voice')return <svg viewBox="0 0 440 260" role="img" aria-label="Ondas de audio y micrófono"><circle cx="220" cy="131" r="104" fill="#D7F9FF"/><circle cx="220" cy="131" r="79" stroke="#28C5E8" strokeOpacity=".35" strokeWidth="4" fill="none"/><g stroke="#008FD8" strokeWidth="8" strokeLinecap="round"><path d="M88 121v20M113 100v63M138 82v98M163 106v52M277 106v52M302 82v98M327 100v63M352 121v20"/></g><rect x="200" y="79" width="40" height="91" rx="20" fill="#1763FD"/><path d="M182 135a38 38 0 0 0 76 0M220 175v24m-21 0h42" fill="none" stroke="#0C367B" strokeWidth="9" strokeLinecap="round"/></svg>;
 if(type==='cutout')return <svg viewBox="0 0 440 260" role="img" aria-label="Imagen con fondo eliminado"><rect x="65" y="27" width="160" height="204" rx="23" fill="#D7DCEF"/><path d="M65 27h80v102H65zm80 102h80v102h-80z" fill="#F4F6FE"/><rect x="210" y="27" width="164" height="204" rx="23" fill="#FFD1E8"/><circle cx="282" cy="98" r="35" fill="#D97B62"/><path d="M218 210Q221 139 282 139t70 71" fill="#173BB4"/><path d="M247 73q30-52 67-8l4 22q-21-22-71-14" fill="#2D2868"/><path d="M222 42l-17 17m17-17 19 17" stroke="#FF55AA" strokeWidth="7"/></svg>;
 return <svg viewBox="0 0 440 260" role="img" aria-label="Mapa de calor"><rect x="54" y="30" width="331" height="199" rx="23" fill="#DCF9E6"/><path d="M70 95h299M70 161h299M148 45v170M235 45v170M319 45v170" stroke="#FFF" strokeWidth="3"/><defs><radialGradient id="hot"><stop stopColor="#F83846"/><stop offset=".36" stopColor="#FF8A1D"/><stop offset=".7" stopColor="#F9DB40" stopOpacity=".72"/><stop offset="1" stopColor="#5CD4A2" stopOpacity="0"/></radialGradient></defs><ellipse cx="152" cy="118" rx="93" ry="85" fill="url(#hot)"/><ellipse cx="284" cy="164" rx="84" ry="73" fill="url(#hot)"/><path d="M87 198q68-66 128-48t128-74" stroke="#1362FF" strokeWidth="5" strokeDasharray="7 10" fill="none" strokeLinecap="round"/></svg>
}

function Icon({name,size=22}){const paths={web:<><rect x="3" y="4" width="18" height="14" rx="3"/><path d="M3 9h18M9 21h6m-3-3v3"/></>,mobile:<><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></>,code:<><path d="m8 8-4 4 4 4m8-8 4 4-4 4M14 4l-4 16"/></>,spark:<><path d="m12 2 2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3L12 2Z"/></>,iot:<><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/></>};return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]||paths.code}</svg>}
const skills=[{icon:'web',name:'Web',description:'Interfaces y experiencias'},{icon:'mobile',name:'Android',description:'Aplicaciones móviles'},{icon:'code',name:'Backend',description:'APIs y datos'},{icon:'spark',name:'IA',description:'Visión y automatización'},{icon:'iot',name:'IoT',description:'Sistemas conectados'}];
function ProjectCard({p}){
 const href=`#/project/${slugOf(p)}`;
 return <a className={`project card-${p.color} reveal`} href={href} aria-label={`Explorar proyecto ${p.name}`}>
   <div className="project-image"><div className="project-mockup"><div className="mockup-bar" aria-hidden="true"><i/><i/><i/></div><Art type={p.art}/></div></div>
   <div className="project-details">
     <div className="project-kind">{p.group}</div>
     <h3>{p.name}</h3>
     <p>{p.desc}</p>
     <div className="project-foot"><span className="tags-line">{p.tags.join(' · ')}</span><span className="project-arrow" aria-hidden="true"><Arrow size={17}/></span></div>
   </div>
 </a>
}
function ProjectPage({p}) {
 const data=projectDetails[p.name];
 useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});},[p.name]);
 return <main className="detail-main"><div className="container">
    <a className="detail-back" href="/#proyectos">← Volver a proyectos</a>
    <div className="detail-hero"><div className="detail-copy"><span className="detail-kicker">{p.group} / {data.stage}</span><h1>{p.name}</h1><p>{data.overview}</p><div className="detail-tags">{p.tags.map(t=><span key={t}>{t}</span>)}</div></div><div className={`detail-art card-${p.color}`}><Art type={p.art}/></div></div>
    <div className="detail-columns"><section><p className="section-label">En qué consiste</p><h2>La idea y sus retos.</h2><p className="detail-note">Esta visualización es conceptual: describe el enfoque del proyecto y no representa métricas ni capturas verificadas del producto.</p><ul className="detail-list">{data.challenges.map(c=><li key={c}>{c}</li>)}</ul></section><section><p className="section-label">Componentes</p><h2>Cómo se organiza.</h2><div className="detail-modules">{data.modules.map((m,i)=><div className="detail-module" key={m}><span>{String(i+1).padStart(2,'0')}</span><strong>{m}</strong></div>)}</div></section></div>
    <div className="detail-footer"><span>¿Quieres conocer otros trabajos?</span><a className="btn btn-primary" href="/#proyectos">Explorar proyectos <Arrow/></a></div>
 </div></main>
}


const birdParts=[
 {name:'Ala superior',detail:'Superficies ligeras que transforman el movimiento en sustentación.',accent:'#2768ff'},
 {name:'Estructura',detail:'Costillas y uniones internas: piezas pequeñas que dan estabilidad al conjunto.',accent:'#eb944f'},
 {name:'Mecanismo',detail:'Una transmisión conceptual que conecta movimiento, equilibrio y control.',accent:'#16a4af'},
 {name:'Electrónica',detail:'El núcleo de sensores y control que convierte señales en acciones.',accent:'#8958e9'}
];
function BirdDiagram({active,setActive}) {
 const shapes=[
  <g><path d="M270 210C194 122 93 88 36 105c48 28 96 78 144 143 21 29 49 49 90 65z" fill="#e6f2ff" stroke="#2c67dd" strokeWidth="3"/>{Array.from({length:8},(_,i)=><path key={i} d={`M${45+i*18} ${112+i*9} Q${145+i*7} ${166+i*10} 266 288`} fill="none" stroke="#85b4f5" strokeWidth="2"/>)}<path d="M320 210C405 116 507 99 583 123c-72 30-120 84-170 150-23 29-55 40-93 43z" fill="#d7eaff" stroke="#2c67dd" strokeWidth="3"/>{Array.from({length:8},(_,i)=><path key={i} d={`M${567-i*20} ${132+i*8}Q${458-i*4} ${187+i*7} 328 290`} fill="none" stroke="#85b4f5" strokeWidth="2"/>)}</g>,
  <g><path d="M277 176Q293 156 318 180L350 291 302 344 254 291Z" fill="#e6f2f2" stroke="#138c9f" strokeWidth="3"/><path d="M272 219L184 162M337 216l93-49M293 260l-111-45m154 47 110-45" stroke="#3e9fa9" strokeWidth="9" strokeLinecap="round"/><path d="M275 220L184 162M337 216l93-49M293 260l-111-45m154 47 110-45" stroke="#a8e4e9" strokeWidth="3" strokeLinecap="round"/></g>,
  <g><rect x="263" y="182" width="81" height="101" rx="21" fill="#fbe0c6" stroke="#d98443" strokeWidth="3"/><circle cx="304" cy="232" r="30" fill="#fff" stroke="#d98443" strokeWidth="5"/><circle cx="304" cy="232" r="15" fill="#d98443"/><path d="M304 190v19M304 255v20M265 232h18M324 232h17" stroke="#d98443" strokeWidth="5"/><rect x="286" y="286" width="36" height="35" rx="9" fill="#ffba73" stroke="#cb7b3c" strokeWidth="3"/></g>,
  <g><rect x="257" y="188" width="95" height="100" rx="14" fill="#283d7c" stroke="#9aabed" strokeWidth="4"/><rect x="274" y="203" width="61" height="48" rx="7" fill="#62d7c2"/><path d="M279 218h50m-50 10h36m-36 10h44" stroke="#197d82" strokeWidth="4"/><g stroke="#9ee7ef" strokeWidth="3"><path d="M257 212h-15m15 20h-15m15 20h-15M352 212h15m-15 20h15m-15 20h15"/></g><circle cx="303" cy="269" r="7" fill="#ffc268"/></g>
 ];
 return <svg className="bird-svg" viewBox="0 0 620 465" role="img" aria-label="Ilustración original de un ave biónica descompuesta en cuatro módulos seleccionables">
  <g stroke="#dce5f6" strokeWidth="1"><path d="M15 380h590M310 15v430" strokeDasharray="5 10"/></g>
  {shapes.map((shape,i)=><g key={i} role="button" tabIndex={0} aria-label={'Seleccionar '+birdParts[i].name} onClick={()=>setActive(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setActive(i)}}} className={'bird-part bird-part-'+i+(active===i?' is-active':'')} style={{'--bird-step':i}}>{shape}</g>)}
  <g className="bird-callouts" fontFamily="Arial,sans-serif" fontSize="12" fill="#46608d"><path d="M97 85l62 26M480 75l-50 50M87 340l162-72M488 355l-143-88" stroke="#8fa3c3" strokeWidth="1.4" fill="none"/><text x="18" y="78">01 / ALAS</text><text x="480" y="68">02 / CHASIS</text><text x="15" y="356">03 / MOTOR</text><text x="485" y="372">04 / CONTROL</text></g>
 </svg>
}
function ExplodedView(){return <section className="bird-feature" id="por-dentro"><div className="container bird-feature-layout"><div className="bird-feature-copy reveal"><span className="mini-kicker">Naturaleza × tecnología</span><h2>Ingeniería que <em>levanta vuelo.</em></h2><p>Un ave biónica imaginada desde la biomimética: alas articuladas, sensores, electrónica y movimiento, reunidos en una sola idea.</p><a href="#laboratorio" className="bird-feature-link">Ver mi laboratorio <Arrow/></a><small>Concepto visual de referencia. No representa un prototipo construido.</small></div><div className="bird-photo" role="img" aria-label="Ave biónica robótica realista en vuelo, con alas metálicas y detalles tecnológicos"></div></div></section>}
const labItems=[
 {name:'Hetwin',icon:'voice',desc:'Comandos por voz y automatización de escritorio.',tag:'Voz'},
 {name:'Visión por computadora',icon:'vision',desc:'Pruebas con reconocimiento y procesamiento de imágenes.',tag:'Imagen'},
 {name:'Eye tracking',icon:'eye',desc:'Seguimiento ocular y mapas de atención visual.',tag:'Interacción'},
 {name:'Robótica e IoT',icon:'cpu',desc:'Prototipos conectados con sensores, QR y asistentes.',tag:'Hardware'},
];
function Lab(){return <section className="lab-section section" id="laboratorio"><div className="container"><div className="section-top reveal"><div><p className="section-label">Probar, aprender, construir</p><h2>Mi laboratorio<span className="period">.</span></h2></div><p>Ideas en marcha: voz, visión, interacción y hardware. Prototipos que alimentan futuros proyectos.</p></div><div className="lab-grid">{labItems.map((item,i)=><article className={'lab-card lab-'+i+' reveal'} key={item.name}><div className="lab-graphic"><Icon name={['code','spark','web','iot'][i]} size={49}/><span className="lab-orbit lab-orbit-one"/><span className="lab-orbit lab-orbit-two"/></div><div className="lab-content"><small>{item.tag}</small><h3>{item.name}</h3><p>{item.desc}</p><div className="lab-progress"><span style={{width:['72%','84%','60%','69%'][i]}}/></div></div></article>)}</div></div></section>}
function Journey(){const items=[
 {date:'Producto digital',title:'Plancito',desc:'Eventos, organizadores, experiencias y funciones en tiempo real.',tag:'Producto · Web'},
 {date:'Industrial y móvil',title:'MODCONTROL',desc:'Android, sensores y monitoreo conectado mediante MQTT.',tag:'Android · IoT'},
 {date:'Experimentación',title:'IA y asistentes',desc:'Hetwin, visión computacional, mapas de calor y procesamiento de imágenes.',tag:'Python · IA'},
 {date:'Innovación aplicada',title:'Accesibilidad y robótica',desc:'Interfaces inclusivas, exploración de lengua de señas y robótica de eventos.',tag:'UX · Hardware'}
 ];return <section id="experiencia" className="journey-section section"><div className="container"><div className="section-top reveal"><div><p className="section-label">Lo que sigo explorando</p><h2>Mi camino no es <em>una línea recta.</em></h2></div><p>Son proyectos y tecnologías que se conectan entre sí. Cada uno deja algo para el siguiente.</p></div><div className="journey-mosaic">{items.map((item,i)=><article className={'journey-tile journey-tile-'+i+' reveal'} key={item.title}><div className="journey-tile-top"><span>{item.date}</span><span>{'0'+(i+1)}</span></div><Icon name={['web','mobile','spark','iot'][i]} size={42}/><h3>{item.title}</h3><p>{item.desc}</p><small>{item.tag}</small></article>)}</div></div></section>}
function App(){
 const [route,setRoute]=useState(window.location.hash);
 const [pathname,setPathname]=useState(window.location.pathname);
 useEffect(()=>{const onPop=()=>setPathname(window.location.pathname); window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop)},[]);
 const inLabs=/^\/labs(?:\/|$)/.test(pathname);
 function navigateLabs(e){e.preventDefault();window.history.pushState({},'', '/labs');setPathname('/labs');window.scrollTo(0,0);setMenu(false)}
 function navigateHome(e, sectionId) {
    e.preventDefault();

    // Regresar al portafolio principal
    window.history.pushState({}, '', `/#${sectionId}`);

    // Actualizar la página mostrada por React
    setPathname('/');
    setRoute(`#${sectionId}`);
    setMenu(false);

    // Esperar a que React muestre el contenido
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(sectionId)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      });
    });
  }
 useEffect(()=>{const update=()=>setRoute(window.location.hash);window.addEventListener("hashchange",update);return()=>window.removeEventListener("hashchange",update)},[]);
 const detailSlug=route.startsWith("#/project/")?route.slice(10):null;
 const activeProject=projects.find(p=>slugOf(p)===detailSlug);
  const [menu,setMenu]=useState(false);
  useEffect(()=>{
    const hero=document.querySelector('.hero-portrait');
    const onMove=(event)=>{if(!hero || window.matchMedia('(pointer: coarse)').matches)return;const box=hero.getBoundingClientRect();hero.style.setProperty('--tilt-x',`${((event.clientY-box.top)/box.height-.5)*-6}deg`);hero.style.setProperty('--tilt-y',`${((event.clientX-box.left)/box.width-.5)*6}deg`)};
    const onLeave=()=>{hero?.style.setProperty('--tilt-x','0deg');hero?.style.setProperty('--tilt-y','0deg')};

    const progress=()=>{const max=document.documentElement.scrollHeight-innerHeight;document.documentElement.style.setProperty('--page-progress',max>0?`${Math.min(100,scrollY/max*100)}%`:'0%')};
    progress();window.addEventListener('scroll',progress,{passive:true});
    const io=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('visible');io.unobserve(entry.target)}
    }),{threshold:.08});
    document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
    return()=>{window.removeEventListener('scroll',progress);io.disconnect();};
  },[]);
  return <>
    <div className="scroll-progress" aria-hidden="true"/>
    <header className="site-header"><div className="container header-inner">
      <a className="logo" href="/">Frank <span className="logo-dot">Bernaola</span></a>
      <button className="mobile-menu" aria-label="Abrir menú" aria-expanded={menu} onClick={()=>setMenu(!menu)}>Menú</button>
      <nav
        className={menu ? "open" : ""}
        aria-label="Navegación principal"
      >
        <a
          href="/#sobre-mi"
          onClick={(e) => navigateHome(e, 'sobre-mi')}
        >
          Conóceme
        </a>

        <a
          href="/#contacto"
          onClick={(e) => navigateHome(e, 'contacto')}
        >
          Contacto
        </a>

        <a
          href="/labs"
          onClick={navigateLabs}
        >
          FrankLabs
        </a>
      </nav>
      <a className="nav-github" href="https://github.com/FrankDeveloperxd" target="_blank" rel="noopener noreferrer">GitHub <Arrow size={15}/></a>
    </div></header>
    {inLabs ? <LabsPage/> : activeProject ? <ProjectPage p={activeProject}/> : <main>
      <section className="hero" id="inicio"><div className="container hero-grid">
        <div className="hero-copy reveal">
          <p className="eyebrow">Hola, soy Frank Bernaola</p>
          <h1>Me gusta construir <span>cosas nuevas.</span></h1>
          <p className="hero-lede">Entre aplicaciones, experimentos y buenas ideas. Este es mi espacio para compartir lo que aprendo y lo que hago.</p>
          <div className="hero-actions"><a className="btn btn-primary" href="#proyectos">Explorar mis proyectos <Arrow/></a><a className="btn btn-secondary" href="#sobre-mi">Conóceme</a></div><div className="hero-quick"><span className="quick-separator">·</span></div>
        </div>
        <div className="hero-portrait" aria-label="Retrato provisional"><div className="orbit-stage"><div className="orbit-disc"/><div className="orbit-ring"/><div className="orbit-satellite"/><div className="orbit-highlight"/></div><img src="/media/portrait/Photo_dev.png" alt="Fotografía provisional; aquí irá el retrato de Frank"/></div>
      </div></section>
      <ExplodedView/>
      <section id="proyectos" className="work section"><div className="container">
        <div className="section-top reveal"><div><p className="section-label">Proyectos</p><h2>Lo que construyo<span className="period">.</span></h2></div><p>Algunas ideas se volvieron aplicaciones; otras siguen siendo experimentos. Aquí están mis favoritas.</p></div>
        <div className="projects-grid">{projects.map(p=><ProjectCard p={p} key={p.name}/>)}</div>
      </div></section>
      <section className="tools-section" id="tecnologias"><div className="container"><div className="tools-heading reveal"><div><p className="section-label">Tecnologías</p><h2>Un ecosistema de tecnologías<span className="period">.</span></h2></div><p>Interfaces, aplicaciones, datos y dispositivos. Tecnologías distintas, conectadas por ideas.</p></div><div className="tech-network"><svg className="tech-wires" viewBox="0 0 1100 180" preserveAspectRatio="none" aria-hidden="true"><path d="M110 80 C260 80 240 125 360 125 S530 42 570 80 S800 125 990 80"/><path d="M110 100 C260 130 410 30 570 100 S810 38 990 100"/></svg><div className="tools-grid">{skills.map((item,i)=><div className="tool-card reveal" key={item.name}><div className="tool-icon"><Icon name={item.icon} size={28}/></div><strong>{item.name}</strong><small>{item.description}</small><span className="tech-beacon"/></div>)}</div></div></div></section>
      <section id="sobre-mi" className="about section"><div className="container about-grid">
        <div className="about-head reveal"><p className="section-label">Un poco sobre mí</p><h2>Aprender, probar, volver a construir<span className="period">.</span></h2></div>
        <div className="about-copy reveal"><p>Me interesa tanto lo que pasa en una pantalla como lo que sucede detrás: arquitectura, datos, automatizaciones y dispositivos conectados.</p><p>Estudio Ingeniería de Software y me gusta aprender construyendo. Este portafolio reúne proyectos personales y trabajos de exploración técnica.</p><div className="skill-pills"><span>React</span><span>Kotlin</span><span>Python</span><span>.NET</span><span>MQTT</span></div></div>
      </div></section>
      <Lab/>
      <Journey/>
      <section id="contacto" className="contact"><div className="container contact-inner reveal"><p className="section-label">Sigamos en contacto</p><h2>¿Conversamos?</h2><p>Si te interesó alguno de mis proyectos o tienes una idea para compartir, conversemos.</p><div className="contact-actions"><a href="https://github.com/FrankDeveloperxd" target="_blank" rel="noopener noreferrer" className="btn btn-primary">Mi GitHub <Arrow/></a><a className="btn btn-secondary" href="https://wa.me/51968949651?text=Hola%20Frank%2C%20vi%20tu%20portafolio" target="_blank" rel="noopener noreferrer">WhatsApp <WhatsApp/></a></div></div></section>
    </main>}
    <a className="whatsapp-float" href="https://wa.me/51968949651?text=Hola%20Frank%2C%20vi%20tu%20portafolio" target="_blank" rel="noopener noreferrer" aria-label="Escribir por WhatsApp"><WhatsApp/></a>
    <footer><div className="container footer-inner"><span>© 2026 Frank Bernaola</span><span>Hecho con curiosidad y código.</span></div></footer>
  </>
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
