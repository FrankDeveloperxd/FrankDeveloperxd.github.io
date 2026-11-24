import React from "react";
import { CalendarDays, Target } from "lucide-react";
import Icon from "../../shared/components/WorkspaceIcon.jsx";

export default function WorkspaceSidebar({ sideOpen, setSideOpen, setSideCollapsed, view, openHome, openProjects, openCalendar, openHabits, openVault, projects, projectCovers, project, openProject, signOut }) {
  return (
        <aside
          id="workspace-sidebar"
          className={`private-sidebar ${sideOpen ? "is-open" : ""}`}
          aria-label="Navegacion del espacio privado"
        >
          <div className="private-sidebar-scroll">

          {/* WORKSPACE BRAND TOGGLE V1 */}
          <button
            type="button"
            className="private-sidebar-brand"
            aria-label="Alternar menú lateral"
            title="Plegar o desplegar menú"
            onClick={() => {
              if (window.matchMedia("(max-width: 800px)").matches) {
                setSideOpen(value => !value);
              } else {
                setSideCollapsed(value => !value);
              }
            }}
          >
            <span className="private-sidebar-mark">
              <Icon name="grid" size={22}/>
            </span>
            <span className="private-sidebar-brand-copy">
              <strong>Mi Workspace</strong>
              <small>Espacio personal</small>
            </span>
          
          </button>

          <div className="private-sidebar-group-label">GENERAL</div>

          <nav className="private-sidebar-nav">
            <button
              type="button"
              className={`private-sidebar-link ${view === "home" ? "active" : ""}`}
              onClick={() => {
                openHome();
                setSideOpen(false);
              }}
              title="Dashboard"
            >
              <Icon name="grid" size={19}/>
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              className={`private-sidebar-link ${["projects", "project", "board"].includes(view) ? "active" : ""}`}
              onClick={() => {
                openProjects();
                setSideOpen(false);
              }}
              title="Proyectos"
            >
              <Icon name="board" size={19}/>
              <span>Proyectos</span>
            </button>
            <button type="button"
              className={`private-sidebar-link ${view === "calendar" ? "active" : ""}`}
              onClick={openCalendar} title="Calendario">
              <CalendarDays size={19}/><span>Calendario</span>
            </button>
                      <button
              type="button"
              className={`private-sidebar-link ${view === "habits" ? "active" : ""}`}
              onClick={openHabits}
              title="Hábitos"
            >
              <Target size={19}/>
              <span>Hábitos</span>
            </button>
            <button
              type="button"
              className={`private-sidebar-link ${view === "vault" ? "active" : ""}`}
              onClick={openVault}
              title="Bóveda"
            >
              <Icon name="lock" size={19}/>
              <span>Bóveda</span>
            </button>
          </nav>

          <div className="private-sidebar-group-label">PROYECTOS</div>

          <div className="private-sidebar-projects">
            {projects.map(item => (
              <button
                type="button"
                key={item.id}
                style={{
                  "--folder-accent":
                    projectCovers[item.id]?.folderColor || "#0a84ff"
                }}
                className={`private-sidebar-link private-project-link ${
                  project?.id === item.id ? "active-project" : ""
                }`}
                title={item.title}
                onClick={() => {
                  openProject(item);
                  setSideOpen(false);
                }}
              >
                <Icon name="folder" size={17}/>
                <span>{item.title}</span>
              </button>
            ))}

            <button
              type="button"
              className="private-sidebar-link private-add-link"
              onClick={() => {
                openProjects();
                setSideOpen(false);
              }}
            >
              <Icon name="plus" size={17}/>
              <span>Gestionar proyectos</span>
            </button>
          </div>

          
<div className="private-sidebar-group-label">PROXIMAMENTE</div>
            <div className="private-sidebar-upcoming">
              <Icon name="plus" size={18}/>
              <span>Mas modulos</span>
            </div>
          </div>

          <div className="private-sidebar-bottom">
<button
              type="button"
              className="private-sidebar-logout"
              onClick={signOut}
            >
              <Icon name="logout" size={17}/>
              <span>Cerrar sesion</span>
            </button>
          </div>
        </aside>
  );
}
