import { useEffect, useRef, useState } from "react";
import { FiArrowUpRight, FiGithub } from "react-icons/fi";
import SectionHeader from "../components/SectionHeader";
import { site } from "../data/site";

const API = "https://api.github.com/users/FrankDeveloperxd/repos?sort=updated&per_page=8&type=owner";

function GitHub() {
  const sectionRef = useRef(null);
  const [repos, setRepos] = useState([]);
  const [state, setState] = useState("idle");
  const startedRef = useRef(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || startedRef.current) return;
      startedRef.current = true;
      setState("loading");
      fetch(API)
        .then((response) => {
          if (!response.ok) throw new Error("GitHub API error");
          return response.json();
        })
        .then((data) => {
          setRepos(data.filter((repo) => !repo.fork).slice(0, 3));
          setState("ready");
        })
        .catch(() => setState("error"));
      observer.disconnect();
    }, { rootMargin: "300px" });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="section container-wide" id="github" ref={sectionRef}>
      <SectionHeader eyebrow={site.github.eyebrow} title={site.github.title} description={site.github.text} />

      <div className="github-simple">
        <a className="github-profile-link" href="https://github.com/FrankDeveloperxd" target="_blank" rel="noreferrer">
          <FiGithub /> <strong>@FrankDeveloperxd</strong> <span>Ver perfil</span> <FiArrowUpRight />
        </a>

        <div className="github-repos-simple">
          {state === "loading" && <span className="github-state">Cargando…</span>}
          {state === "error" && <span className="github-state">GitHub no disponible temporalmente.</span>}
          {state === "ready" && repos.map((repo) => (
            <a key={repo.id} href={repo.html_url} target="_blank" rel="noreferrer">
              <strong>{repo.name}</strong>
              <span>{repo.language || "Repositorio"}</span>
              <FiArrowUpRight />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default GitHub;
