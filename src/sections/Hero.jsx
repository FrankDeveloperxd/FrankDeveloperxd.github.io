import { FiArrowDownRight, FiDownload } from "react-icons/fi";
import { site } from "../data/site";

function Hero() {
  return (
    <section className="hero" id="inicio">
      <div className="hero-inner container-wide">
        <div className="hero-copy">
          <p className="hero-kicker">{site.hero.eyebrow}</p>
          <h1>{site.hero.title}</h1>
          <p className="hero-lead">{site.hero.text}</p>

          <div className="hero-actions">
            <a className="button button-primary" href="#proyectos">
              Proyectos <FiArrowDownRight />
            </a>
            <a className="button button-ghost" href="/cv/Frank-Bernaola-CV.pdf" target="_blank" rel="noreferrer">
              <FiDownload /> CV
            </a>
          </div>

          <div className="hero-meta" aria-label="Especialidades">
            <span>Full Stack</span>
            <span>React / .NET</span>
            <span>Android</span>
            <span>Realtime / IoT</span>
          </div>
        </div>

        <a className="hero-feature" href="#/project/modcontrol" aria-label="Ver proyecto MODCONTROL">
          <img src={site.hero.image} alt={`Vista previa de ${site.hero.imageTitle}`} />
          <div className="hero-feature-caption">
            <strong>{site.hero.imageTitle}</strong>
            <span>{site.hero.imageMeta}</span>
          </div>
        </a>
      </div>
    </section>
  );
}

export default Hero;
