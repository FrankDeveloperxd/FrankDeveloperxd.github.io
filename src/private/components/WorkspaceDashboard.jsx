import React from "react";
import { Columns3, CalendarDays, Target } from "lucide-react";
import WorkspaceActivity from "./WorkspaceActivity.jsx";
import "./WorkspaceDashboard.css";

export default function WorkspaceDashboard({ userId, projects = [] }) {
  const modules = [
    {
      id: "projects",
      name: "Proyectos",
      description: "Proyectos, tableros y notas.",
      icon: Columns3
    },
    {
      id: "calendar",
      name: "Calendario",
      description: "Tus eventos y próximos planes.",
      icon: CalendarDays
    },
    {
      id: "habits",
      name: "Hábitos",
      description: "Tu rutina y progreso diario.",
      icon: Target
    }
  ];

  return (
    <section className="wd-dashboard" aria-labelledby="wd-modules-title">
      <h2 id="wd-modules-title" className="wd-heading">Mis módulos</h2>

      <div className="wd-modules">
        {modules.map(item => {
          const Icon = item.icon;
          return (
            <article className={`wd-card wd-card-${item.id}`} key={item.id}>
              <span className="wd-icon">
                <Icon size={23} strokeWidth={2} aria-hidden="true"/>
              </span>
              <div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          );
        })}
      </div>

      <WorkspaceActivity userId={userId} projects={projects}/>
    </section>
  );
}