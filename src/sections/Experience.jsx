import SectionHeader from "../components/SectionHeader";
import { site } from "../data/site";

const items = [
  {
    period: "Sep 2025 — Dic 2025",
    role: "Desarrollador de Software e Innovación",
    place: "Queych",
    text: "React, JavaScript, SQL, pruebas funcionales y soporte en incidencias.",
  },
  {
    period: "Jun 2025 — Actualidad",
    role: "Subdirector de I+D+i",
    place: "Committed Organization · Voluntariado",
    text: "Seguimiento de proyectos y prototipos web, móviles e IoT.",
  },
  {
    period: "Nov 2024 — Feb 2025",
    role: "Pasante de Visión Computacional",
    place: "Grupo Moss",
    text: "Detección de personas en tiempo real con Python, OpenCV y YOLOv5.",
  },
  {
    period: "Ene 2024 — Feb 2024",
    role: "Pasante de Desarrollo Web",
    place: "Fibertel Networking",
    text: "Sitios corporativos, mejoras responsive y ajustes de usabilidad.",
  },
];

function Experience() {
  return (
    <section className="section container-wide" id="experiencia">
      <SectionHeader eyebrow={site.experience.eyebrow} title={site.experience.title} description={site.experience.text} />
      <div className="timeline">
        {items.map((item) => (
          <article className="timeline-item" key={`${item.role}-${item.period}`}>
            <div className="timeline-period">{item.period}</div>
            <div className="timeline-copy">
              <h3>{item.role}</h3>
              <strong>{item.place}</strong>
              <p>{item.text}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="education-band">
        <span>Formación</span>
        <div><strong>Ingeniería de Software</strong><p>UTP · Actualidad</p></div>
        <div><strong>Diseño y Desarrollo de Software</strong><p>TECSUP · 2022 — 2025 · Décimo superior</p></div>
      </div>
    </section>
  );
}

export default Experience;
