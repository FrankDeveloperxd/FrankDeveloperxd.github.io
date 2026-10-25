import React, { useEffect, useState } from 'react';
import Icon from '../../shared/Icons.jsx';
import { navigate } from '../../shared/navigation.js';

const initialSpaces = [
  { id: 1, name: 'Personal', projects: ['Mis ideas'] },
  { id: 2, name: 'PatoDev', projects: ['Plancito'] },
];

function loadSpaces() {
  try {
    const stored = JSON.parse(localStorage.getItem('franklabs-espacios') || 'null');
    return Array.isArray(stored) ? stored : initialSpaces;
  } catch {
    return initialSpaces;
  }
}

export default function SpacesTool() {
  const [spaces, setSpaces] = useState(loadSpaces);
  const [selected, setSelected] = useState(1);
  const [newSpace, setNewSpace] = useState('');
  const [project, setProject] = useState('');

  useEffect(() => {
    localStorage.setItem('franklabs-espacios', JSON.stringify(spaces));
  }, [spaces]);

  const active = spaces.find((space) => space.id === selected) || spaces[0];

  function addSpace(event) {
    event.preventDefault();
    if (!newSpace.trim()) return;
    const id = Date.now();
    setSpaces((current) => [
      ...current,
      { id, name: newSpace.trim(), projects: [] },
    ]);
    setSelected(id);
    setNewSpace('');
  }

  function addProject(event) {
    event.preventDefault();
    if (!project.trim() || !active) return;
    setSpaces((current) => current.map((space) =>
      space.id === active.id
        ? { ...space, projects: [...space.projects, project.trim()] }
        : space
    ));
    setProject('');
  }

  return (
    <div className="spaces-layout">
      <aside className="space-sidebar">
        <h3>Espacios</h3>
        {spaces.map((space) => (
          <button
            key={space.id}
            className={selected === space.id ? 'active' : ''}
            onClick={() => setSelected(space.id)}
          >
            <Icon name="space" size={18} />
            {space.name}
          </button>
        ))}
        <form onSubmit={addSpace}>
          <input
            value={newSpace}
            onChange={(event) => setNewSpace(event.target.value)}
            placeholder="Nuevo espacio"
          />
          <button type="submit" title="Agregar espacio">
            <Icon name="plus" size={18} />
          </button>
        </form>
      </aside>
      <div className="spaces-content">
        <p className="labs-subtle">Espacio de trabajo</p>
        <h2>{active?.name ?? 'Sin espacios'}</h2>
        <h3>Proyectos</h3>
        <div className="space-projects">
          {(active?.projects || []).map((name, index) => (
            <div className="space-project" key={`${name}-${index}`}>
              <Icon name="kanban" size={24} />
              <strong>{name}</strong>
              <small>Tablero · Notas · Tareas</small>
            </div>
          ))}
        </div>
        <form className="task-form" onSubmit={addProject}>
          <input
            value={project}
            onChange={(event) => setProject(event.target.value)}
            placeholder="Nombre del proyecto"
          />
          <button className="labtool-primary" type="submit">Agregar proyecto</button>
        </form>
        <button className="labtool-link" onClick={() => navigate('kanban')}>
          Abrir tablero Kanban <Icon name="arrow" size={16} />
        </button>
      </div>
    </div>
  );
}
