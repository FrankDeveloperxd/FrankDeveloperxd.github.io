import React from "react";
import { Palette, Pencil, Trash2 } from "lucide-react";
import Icon from "../../shared/components/WorkspaceIcon.jsx";
import WorkspaceDialog from "../../shared/feedback/WorkspaceDialog.jsx";
import ProjectCoverEditor from "./appearance/ProjectCoverEditor.jsx";

export default function WorkspaceProjects({ coverEditing, projectCovers, setCoverEditing, saveProjectCover, projectDialog, projectName, setProjectName, error, closeProjectDialog, confirmProjectAction, projectBusy, projectDialogClosing, createProject, newName, setNewName, busy, projects, projectRemovingId, openProject, showProjectRename, showProjectDelete }) {
  return (
    <>
            {coverEditing && (
              <ProjectCoverEditor
                key={coverEditing.id}
                project={coverEditing}
                initial={projectCovers[coverEditing.id]}
                onClose={() => setCoverEditing(null)}
                onSave={saveProjectCover}
              />
            )}

            <WorkspaceDialog
              mode={projectDialog?.mode}
              item={projectDialog?.item}
              value={projectName}
              onChange={setProjectName}
              error={error}
              onClose={closeProjectDialog}
              onConfirm={confirmProjectAction}
              busy={projectBusy}
              closing={projectDialogClosing}
            />

          <div className="private-page-heading">
            <div>
              <span className="private-kicker">MIS PROYECTOS</span>
              <h1>Mis proyectos</h1>
              <p>Organiza tus proyectos, tableros y documentos.</p>
            </div>
          </div>
          <form className="private-create" onSubmit={createProject}>
            <input aria-label="Nombre del proyecto" placeholder="Nombre del nuevo proyecto"
              value={newName} onChange={e=>setNewName(e.target.value)} required/>
            <button className="private-primary" disabled={busy}>
              <Icon name="plus" size={17}/> Crear proyecto
            </button>
          </form>
          <div className="private-cards">

            {projects.map(item => (
              <article
                key={item.id}
                className={
                  "private-card pux-project-card" +
                  (projectRemovingId === item.id ? " pux-removing" : "") + ((projectCovers[item.id]?.color || projectCovers[item.id]?.image) ? " pux-with-cover" : "")
                }
                style={(projectCovers[item.id]?.color || projectCovers[item.id]?.image) ? {
                  backgroundColor: projectCovers[item.id].color,
                  backgroundImage: projectCovers[item.id].image
                    ? `linear-gradient(180deg,rgba(7,18,36,.12),rgba(7,18,36,.85)),url("${projectCovers[item.id].image}")`
                    : "linear-gradient(180deg,rgba(7,18,36,.08),rgba(7,18,36,.65))"
                } : undefined}
                role="link"
                tabIndex={0}
                aria-label={`Abrir proyecto ${item.title}`}
                onClick={() => {
                  if (projectRemovingId !== item.id) {
                    openProject(item);
                  }
                }}
                onKeyDown={event => {
                  if (event.target !== event.currentTarget) return;

                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (projectRemovingId !== item.id) {
                      openProject(item);
                    }
                  }
                }}
              >
                <span
                  className="private-card-icon"
                  style={{
                    "--folder-accent":
                      projectCovers[item.id]?.folderColor || "#805ad5"
                  }}
                >
                  <Icon name="folder"/>
                </span>

                <h3>{item.title}</h3>
                <p>Espacio de proyecto</p>

                <div className="private-card-actions pux-actions">
                  <button
                    type="button"
                    className="pux-cover-button"
                    title="Personalizar fondo"
                    aria-label={`Personalizar ${item.title}`}
                    onClick={event => {
                      event.stopPropagation();
                      setCoverEditing(item);
                    }}
                  >
                    <Palette size={17}/>
                  </button>
                  <button
                    type="button"
                    className="pux-edit"
                    title="Editar nombre"
                    aria-label={`Editar ${item.title}`}
                    onClick={event => {
                      event.stopPropagation();
                      showProjectRename(item);
                    }}
                  >
                    <Pencil size={17}/>
                  </button>

                  <button
                    type="button"
                    className="pux-delete"
                    title="Eliminar proyecto"
                    aria-label={`Eliminar ${item.title}`}
                    onClick={event => {
                      event.stopPropagation();
                      showProjectDelete(item);
                    }}
                  >
                    <Trash2 size={17}/>
                  </button>
                </div>
              </article>
            ))}

          </div>
          {!projects.length && <p className="private-empty">Crea tu primer proyecto para comenzar.</p>}
    </>
  );
}
