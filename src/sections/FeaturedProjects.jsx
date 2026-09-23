import SectionHeader from "../components/SectionHeader";
import ProjectCard from "../components/ProjectCard";
import { projects } from "../data/projects";
import { site } from "../data/site";

function FeaturedProjects() {
  const featured = projects.filter((project) => project.featured).slice(0, 4);
  const archive = projects.filter((project) => !featured.some((item) => item.slug === project.slug));

  return (
    <section className="section container-wide" id="proyectos">
      <SectionHeader eyebrow={site.projects.eyebrow} title={site.projects.title} description={site.projects.text} />

      <div className="projects-grid">
        {featured.map((project) => <ProjectCard key={project.slug} project={project} />)}
      </div>

      {archive.length > 0 && (
        <div className="project-archive">
          <div className="project-archive-title">
            <h3>Más proyectos</h3>
            <span>{archive.length} proyectos</span>
          </div>
          <div className="project-archive-grid">
            {archive.map((project) => <ProjectCard key={project.slug} project={project} compact />)}
          </div>
        </div>
      )}
    </section>
  );
}

export default FeaturedProjects;
