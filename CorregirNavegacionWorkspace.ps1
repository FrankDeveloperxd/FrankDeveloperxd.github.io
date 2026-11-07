$ErrorActionPreference = 'Stop'
$repo = 'G:\Github\FrankPortfolio-Publicacion'
Set-Location $repo
$file = Join-Path $repo 'src\private\PrivateApp.jsx'
if (-not (Test-Path $file)) { throw 'No existe PrivateApp.jsx' }
$utf8 = New-Object System.Text.UTF8Encoding($false)
$original = [System.IO.File]::ReadAllText($file)
$marker = '/* WORKSPACE ROUTE PERSISTENCE V1 */'
if ($original.Contains($marker)) { throw 'La mejora ya fue aplicada; no se repite.' }
$backup = Join-Path (Split-Path $repo -Parent) ('PrivateApp-antes-rutas-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.jsx')
Copy-Item $file $backup -Force
function SwapOnce([string] $source, [string] $old, [string] $replacement) {
    $a = $source.IndexOf($old, [System.StringComparison]::Ordinal)
    if ($a -lt 0) { throw ('No se encontro el bloque esperado: ' + $old.Substring(0,[Math]::Min(85,$old.Length))) }
    if ($source.IndexOf($old, $a + $old.Length, [System.StringComparison]::Ordinal) -ge 0) { throw 'El ancla se encontro mas de una vez.' }
    return $source.Substring(0,$a) + $replacement + $source.Substring($a+$old.Length)
}
try {
    $content = $original
    $old = '  const [view, setView] = useState("home");'
    $new = @'
  /* WORKSPACE ROUTE PERSISTENCE V1 */
  const [view, setView] = useState(() => {
    const route = new URLSearchParams(window.location.search).get("vista");
    return route === "calendar" || route === "projects" ? route : "home";
  });
'@
    $content = SwapOnce $content $old $new.TrimEnd()

    $anchor = '  function openHome() {'
    $insertion = @'
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
    if (nextView === "calendar" || nextView === "projects") {
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
      await loadBoards(item.id);
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
      await loadTasks(restoredBoard.id);
    })();
    return () => { active = false; };
  }, [authorized, user?.id]);

'@
    $content = SwapOnce $content $anchor ($insertion + $anchor)

    $content = SwapOnce $content @'
  function openHome() {
    leaveWorkspaceNote();
    setView("home");
'@ @'
  function openHome() {
    leaveWorkspaceNote();
    rememberWorkspaceRoute("home");
    setView("home");
'@
    $content = SwapOnce $content @'
  function openCalendar() {
    leaveWorkspaceNote();
    setView("calendar");
'@ @'
  function openCalendar() {
    leaveWorkspaceNote();
    rememberWorkspaceRoute("calendar");
    setView("calendar");
'@
    $content = SwapOnce $content @'
  function openProjects() {
    leaveWorkspaceNote();
    setView("projects");
'@ @'
  function openProjects() {
    leaveWorkspaceNote();
    rememberWorkspaceRoute("projects");
    setView("projects");
'@
    $content = SwapOnce $content @'
  function openProject(value) {
    leaveWorkspaceNote();
    setProject(value);
'@ @'
  function openProject(value) {
    leaveWorkspaceNote();
    rememberWorkspaceRoute("project", value.id);
    setProject(value);
'@
    $content = SwapOnce $content @'
  function openBoard(value) {
    leaveWorkspaceNote();
    setBoard(value);
'@ @'
  function openBoard(value) {
    leaveWorkspaceNote();
    rememberWorkspaceRoute("board", project?.id || value.project_id, value.id);
    setBoard(value);
'@
    # Correct sidebar highlighting for calendar
    $content = $content.Replace('view !== "home" ? "active" : ""', '!["home", "calendar"].includes(view) ? "active" : ""')
    [System.IO.File]::WriteAllText($file, $content, $utf8)
    npm run typecheck
    if ($LASTEXITCODE -ne 0) { throw 'Typecheck fallo.' }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Build fallo.' }
    git diff --check
    if ($LASTEXITCODE -ne 0) { throw 'Git diff check fallo.' }
    Write-Host 'Navegacion persistente instalada localmente.' -ForegroundColor Green
    Write-Host ('Respaldo externo: ' + $backup)
    Write-Host 'No se hizo commit ni push.'
    git status --short
} catch {
    Copy-Item $backup $file -Force
    throw ('Cambio revertido; respaldo: ' + $backup + '. Error: ' + $_.Exception.Message)
}
