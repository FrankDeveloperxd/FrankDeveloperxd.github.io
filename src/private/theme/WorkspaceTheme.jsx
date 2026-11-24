import React, { useLayoutEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import './WorkspaceTheme.css';
import './WorkspaceVisualCorrections.css';
import './WorkspaceKanbanPolish.css';

export function readWorkspaceTheme(owner) {
  try { return localStorage.getItem(`workspace-panel-theme:${owner}`) === 'tinta' ? 'tinta' : 'light'; }
  catch { return 'light'; }
}
export default function WorkspaceTheme({ userId }) {
  const [mode, setMode] = useState(() => readWorkspaceTheme(userId));
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute('data-workspace-theme');
    root.setAttribute('data-workspace-theme', mode);
    try { localStorage.setItem(`workspace-panel-theme:${userId}`, mode); } catch {}
    return () => {
      if(previous === null) root.removeAttribute('data-workspace-theme');
      else root.setAttribute('data-workspace-theme', previous);
    };
  }, [mode, userId]);
  function changeTheme() {
    setMode(current => current === 'tinta' ? 'light' : 'tinta');
  }
  const dark = mode === 'tinta';
  return <button type="button" className="workspace-theme-toggle" aria-pressed={dark}
    aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    title={dark ? 'Modo claro' : 'Modo oscuro'} onClick={changeTheme}>
    <span className="workspace-theme-icons" aria-hidden="true">
      <Sun className="theme-sun" size={19} strokeWidth={2}/>
      <Moon className="theme-moon" size={19} strokeWidth={2}/>
    </span>
  </button>;
}
