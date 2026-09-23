import { FiArrowUpRight } from "react-icons/fi";

function ProjectCard({ project, compact = false }) {
  return (
    <article className={`project-card ${compact ? "project-card-compact" : ""}`}>
      <a className="project-cover" href={`#/project/${project.slug}`} aria-label={`Ver ${project.title}`}>
        <img src={project.image} alt={`Vista previa de ${project.title}`} loading="lazy" />
      </a>

      <div className="project-content">
        <div className="project-topline">
          <span className="project-category">{project.category}</span>
          {!compact && <span className="project-status">{project.status}</span>}
        </div>
        <h3>{project.title}</h3>
        {!compact && <p>{project.description}</p>}
        <div className="project-footer">
          <div className="project-tags">
            {project.tags.slice(0, compact ? 2 : 3).map((tag) => <span key={tag}>{tag}</span>)}
          </div>
          <a href={`#/project/${project.slug}`} className="project-link" aria-label={`Abrir ${project.title}`}>
            <FiArrowUpRight />
          </a>
        </div>
      </div>
    </article>
  );
}

export default ProjectCard;
