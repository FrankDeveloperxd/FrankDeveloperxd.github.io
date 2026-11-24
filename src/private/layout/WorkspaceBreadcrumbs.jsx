import React from "react";

export default function WorkspaceBreadcrumbs({ view, project, board, noteId, openHome, openProjects, openProject }) {
  return (
        <div className="workspace-breadcrumb-slot">
          <nav
          className="workspace-pathbar"
          aria-label="Ruta de navegacion"
        >
          <button
            type="button"
            className="workspace-pathbar-home"
            onClick={openHome}
          >
            Inicio
          </button>

          {view === "vault" ? (
            <><span className="workspace-pathbar-separator" aria-hidden="true">›</span><span className="workspace-pathbar-current">Bóveda</span></>
          ) : view === "habits" ? (
            <><span className="workspace-pathbar-separator" aria-hidden="true">›</span><span className="workspace-pathbar-current">Hábitos</span></>
          ) : view === "calendar" ? (
            <><span className="workspace-pathbar-separator" aria-hidden="true">›</span><span className="workspace-pathbar-current">Calendario</span></>
          ) : view !== "home" && (
            <>
              <span className="workspace-pathbar-separator" aria-hidden="true">›</span>
              <button type="button" className="workspace-pathbar-projects" onClick={openProjects}>Proyectos</button>
            </>
          )}

          {project && (
            <>
              <span className="workspace-pathbar-separator" aria-hidden="true">›</span>
              <button
                type="button"
                className="workspace-pathbar-project"
                onClick={() => openProject(project)}
                title={project.title}
              >
                {project.title}
              </button>
            </>
          )}

          {board && !noteId && (
            <>
              <span className="workspace-pathbar-separator" aria-hidden="true">›</span>
              <span className="workspace-pathbar-current" title={board.title}>
                {board.title}
              </span>
            </>
          )}
        {noteId && (
              <>
                <span className="workspace-pathbar-separator" aria-hidden="true">›</span>
                <span className="workspace-pathbar-current">Bloc de notas</span>
              </>
            )}
          </nav>
        </div>
  );
}
