import React, {
  useLayoutEffect,
  useRef,
  useState
} from "react";

import {
  Sparkles, X, ArrowLeft, ArrowRight,
  Check, Play, Pause, Columns3,
  NotebookPen, Activity, List
} from "lucide-react";

import "./NotificationGuide.css";

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function cleanTitle(value) {
  const title = String(value || "");

  return title.replace(
    /^\s*(?:\p{Extended_Pictographic}[\uFE0E\uFE0F]?\s*)+/u,
    ""
  ).trim() || title;
}

export function getKind(item) {
  const title = normalize(item.title);

  if (/kanban|tablero/.test(title)) return "kanban";
  if (/imagen|foto|nota/.test(title)) return "notes";
  if (/actividad|dashboard|avance/.test(title)) return "activity";
  if (/boveda|seguridad|credencial/.test(title)) return "vault";
  if (/calendario|evento|agenda/.test(title)) return "calendar";

  return "general";
}



const SLIDES = [
  {
    label: "Proyectos",
    title: "Organiza tu trabajo",
    description: "Crea proyectos y organiza tus tareas desde el tablero Kanban o la vista de lista.",
    icon: Columns3
  },
  {
    label: "Notas",
    title: "Documenta tus ideas",
    description: "Guarda tus apuntes, incorpora imágenes y organiza tus documentos en un solo lugar.",
    icon: NotebookPen
  },
  {
    label: "Actividad",
    title: "Consulta tus avances",
    description: "Revisa tu actividad diaria y realiza un seguimiento de tu trabajo.",
    icon: Activity
  }
];

function Demo({ step }) {
  return (
    <div className="ng-demo" aria-hidden="true">
      <div className="ng-demo-top">
        <div className="ng-window-dots">
          <i/><i/><i/>
        </div>
        <span>Mi Workspace</span>
      </div>

      <div className="ng-demo-body">

        {step === 0 && (
          <>
            <div className="ng-demo-toolbar">
              <strong>Mis tareas</strong>
              <Columns3 size={16}/>
              <List size={16}/>
            </div>

            <div className="ng-board">
              {[
                ["todo", "Por hacer", ["Diseñar interfaz", "Revisar tareas"]],
                ["doing", "En proceso", ["Desarrollo"]],
                ["done", "Terminado", ["Planificación", "Pruebas"]]
              ].map(([status, label, tasks]) => (
                <div className="ng-column" key={status}>
                  <div className={"ng-status " + status}>
                    {label}
                  </div>

                  {tasks.map((task, i) => (
                    <div
                      className="ng-task"
                      key={task}
                      style={{animationDelay: i * 90 + "ms"}}
                    >
                      {task}
                      <span/>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <div className="ng-note">
            <div className="ng-demo-toolbar">
              <NotebookPen size={17}/>
              <strong>Plan del proyecto</strong>
            </div>

            <div className="ng-line"/>
            <div className="ng-line short"/>

            <svg viewBox="0 0 320 110" className="ng-landscape">
              <rect width="320" height="110" fill="#314a73"/>
              <circle cx="247" cy="28" r="15" fill="#e6bc77"/>
              <path d="M0 110 L80 25 L150 90 L210 40 L320 110Z"
                fill="#789ac8"/>
              <path d="M0 110 L80 70 L135 100 L220 65 L320 110Z"
                fill="#497f7d"/>
            </svg>

            <div className="ng-line short"/>
          </div>
        )}

        {step === 2 && (
          <>
            <div className="ng-demo-toolbar">
              <Activity size={17}/>
              <strong>Actividad semanal</strong>
            </div>

            <div className="ng-chart">
              {[32,58,40,75,53,86,66].map((height,i) => (
                <span key={i} style={{
                  height: height + "%",
                  animationDelay: i * 65 + "ms"
                }}/>
              ))}
            </div>

            <div className="ng-heatmap">
              {Array.from({length:28}, (_,i) => (
                <span key={i} data-level={i % 5}/>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default function NotificationGuide({
  animate,
  onToggleMotion,
  onClose
}) {
  const dialogRef = useRef(null);
  const [step, setStep] = useState(0);

  const slide = SLIDES[step];
  const Icon = slide.icon;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement;

    if (!dialog) return;

    if (!dialog.open) dialog.showModal();

    return () => {
      if (dialog.open) dialog.close();

      if (previous?.isConnected && !previous.disabled) {
        previous.focus();
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="ng-dialog"
      data-motion={animate ? "on" : "off"}
      aria-labelledby="ng-title"
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
    >

      <header className="ng-header">
        <div className="ng-brand">
          <Sparkles size={18}/>
          <strong>Descubre Mi Workspace</strong>
        </div>

        <div className="ng-tools">
          <button
            type="button"
            className="ng-motion"
            aria-label="Activar o desactivar animaciones"
            aria-pressed={animate}
            title={animate ? "Desactivar animaciones" : "Activar animaciones"}
            onClick={onToggleMotion}
          >
            {animate ? <Pause size={17}/> : <Play size={17}/>}
          </button>

          <button
            type="button"
            className="ng-close"
            aria-label="Cerrar guía"
            onClick={onClose}
            autoFocus
          >
            <X size={20}/>
          </button>
        </div>
      </header>

      <div className="ng-main">
        <article className="ng-slide" key={step}>

          <Demo step={step}/>

          <div className="ng-copy">
            <span className="ng-feature-icon">
              <Icon size={23}/>
            </span>

            <small>{slide.label}</small>
            <h2 id="ng-title">{slide.title}</h2>
            <p>{slide.description}</p>
          </div>

        </article>
      </div>

      <footer className="ng-footer">

        <button
          type="button"
          className="ng-secondary"
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
        >
          <ArrowLeft size={16}/>
          Anterior
        </button>

        <div className="ng-pages" role="group"
          aria-label="Pantallas de la guía">

          {SLIDES.map((item,i) => (
            <button
              key={item.label}
              type="button"
              aria-label={item.label}
              aria-current={i === step ? "step" : undefined}
              onClick={() => setStep(i)}
            />
          ))}

        </div>

        <button
          type="button"
          className="ng-primary"
          onClick={() => {
            if (step === SLIDES.length - 1) onClose();
            else setStep(step + 1);
          }}
        >
          {step === SLIDES.length - 1 ? "Entendido" : "Siguiente"}

          {step === SLIDES.length - 1
            ? <Check size={17}/>
            : <ArrowRight size={17}/>}
        </button>

      </footer>
    </dialog>
  );
}
