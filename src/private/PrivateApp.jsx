import { clearCachedProjectServices } from "./projectServicesCache.js";
import { useRef as useWorkspaceRef } from "react";
// WORKSPACE USER ISOLATION V1
import NoteShareControls from "./shared/NoteShareControls.jsx";
/* NOTE SHARING FIXED V2 */
import { Pencil, Trash2 } from "lucide-react";
import WorkspaceDialog from "./shared/WorkspaceDialog.jsx";
import "./shared/WorkspaceLayout.css";

/* PROJECTS UX FIXED V4 */
import KanbanBoard from "./components/KanbanBoard.jsx";
import NoteEditor from "./components/NoteEditor.jsx";
import ProjectServices from "./components/ProjectServices.jsx";
import WorkspaceToasts, { notifyWorkspace } from "./components/WorkspaceToasts.jsx";
import React, { useEffect, useState } from "react";
import { supabase } from "./client";
import "./private.css";
import "./private-workspace.css";
import "./private-glass.css";
import "./private-experience.css";
import "./private-navigation-v2.css";

const TABLES = {
  projects: "workspace_projects",
  boards: "workspace_boards",
  tasks: "workspace_tasks"
};

const LANES = [
  { id: "todo", title: "Por hacer" },
  { id: "doing", title: "En proceso" },
  { id: "done", title: "Terminado" }
];

const Icon = ({ name, size = 20 }) => {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    board: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/></>,
    folder: <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3Z"/>,
    arrow: <path d="m9 18 6-6-6-6"/>,
    back: <path d="m15 18-6-6 6-6"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    logout: <><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"/><path d="m14 8 4 4-4 4M9 12h9"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths[name] || paths.grid}
  </svg>;
};

function formatError(error) {
  return error?.message || "No se pudo completar la operación.";
}

export default function PrivateApp() {
  const [user, setUser] = useState(null);
  const lastWorkspaceOwner = useWorkspaceRef(null);
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("home");
  const [projects, setProjects] = useState([]);
  const [boards, setBoards] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const [board, setBoard] = useState(null);
  const [newName, setNewName] = useState("");
  const [newTask, setNewTask] = useState("");
  const [noteId, setNoteId] = useState(
    () => new URLSearchParams(window.location.search).get("nota")
  );
  const [sideOpen, setSideOpen] = useState(false);
  const [sideCollapsed, setSideCollapsed] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    let mounted = true;

    async function initialize() {
      const { data } = await supabase.auth.getUser();
      if (mounted) {
        setUser(data?.user || null);
        setReady(true);
      }
    }

    initialize();

    const { data } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) setUser(session?.user || null);
      }
    );

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);


  // Al cambiar de cuenta, no conservar datos del usuario anterior.
  useEffect(() => {
    const nextId = user?.id || null;
    const previousId = lastWorkspaceOwner.current;

    if (previousId && previousId !== nextId) {
      clearCachedProjectServices();
      setAuthorized(false);
      setProjects([]);
      setBoards([]);
      setTasks([]);
      setProject(null);
      setBoard(null);
      setView("home");
      setNoteId(null);
      setProjectDialog(null);
      setError("");

      const url = new URL(window.location.href);

      if (url.searchParams.has("nota")) {
        url.searchParams.delete("nota");

        window.history.replaceState(
          window.history.state,
          "",
          url.pathname + url.search + url.hash
        );
      }
    }

    lastWorkspaceOwner.current = nextId;
  }, [user?.id]);

  useEffect(() => {
    if (!user || !supabase) {
      setAuthorized(false);
      return;
    }

    let active = true;
    setAuthorized(false);
    supabase.from("workspace_owner")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        setAuthorized(Boolean(data) && !error);
        if (error) setError(formatError(error));
      });

    return () => { active = false; };
  }, [user]);

  async function loadProjects() {
    const { data, error } = await supabase
      .from(TABLES.projects)
      .select("*")
      .order("created_at", { ascending: true });
    if (error) setError(formatError(error));
    else setProjects(data || []);
  }

  async function loadBoards(projectId) {
    const { data, error } = await supabase
      .from(TABLES.boards)
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) setError(formatError(error));
    else setBoards(data || []);
  }

  async function loadTasks(boardId) {
    const { data, error } = await supabase
      .from(TABLES.tasks)
      .select("*")
      .eq("board_id", boardId)
      .order("created_at", { ascending: true });
    if (error) setError(formatError(error));
    else setTasks(data || []);
  }

  useEffect(() => {
    if (authorized) loadProjects();
  }, [authorized]);

  useEffect(() => {
    if (error && user && authorized) {
      notifyWorkspace("error", error);
    }
  }, [error, user, authorized]);
  useEffect(() => {
    function onHistoryChange() {
      setNoteId(new URLSearchParams(window.location.search).get("nota"));
    }

    window.addEventListener("popstate", onHistoryChange);
    return () => window.removeEventListener("popstate", onHistoryChange);
  }, []);

  function openWorkspaceNote(note) {
    const url = new URL(window.location.href);
    url.searchParams.set("nota", note.id);
    window.history.pushState({}, "", url);
    setNoteId(note.id);
  }

  function closeWorkspaceNote() {
    const url = new URL(window.location.href);
    url.searchParams.delete("nota");
    window.history.pushState({}, "", url);
    setNoteId(null);

    if (project) {
      openProject(project);
    } else {
      openProjects();
    }
  }
  /* WORKSPACE NOTE NAVIGATION FIX V1 */

  function leaveWorkspaceNote() {
    const url = new URL(window.location.href);

    if (url.searchParams.has("nota")) {
      url.searchParams.delete("nota");
      window.history.replaceState(
        window.history.state,
        "",
        url.pathname + url.search + url.hash
      );
    }

    setNoteId(null);
  }
  function openHome() {
    leaveWorkspaceNote();
    setView("home");
    setProject(null);
    setBoard(null);
    setError("");
  }

  function openProjects() {
    leaveWorkspaceNote();
    setView("projects");
    setProject(null);
    setBoard(null);
    loadProjects();
  }

  function openProject(value) {
    leaveWorkspaceNote();
    setProject(value);
    setBoard(null);
    setView("project");
    loadBoards(value.id);
  }

  function openBoard(value) {
    leaveWorkspaceNote();
    setBoard(value);
    setView("board");
    loadTasks(value.id);
  }

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(), password
    });
    if (error) setError("No se pudo iniciar sesión. Revisa tus credenciales.");
    setPassword("");
    setBusy(false);
  }

  async function signOut() {
    clearCachedProjectServices();
    await supabase.auth.signOut();
    setUser(null);
    setAuthorized(false);
    setProjects([]);
    setBoards([]);
    setTasks([]);
    openHome();
  }


  const [projectDialog, setProjectDialog] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [projectBusy, setProjectBusy] = useState(false);
  const [projectDialogClosing, setProjectDialogClosing] = useState(false);
  const [projectRemovingId, setProjectRemovingId] = useState(null);

  function showProjectRename(item) {
    setProjectName(item.title);
    setProjectDialogClosing(false);
    setProjectDialog({ mode: "rename", item });
  }

  function showProjectDelete(item) {
    setProjectDialogClosing(false);
    setProjectDialog({ mode: "delete", item });
  }

  function closeProjectDialog() {
    if (!projectBusy) setProjectDialog(null);
  }

  async function confirmProjectAction() {
    if (!projectDialog || projectBusy) return;

    const { mode, item } = projectDialog;
    setProjectBusy(true);
    setError("");

    if (mode === "rename") {
      const title = projectName.trim();

      if (!title) {
        setProjectBusy(false);
        return;
      }

      try {
        const { error: renameError } = await supabase
          .from(TABLES.projects)
          .update({ title })
          .eq("id", item.id)
          .eq("owner_id", user.id);

        if (renameError) throw renameError;

        setProjects(current => current.map(p =>
          p.id === item.id ? { ...p, title } : p
        ));

        setProject(current =>
          current?.id === item.id
            ? { ...current, title }
            : current
        );

        setProjectDialog(null);
        notifyWorkspace("success", "Proyecto actualizado.");
      } catch (err) {
        setError(formatError(err));
      } finally {
        setProjectBusy(false);
      }

      return;
    }

    // Animación de cierre sin bloquear la interfaz.
    setProjectDialogClosing(true);

    await new Promise(resolve => setTimeout(resolve, 130));

    setProjectDialog(null);
    setProjectDialogClosing(false);
    setProjectRemovingId(item.id);

    try {
      const { error: deleteError } = await supabase
        .from(TABLES.projects)
        .delete()
        .eq("id", item.id)
        .eq("owner_id", user.id);

      if (deleteError) throw deleteError;

      // Dejar visible brevemente la animación de salida.
      await new Promise(resolve => setTimeout(resolve, 160));

      setProjects(current =>
        current.filter(p => p.id !== item.id)
      );

      notifyWorkspace("success", "Proyecto eliminado.");
    } catch (err) {
      setError(formatError(err));
      notifyWorkspace(
        "error",
        "No se pudo eliminar. Comprueba las relaciones de la base de datos."
      );
    } finally {
      setProjectRemovingId(null);
      setProjectBusy(false);
    }
  }

  async function createProject(event) {
    event.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    const { error } = await supabase.from(TABLES.projects)
      .insert({ title: newName.trim(), owner_id: user.id });
    setBusy(false);
    if (error) return setError(formatError(error));
    setNewName("");
    await loadProjects();
    notifyWorkspace("success", "Proyecto creado correctamente.");
  }

  async function createBoard(event) {
    event.preventDefault();
    if (!newName.trim() || !project) return;
    setBusy(true);
    const { error } = await supabase.from(TABLES.boards)
      .insert({
        title: newName.trim(),
        project_id: project.id,
        owner_id: user.id
      });
    setBusy(false);
    if (error) return setError(formatError(error));
    setNewName("");
    await loadBoards(project.id);
    notifyWorkspace("success", "Tablero creado correctamente.");
  }

  async function createTask(event) {
    event.preventDefault();
    if (!newTask.trim() || !board) return;
    setBusy(true);
    const { error } = await supabase.from(TABLES.tasks)
      .insert({
        title: newTask.trim(),
        status: "todo",
        board_id: board.id,
        owner_id: user.id
      });
    setBusy(false);
    if (error) return setError(formatError(error));
    setNewTask("");
    await loadTasks(board.id);
    notifyWorkspace("success", "Tarea añadida al tablero.");
  }

  async function moveTask(task, status) {
    const { error } = await supabase.from(TABLES.tasks)
      .update({ status }).eq("id", task.id);
    if (error) return setError(formatError(error));
    setTasks(current => current.map(item =>
      item.id === task.id ? { ...item, status } : item
    ));
    notifyWorkspace("success", "Estado de la tarea actualizado.");
  }

  async function removeItem(table, id, reload) {
    if (!window.confirm("¿Eliminar este elemento y su contenido relacionado?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) setError(formatError(error));
    else {
      await reload();
      notifyWorkspace("success", "Elemento eliminado correctamente.");
    }
  }

  if (!supabase) return (
    <div className="private-root">
      <div className="private-login">
        <Icon name="lock" size={30}/>
        <h1>Configuración pendiente</h1>
        <p>Configura VITE_SUPABASE_URL y la clave publicable en .env.local.</p>
        <a href="/">Volver al portafolio</a>
      </div>
    </div>
  );

  if (!ready) return <div className="private-root private-loading">Cargando...</div>;

  if (!user) return (
    <main className="private-root private-login-page">
      <div className="private-login">
        <div className="private-brand"><Icon name="lock"/> ESPACIO PERSONAL</div>
        <h1>Tu espacio, tus proyectos.</h1>
        <p>Un panel privado para organizar todo lo que construyes.</p>
        <form onSubmit={signIn}>
          <label>Correo electrónico
            <input type="email" required autoComplete="username"
              value={email} onChange={e=>setEmail(e.target.value)}/>
          </label>
          <label>Contraseña
            <input type="password" required autoComplete="current-password"
              value={password} onChange={e=>setPassword(e.target.value)}/>
          </label>
          {error && <p className="private-error" role="alert">{error}</p>}
          <button className="private-primary" disabled={busy}>
            {busy ? "Ingresando..." : "Entrar a mi espacio"}
          </button>
        </form>
        <a href="/"> Volver al portafolio</a>
      </div>
    </main>
  );

  if (!authorized) return (
    <main className="private-root private-login-page">
      <div className="private-login">
        <Icon name="lock" size={30}/>
        <h1>Acceso restringido</h1>
        <p>Esta cuenta no está autorizada o falta configurar el propietario en Supabase.</p>
        {error && <p className="private-error">{error}</p>}
        <button className="private-primary" onClick={signOut}>Cerrar sesión</button>
      </div>
    </main>
  );

  return (
    <div className="private-root">
      <WorkspaceToasts />
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

          <button onClick={signOut}><Icon name="logout" size={17}/> Salir</button>
        </div>
      </header>

      <div className={`private-workspace-layout ${sideCollapsed ? "is-collapsed" : ""}`}>
        {sideOpen && (
          <button
            className="private-sidebar-overlay"
            type="button"
            aria-label="Cerrar menu lateral"
            onClick={() => setSideOpen(false)}
          />
        )}

        <aside
          id="workspace-sidebar"
          className={`private-sidebar ${sideOpen ? "is-open" : ""}`}
          aria-label="Navegacion del espacio privado"
        >
          <div className="private-sidebar-brand">
            <div className="private-sidebar-mark">
              <Icon name="grid" size={22}/>
            </div>
            <div className="private-sidebar-brand-copy">
              <strong>Mi Workspace</strong>
              <small>Espacio personal</small>
            </div>
          </div>

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
              className={`private-sidebar-link ${view !== "home" ? "active" : ""}`}
              onClick={() => {
                openProjects();
                setSideOpen(false);
              }}
              title="Proyectos"
            >
              <Icon name="board" size={19}/>
              <span>Proyectos</span>
            </button>
          </nav>

          <div className="private-sidebar-group-label">PROYECTOS</div>

          <div className="private-sidebar-projects">
            {projects.slice(0, 8).map(item => (
              <button
                type="button"
                key={item.id}
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

          <div className="private-sidebar-bottom">
            <div className="private-sidebar-group-label">PROXIMAMENTE</div>
            <div className="private-sidebar-upcoming">
              <Icon name="plus" size={18}/>
              <span>Mas modulos</span>
            </div>
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

        <div className="private-content">
          <main className="private-main">

{noteId && (
  <>
    <NoteShareControls noteId={noteId} user={user}/>
    <NoteEditor
                key={noteId}
                noteId={noteId}
                onBack={closeWorkspaceNote}
              />
  </>
)}

        <nav className="private-crumbs" aria-label="Ubicación">
          <button onClick={openHome}>Inicio</button>
          {view !== "home" && <>
            <Icon name="arrow" size={14}/>
            <button onClick={openProjects}>Kanban</button>
          </>}
          {project && <>
            <Icon name="arrow" size={14}/>
            <button onClick={()=>openProject(project)}>{project.title}</button>
          </>}
          {board && <>
            <Icon name="arrow" size={14}/>
            <span>{board.title}</span>
          </>}
        </nav>

            {!noteId && view === "board" && board && (
              <KanbanBoard
                key={board.id}
                board={board}
                user={user}
              />
            )}

        {error && <div className="private-error-banner" role="alert">
          {error}
          <button onClick={()=>setError("")}>Cerrar</button>
        </div>}

        {!noteId && view === "home" && <>
          <div className="private-hero">
            <span className="private-kicker">PANEL PERSONAL</span>
            <h1>Un espacio para todas tus ideas.</h1>
            <p>Organiza tus herramientas y proyectos desde un solo lugar.</p>
          </div>
          <h2 className="private-section-title">Mis módulos</h2>
          <div className="private-modules">
            <button className="private-module" onClick={openProjects}>
              <span className="private-module-icon"><Icon name="board" size={29}/></span>
              <strong>Proyectos</strong>
              <small>Administra tus proyectos y sus tableros de trabajo.</small>
              <span className="private-module-link">Abrir módulo </span>
            </button>
            <div className="private-module private-module-future">
              <span className="private-module-icon"><Icon name="plus" size={29}/></span>
              <strong>Próximos módulos</strong>
              <small>Este dashboard crecerá contigo.</small>
            </div>
          </div>
        </>}

        {!noteId && view === "projects" && <>

            <WorkspaceDialog
              mode={projectDialog?.mode}
              item={projectDialog?.item}
              value={projectName}
              onChange={setProjectName}
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
                  (projectRemovingId === item.id ? " pux-removing" : "")
                }
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
                <span className="private-card-icon">
                  <Icon name="folder"/>
                </span>

                <h3>{item.title}</h3>
                <p>Espacio de proyecto</p>

                <div className="private-card-actions pux-actions">
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
        </>}

        {!noteId && view === "project" && project && (
          <ProjectServices key={project.id} project={project}
            user={user}
            onOpenBoard={openBoard}
            onOpenNote={openWorkspaceNote}
          />
        )}

        {false && view === "board" && board && <>
          <div className="private-page-heading">
            <div>
              <span className="private-kicker">TABLERO KANBAN</span>
              <h1>{board.title}</h1>
              <p>Organiza actividades dentro de este tablero.</p>
            </div>
          </div>
          <form className="private-create" onSubmit={createTask}>
            <input aria-label="Nueva tarea" placeholder="¿Qué necesitas hacer?"
              value={newTask} onChange={e=>setNewTask(e.target.value)} required/>
            <button className="private-primary" disabled={busy}>
              <Icon name="plus" size={17}/> Añadir tarea
            </button>
          </form>
          <div className="private-board">
            {LANES.map((lane,index)=><section key={lane.id} className="private-lane">
              <h2><span className={`private-dot private-dot-${lane.id}`}/>
                {lane.title}
                <small>{tasks.filter(t=>t.status===lane.id).length}</small>
              </h2>
              <div className="private-lane-content">
                {tasks.filter(t=>t.status===lane.id).map(task=>
                  <article className="private-task" key={task.id}>
                    <strong>{task.title}</strong>
                    <div className="private-task-actions">
                      {index>0 && <button onClick={()=>moveTask(task,LANES[index-1].id)}> Atrás</button>}
                      {index<2 && <button onClick={()=>moveTask(task,LANES[index+1].id)}>Avanzar </button>}
                      <button aria-label="Eliminar tarea" onClick={()=>removeItem(TABLES.tasks,task.id,()=>loadTasks(board.id))}>
                        <Icon name="trash" size={15}/>
                      </button>
                    </div>
                  </article>
                )}
                {!tasks.some(t=>t.status===lane.id) && <div className="private-lane-empty">Sin tareas</div>}
              </div>
            </section>)}
          </div>
        </>}
          </main>
        </div>
      </div>
    </div>
  );
}
