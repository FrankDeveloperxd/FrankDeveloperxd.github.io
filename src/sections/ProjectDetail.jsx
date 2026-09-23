import { useEffect } from "react";
import { FiArrowLeft, FiArrowUpRight } from "react-icons/fi";
import Navbar from "../components/Navbar";
import WhatsAppButton from "../components/WhatsAppButton";

function ProjectDetail({ project }) {
  useEffect(() => {
    if (!project) return undefined;
    const oldTitle = document.title;
    document.title = `${project.title} | Frank Bernaola`;
    return () => { document.title = oldTitle; };
  }, [project]);

  if (!project) return null;

  return (
    <div className="app-shell project-page">
      <Navbar detail />
      <main>
        <section className="project-detail-hero container-wide">
          <a className="back-link" href="/#proyectos"><FiArrowLeft /> Proyectos</a>

          <div className="project-detail-grid">
            <div>
              <span className="project-category">{project.category}</span>
              <h1>{project.title}</h1>
              <p>{project.description}</p>
              <div className="project-tags">{project.tags.slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}</div>
            </div>
            <div className="project-detail-meta">
              <div><span>Año</span><strong>{project.year}</strong></div>
              <div><span>Rol</span><strong>{project.role}</strong></div>
              <div><span>Estado</span><strong>{project.status}</strong></div>
            </div>
          </div>

          <img className="project-detail-cover" src={project.image} alt={`Vista principal de ${project.title}`} />
        </section>

        <section className="project-summary container-wide">
          <div>
            <span className="section-index">RESUMEN</span>
            <h2>Qué hice</h2>
          </div>
          <ul>
            {project.contribution.slice(0, 4).map((item) => <li key={item}>✔ {item}</li>)}
          </ul>
        </section>

        <section className="project-gallery-section container-wide">
          <div className="detail-copy-block"><span>CAPTURAS</span><h2>Proyecto</h2></div>
          <div className="project-gallery">
            {project.gallery.map((item, index) => {
              const image = typeof item === "string" ? { src: item, orientation: index === 0 ? "wide" : "landscape" } : item;
              return (
                <figure key={image.src} className={`project-gallery-item is-${image.orientation || "landscape"}`}>
                  <img src={image.src} alt={`${project.title} captura ${index + 1}`} loading="lazy" />
                </figure>
              );
            })}
          </div>
        </section>

        <section className="project-next container-wide">
          <div><span>PORTAFOLIO</span><h2>Más proyectos</h2></div>
          <a className="button button-primary" href="/#proyectos">Volver <FiArrowUpRight /></a>
        </section>
      </main>
      <WhatsAppButton />
    </div>
  );
}

export default ProjectDetail;
