import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import WhatsAppButton from "./components/WhatsAppButton";
import Hero from "./sections/Hero";
import FeaturedProjects from "./sections/FeaturedProjects";
import Capabilities from "./sections/Capabilities";
import GitHub from "./sections/GitHub";
import Stack from "./sections/Stack";
import Experience from "./sections/Experience";
import Contact from "./sections/Contact";
import ProjectDetail from "./sections/ProjectDetail";
import { getProjectBySlug } from "./data/projects";

function getRoute() {
  const match = window.location.hash.match(/^#\/project\/([^/?#]+)/);
  return match ? getProjectBySlug(match[1]) : null;
}

function App() {
  const [project, setProject] = useState(getRoute);

  useEffect(() => {
    const onHashChange = () => {
      setProject(getRoute());
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (project) return <ProjectDetail project={project} />;

  return (
    <div className="app-shell">
      <Navbar />
      <main>
        <Hero />
        <FeaturedProjects />
        <Capabilities />
        <Experience />
        <Stack />
        <GitHub />
        <Contact />
      </main>
      <WhatsAppButton />
    </div>
  );
}

export default App;
