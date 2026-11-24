import React from "react";
import Icon from "../../shared/components/WorkspaceIcon.jsx";
import WorkspaceTheme from "../../theme/WorkspaceTheme.jsx";
import SystemNotifications from "../../shared/notifications/SystemNotifications.jsx";

export default function WorkspaceHeader({ user, sideOpen, setSideOpen, setSideCollapsed, signOut }) {
  return (
      <header className="private-topbar">
        <div className="private-header-group">
  <span className="private-topbar-title">Panel personal</span>
<div className="private-top-left">
          <button
            type="button"
            className="private-menu-toggle"
            onClick={() => setSideOpen(value => !value)}
            aria-label={sideOpen ? "Cerrar menu" : "Abrir menu"}
            aria-expanded={sideOpen}
            aria-controls="workspace-sidebar"
          >
            <svg width="21" height="21" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16"/>
            </svg>
          </button>
          <button
            type="button"
            className="private-desktop-toggle"
            onClick={() => setSideCollapsed(value => !value)}
            title="Expandir o contraer menu"
            aria-label="Expandir o contraer menu"
          >
            <svg width="19" height="19" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round">
              <rect x="3" y="4" width="18" height="16" rx="2"/>
              <path d="M9 4v16"/>
            </svg>
          </button>
        </div>
</div>


        <div className="private-top-actions">

          <WorkspaceTheme key={user.id} userId={user.id}/>
          <SystemNotifications userId={user?.id} />
          <button onClick={signOut}><Icon name="logout" size={17}/> Salir</button>
        </div>
      </header>
  );
}
