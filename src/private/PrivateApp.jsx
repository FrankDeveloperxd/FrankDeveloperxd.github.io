import "./theme/WorkspaceTheme.jsx";
import WorkspaceDashboard from "./modules/dashboard/WorkspaceDashboard.jsx";
import { confirmWorkspace } from "./shared/feedback/workspaceFeedback.js";
/* WORKSPACE FAST NAVIGATION V1 */
import { clearCachedTasks } from "./modules/projects/kanban/workspaceTaskCache.js";
import { useNoteImageCleanup } from "./modules/notes/noteImageCleanup.js";

import { loadProjectAppearances, saveProjectAppearance } from "./modules/projects/appearance/projectAppearance.js";
import {
  hasCachedWorkspaceAccess,
  rememberWorkspaceAccess,
  clearWorkspaceAccess
} from "./auth/workspaceAuthorizationCache.js";
import { clearCachedProjectServices } from "./modules/projects/services/projectServicesCache.js";
import { useRef as useWorkspaceRef } from "react";
// WORKSPACE USER ISOLATION V1
import NoteShareControls from "./modules/notes/sharing/NoteShareControls.jsx";
/* NOTE SHARING FIXED V2 */

import "./shared/feedback/WorkspaceDialog.jsx";
import "./layout/WorkspaceLayout.css";
import "./layout/WorkspaceCompactCards.css";
import "./layout/WorkspaceBreadcrumbs.css";
import "./modules/notes/NoteHeaderCompact.css";

/* PROJECTS UX FIXED V4 */
import ProjectServices from "./modules/projects/services/ProjectServices.jsx";
import "./modules/projects/appearance/ProjectCoverEditor.jsx";
import WorkspaceToasts, { notifyWorkspace } from "./shared/notifications/WorkspaceToasts.jsx";
import "./shared/notifications/SystemNotifications.jsx";
import React, { useEffect, useState } from "react";
import { supabase } from "./shared/services/client";
import "./styles/private.css";
import "./styles/private-workspace.css";
import "./styles/private-glass.css";
import "./styles/private-experience.css";
import "./layout/private-navigation-v2.css";
import "./styles/private-mobile-refinement.css";
import "./layout/SidebarFixedFooter.css";
import "./styles/WorkspaceResponsive.css";
import "./modules/habits/WorkspaceHabits.css";
import { clearHabitsCache } from "./modules/habits/WorkspaceHabitsCache.js";
import Icon from "./shared/components/WorkspaceIcon.jsx";
import lazyWorkspaceModule from "./shared/components/lazyWorkspaceModule.jsx";
import WorkspaceAccess from "./auth/components/WorkspaceAccess.jsx";
import WorkspaceHeader from "./layout/header/WorkspaceHeader.jsx";
import WorkspaceSidebar from "./layout/sidebar/WorkspaceSidebar.jsx";
import WorkspaceBreadcrumbs from "./layout/WorkspaceBreadcrumbs.jsx";
import WorkspaceProjects from "./modules/projects/WorkspaceProjects.jsx";

const BovedaInicio = React.lazy(
  () => import("./modules/vault/BovedaInicio.jsx")
);

function BovedaSesion({ user, active }) {
  const [visited, setVisited] = useState(active);

  useEffect(() => {
    if (active) setVisited(true);
  }, [active]);

  if (!visited && !active) return null;

  return (
    <React.Suspense fallback={
      active ? <div role="status">Cargando herramienta...</div> : null
    }>
      <BovedaInicio user={user} active={active}/>
    </React.Suspense>
  );
}

const WorkspaceHabits = lazyWorkspaceModule(() => import("./modules/habits/WorkspaceHabits.jsx"));
const KanbanBoard = lazyWorkspaceModule(() => import("./modules/projects/kanban/KanbanBoard.jsx"));
const NoteEditor = lazyWorkspaceModule(() => import("./modules/notes/NoteEditor.jsx"));
const WorkspaceCalendar = lazyWorkspaceModule(() => import("./modules/calendar/WorkspaceCalendar.jsx"));



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



function formatError(error) {
  return error?.message || "No se pudo completar la operación.";
}

export default function PrivateApp() {
  const [user, setUser] = useState(null);
  useNoteImageCleanup(user?.id);
  const lastWorkspaceOwner = useWorkspaceRef(null);
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  /* WORKSPACE ROUTE PERSISTENCE V1 */
  const [view, setView] = useState(() => {
    const route = new URLSearchParams(window.location.search).get("vista");
    return ["calendar", "projects", "habits", "vault"].includes(route) ? route : "home";
  });
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

  // SESSION RESTORE V2
  // Supabase emite INITIAL_SESSION al restaurar la sesion.
  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    let mounted = true;
    let previousUserId;

    const { data } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;

        const nextUser = session?.user || null;
        const nextUserId = nextUser?.id || null;

        if (previousUserId !== nextUserId) {
          setAuthorized(
            hasCachedWorkspaceAccess(nextUserId) ? true : null
          );
          previousUserId = nextUserId;
        }

        setUser(nextUser);
        setReady(true);
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
      clearCachedTasks(); clearHabitsCache();
      setAuthorized(
        hasCachedWorkspaceAccess(nextId) ? true : null
      );
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

  // Validar una vez por identidad, sin bloquear cada recarga
  // cuando Supabase restaura una sesion ya autorizada.
  useEffect(() => {
    if (!user?.id || !supabase) {
      setAuthorized(null);
      return;
    }

    const userId = user.id;
    let active = true;

    // Mostrar el workspace inmediatamente si este usuario
    // ya fue autorizado antes en este navegador.
    setAuthorized(
      hasCachedWorkspaceAccess(userId) ? true : null
    );

    supabase
      .from("workspace_owner")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;

        if (error) {
          // Un fallo de red no significa revocacion de acceso.
          setError(error.message);
          if (!hasCachedWorkspaceAccess(userId)) {
            setAuthorized(false);
          }
          return;
        }

        if (data?.user_id === userId) {
          rememberWorkspaceAccess(userId);
          setAuthorized(true);
          setError("");
        } else {
          clearWorkspaceAccess(userId);
          clearCachedProjectServices();
      clearCachedTasks(); clearHabitsCache();
          setAuthorized(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  async function loadProjects() {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from(TABLES.projects)
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true });
    if (error) setError(formatError(error));
    else setProjects(data || []);
  }

  async function loadBoards(projectId) {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from(TABLES.boards)
      .select("*")
      .eq("project_id", projectId)
      .eq("owner_id", user.id)
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
    if (authorized && user?.id) void loadProjects();
  }, [authorized, user?.id]);

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
  function rememberWorkspaceRoute(nextView, projectId = null, boardId = null) {
    const url = new URL(window.location.href);
    for (const name of ["vista", "proyecto", "tablero"]) url.searchParams.delete(name);
    if (nextView !== "home") url.searchParams.set("vista", nextView);
    if (projectId) url.searchParams.set("proyecto", projectId);
    if (boardId) url.searchParams.set("tablero", boardId);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }

  // Restore only after login; Supabase RLS verifies that these IDs belong to the account.
  useEffect(() => {
    if (!authorized || !user?.id || !supabase) return;
    const params = new URLSearchParams(window.location.search);
    const nextView = params.get("vista");
    const projectId = params.get("proyecto");
    const boardId = params.get("tablero");
    if (["calendar", "projects", "habits", "vault"].includes(nextView)) {
      setView(nextView);
      return;
    }
    if (nextView !== "project" && nextView !== "board") return;
    if (!projectId) return;
    let active = true;
    (async () => {
      const { data: item, error: projectError } = await supabase
        .from(TABLES.projects).select("*")
        .eq("id", projectId).eq("owner_id", user.id).maybeSingle();
      if (!active) return;
      if (projectError || !item) {
        rememberWorkspaceRoute("projects");
        setView("projects");
        return;
      }
      setProject(item);
      // ProjectServices carga los servicios del proyecto.
      if (!active) return;
      if (nextView === "project") {
        setView("project");
        return;
      }
      if (!boardId) {
        setView("project");
        rememberWorkspaceRoute("project", item.id);
        return;
      }
      const { data: restoredBoard, error: boardError } = await supabase
        .from(TABLES.boards).select("*")
        .eq("id", boardId).eq("project_id", item.id).maybeSingle();
      if (!active) return;
      if (boardError || !restoredBoard) {
        setView("project");
        rememberWorkspaceRoute("project", item.id);
        return;
      }
      setBoard(restoredBoard);
      setView("board");
      // KanbanBoard carga las tareas del tablero.
    })();
    return () => { active = false; };
  }, [authorized, user?.id]);
  function openHome() {
    leaveWorkspaceNote();
    rememberWorkspaceRoute("home");
    setView("home");
    setProject(null);
    setBoard(null);
    setError("");
  }

  function openHabits() {
    leaveWorkspaceNote();
    rememberWorkspaceRoute("habits");
    setView("habits");
    setProject(null);
    setBoard(null);
    setError("");
    setSideOpen(false);
  }

  function openVault() {
    leaveWorkspaceNote();
    rememberWorkspaceRoute("vault");
    setView("vault");
    setProject(null);
    setBoard(null);
    setError("");
    setSideOpen(false);
  }

  function openCalendar() {
    leaveWorkspaceNote();
    rememberWorkspaceRoute("calendar");
    setView("calendar");
    setProject(null);
    setBoard(null);
    setError("");
    setSideOpen(false);
  }

  function openProjects() {
    leaveWorkspaceNote();
    rememberWorkspaceRoute("projects");
    setView("projects");
    setProject(null);
    setBoard(null);
  }

  function openProject(value) {
    if (!value?.id || value.owner_id !== user?.id) {
      setError("Este proyecto no pertenece a la cuenta activa. Actualiza la lista de proyectos.");
      void loadProjects();
      openProjects();
      return;
    }
    leaveWorkspaceNote();
    rememberWorkspaceRoute("project", value.id);
    setProject(value);
    setBoard(null);
    setView("project");
  }

  function openBoard(value) {
    leaveWorkspaceNote();
    rememberWorkspaceRoute("board", project?.id || value.project_id, value.id);
    setBoard(value);
    setView("board");
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
    window.dispatchEvent(new Event("boveda:lock"));
    clearWorkspaceAccess(user?.id);
    clearCachedProjectServices();
    clearCachedTasks(); clearHabitsCache();
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
  const [projectCovers, setProjectCovers] = useState({});
  const [coverEditing, setCoverEditing] = useState(null);

  /* PROJECT APPEARANCE CLOUD V1 */
  useEffect(() => {
    if (!user?.id) {
      setProjectCovers({});
      return undefined;
    }

    let active = true;
    const ownerId = user.id;
    const cacheKey = "workspace_project_covers_v1_" + ownerId;

    try {
      setProjectCovers(JSON.parse(localStorage.getItem(cacheKey) || "{}"));
    } catch {
      setProjectCovers({});
    }

    async function refreshAppearance() {
      try {
        const remote = await loadProjectAppearances(ownerId);
        if (!active) return;

        setProjectCovers(current => {
          const next = { ...current, ...remote };
          try {
            localStorage.setItem(cacheKey, JSON.stringify(next));
          } catch {}
          return next;
        });
      } catch (error) {
        console.error("No se pudo sincronizar la apariencia:", error);
      }
    }

    function onFocus() {
      void refreshAppearance();
    }

    void refreshAppearance();
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(onFocus, 3600000);

    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [user?.id]);

  async function saveProjectCover(cover) {
    if (!user?.id || !coverEditing) return;

    const projectId = coverEditing.id;
    const ownerId = user.id;

    try {
      await saveProjectAppearance(ownerId, projectId, {
        ...cover,
        imagePath: projectCovers[projectId]?.imagePath || null
      });

      const remote = await loadProjectAppearances(ownerId);
      setProjectCovers(current => {
        const next = { ...current, ...remote };
        try {
          localStorage.setItem(
            "workspace_project_covers_v1_" + ownerId,
            JSON.stringify(next)
          );
        } catch {}
        return next;
      });

      setCoverEditing(null);
      notifyWorkspace("success", "Apariencia guardada en tu cuenta.");
    } catch (error) {
      notifyWorkspace("error", error.message || "No se pudo guardar la apariencia.");
      throw error;
    }
  }
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

    try {
      const { error: deleteError } = await supabase
        .from(TABLES.projects)
        .delete()
        .eq("id", item.id)
        .eq("owner_id", user.id);

      if (deleteError) throw deleteError;

      // Close only after the database confirms deletion.
      setProjectDialogClosing(true);
      await new Promise(resolve => setTimeout(resolve, 130));
      setProjectDialog(null);
      setProjectDialogClosing(false);
      setProjectRemovingId(item.id);

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
    /* PROJECT LOADING FEEDBACK V2 */
    notifyWorkspace("loading", "Creando proyecto…");
    try {
    const { error } = await supabase.from(TABLES.projects)
      .insert({ title: newName.trim(), owner_id: user.id });
    setBusy(false);
    if (error) {
      const message = formatError(error);
      setError(message);
      notifyWorkspace("error", message);
      return;
    }
    setNewName("");
    await loadProjects();
    notifyWorkspace("success", "Proyecto creado correctamente.");
    } catch (error) {
      const message = error?.message || "No se pudo completar la operación.";
      setError(message);
      notifyWorkspace("error", message);
    } finally {
      setBusy(false);
    }
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
  }

  async function moveTask(task, status) {
    const { error } = await supabase.from(TABLES.tasks)
      .update({ status }).eq("id", task.id);
    if (error) return setError(formatError(error));
    setTasks(current => current.map(item =>
      item.id === task.id ? { ...item, status } : item
    ));
  }

  async function removeItem(table, id, reload) {
    if (!await confirmWorkspace({title:"Eliminar elemento",message:"Se eliminará este elemento y su contenido relacionado. Esta acción es permanente.",confirmLabel:"Eliminar"})) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) setError(formatError(error));
    else {
      await reload();
      notifyWorkspace("success", "Elemento eliminado correctamente.");
    }
  }

  if (!supabase || !ready || !user || !authorized) {
    return (
      <WorkspaceAccess
        ready={ready}
        user={user}
        authorized={authorized}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        busy={busy}
        error={error}
        signIn={signIn}
        signOut={signOut}
      />
    );
  }

  return (
    <div className="private-root">
      <WorkspaceToasts key={user.id} />
      <WorkspaceHeader
        user={user}
        sideOpen={sideOpen}
        setSideOpen={setSideOpen}
        setSideCollapsed={setSideCollapsed}
        signOut={signOut}
      />

      <div className={`private-workspace-layout ${sideCollapsed ? "is-collapsed" : ""}`}>
        {sideOpen && (
          <button
            className="private-sidebar-overlay"
            type="button"
            aria-label="Cerrar menu lateral"
            onClick={() => setSideOpen(false)}
          />
        )}

        <WorkspaceSidebar
          sideOpen={sideOpen}
          setSideOpen={setSideOpen}
          setSideCollapsed={setSideCollapsed}
          view={view}
          openHome={openHome}
          openProjects={openProjects}
          openCalendar={openCalendar}
          openHabits={openHabits}
          openVault={openVault}
          projects={projects}
          projectCovers={projectCovers}
          project={project}
          openProject={openProject}
          signOut={signOut}
        />

        <div className="private-content">
          <main className="private-main">

{/* WORKSPACE NOTE BREADCRUMB V2 */}
        <WorkspaceBreadcrumbs
          view={view}
          project={project}
          board={board}
          noteId={noteId}
          openHome={openHome}
          openProjects={openProjects}
          openProject={openProject}
        />

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

        <BovedaSesion
          key={user.id}
          user={user}
          active={!noteId && view === "vault"}
        />

        {!noteId && view === "habits" && (
          <WorkspaceHabits key={user.id} user={user}/>
        )}

        {!noteId && view === "calendar" && (
          <WorkspaceCalendar key={user.id} user={user} projects={projects}/>
        )}

        {!noteId && view === "home" && (
          <WorkspaceDashboard
            userId={user.id}
            projects={projects}
            onProjects={openProjects}
            onCalendar={openCalendar}
            onHabits={openHabits}
          />
        )}

        {!noteId && view === "projects" && <>

            <WorkspaceProjects
              coverEditing={coverEditing}
              projectCovers={projectCovers}
              setCoverEditing={setCoverEditing}
              saveProjectCover={saveProjectCover}
              projectDialog={projectDialog}
              projectName={projectName}
              setProjectName={setProjectName}
              error={error}
              closeProjectDialog={closeProjectDialog}
              confirmProjectAction={confirmProjectAction}
              projectBusy={projectBusy}
              projectDialogClosing={projectDialogClosing}
              createProject={createProject}
              newName={newName}
              setNewName={setNewName}
              busy={busy}
              projects={projects}
              projectRemovingId={projectRemovingId}
              openProject={openProject}
              showProjectRename={showProjectRename}
              showProjectDelete={showProjectDelete}
            />
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
