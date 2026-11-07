$ErrorActionPreference = 'Stop'
$repo = 'G:\Github\FrankPortfolio-Publicacion'
Set-Location $repo
$path = Join-Path $repo 'src\private\components\WorkspaceCalendar.jsx'
if (!(Test-Path $path)) { throw "Falta $path" }
$original = [IO.File]::ReadAllText($path)
if ($original.Contains('wc-calendar-destination')) { throw 'Este cambio ya fue instalado.' }
$required = @(
 '  const [saving, setSaving] = useState(false);',
 '  function newEvent() { setEditingId(null); setDraft(defaultDraft(fromKey(selected))); }',
 '    const payload = { title: draft.title.trim(), description: draft.description.trim(), project_id: draft.project_id || null,',
 '    setSaving(true);',
 '      const result = editingId',
 '  async function remove(item) {',
 '          <label>Proyecto (opcional)<select value={draft.project_id}'
)
foreach ($s in $required) { if (!$original.Contains($s)) { throw "Estructura distinta; no se modifico nada: $s" } }
$next=$original
function ReplaceOnce([string]$old,[string]$new) {
  $script:next = $script:next.Replace($old,$new)
  if ($script:next -eq $script:beforeReplace) { throw "No se reemplazo el patron: $old" }
}
$next=$next.Replace('  const [saving, setSaving] = useState(false);', '  const [saving, setSaving] = useState(false);' + "`n" + '  const [destination, setDestination] = useState("workspace");')
$next=$next.Replace('  function newEvent() { setEditingId(null); setDraft(defaultDraft(fromKey(selected))); }','  function newEvent() { setEditingId(null); setDestination("workspace"); setDraft(defaultDraft(fromKey(selected))); }')
$next=$next.Replace('    setEditingId(item.id);','    setEditingId(item.id);' + "`n" + '    setDestination("workspace");')
$oldSave = @'
    setSaving(true);
    try {
      const result = editingId
        ? await supabase.from("workspace_calendar_events").update(payload).eq("id", editingId).eq("owner_id", user.id)
        : await supabase.from("workspace_calendar_events").insert({ ...payload, owner_id: user.id });
      if (result.error) throw result.error;
      setDraft(null);
      notifyWorkspace("success", editingId ? "Evento actualizado." : "Evento creado.");
      await reload();
    } catch (error) { notifyWorkspace("error", error.message); }
    finally { setSaving(false); }
'@
$newSave = @'
    setSaving(true);
    try {
      if (!editingId && destination === "google") {
        const { data: available, error: listError } = await supabase.functions.invoke("google-calendar-api", {
          body: {
            action: "list",
            from: new Date(start.getFullYear(), start.getMonth(), 1).toISOString(),
            to: new Date(start.getFullYear(), start.getMonth() + 1, 1).toISOString()
          }
        });
        if (listError) throw listError;
        if (available?.error) throw new Error(available.error);
        if (!available?.connected) throw new Error("Conecta Google Calendar antes de guardar un evento allí.");
        const writable = (available.calendars || []).find(c => c.primary && c.writable) ||
          (available.calendars || []).find(c => c.writable);
        if (!writable) throw new Error("No hay un calendario de Google con permiso de escritura.");
        const { data, error } = await supabase.functions.invoke("google-calendar-api", {
          body: {
            action: "create",
            calendar_id: writable.id,
            event: {
              title: payload.title,
              description: payload.description,
              start: payload.start_at,
              end: payload.end_at,
              all_day: false,
              reminder_minutes: payload.reminder_minutes
            }
          }
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (!data?.ok) throw new Error("Google no confirmó la creación del evento.");
        setDraft(null);
        notifyWorkspace("success", "Evento creado en Google Calendar. Actualiza la vista Google para verlo.");
      } else {
        const result = editingId
          ? await supabase.from("workspace_calendar_events").update(payload).eq("id", editingId).eq("owner_id", user.id)
          : await supabase.from("workspace_calendar_events").insert({ ...payload, owner_id: user.id });
        if (result.error) throw result.error;
        setDraft(null);
        notifyWorkspace("success", editingId ? "Evento actualizado." : "Evento creado.");
        await reload();
      }
    } catch (error) { notifyWorkspace("error", error.message || "No se pudo guardar el evento."); }
    finally { setSaving(false); }
'@
if (!$next.Contains($oldSave)) { throw 'Bloque save distinto. No se modifico nada.' }
$next=$next.Replace($oldSave,$newSave)
$anchor = '          <label>Proyecto (opcional)<select value={draft.project_id}'
$destUI = @'
          {!editingId && <fieldset className="wc-calendar-destination" style={{border:"1px solid #dce4ee",borderRadius:12,padding:"12px 14px",margin:"8px 0"}}>
            <legend style={{padding:"0 5px",fontWeight:700}}>Guardar evento en</legend>
            <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}>
              <input type="radio" name="calendar-destination" checked={destination === "workspace"} onChange={() => setDestination("workspace")}/>
              Workspace (evento privado en Supabase)
            </label>
            <label style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="radio" name="calendar-destination" checked={destination === "google"} onChange={() => setDestination("google")}/>
              Google Calendar (cuenta conectada)
            </label>
            {destination === "google" && <small style={{display:"block",marginTop:9,color:"#64748b"}}>Se creará en tu calendario principal de Google, o en el primer calendario editable. No se duplicará en Workspace. Para editarlo, usa el calendario Google de arriba. Los eventos de día completo y su vinculación a proyectos están disponibles solo en Workspace en este formulario.</small>}
          </fieldset>}
'@
$next=$next.Replace($anchor,$destUI + "`n" + $anchor)
$next=$next.Replace('    const payload = { title: draft.title.trim(),', '    if (!editingId && destination === "google" && draft.all_day) {' + "`n" + '      notifyWorkspace("error", "Para eventos de día completo, utiliza el formulario Google de arriba."); return;' + "`n" + '    }' + "`n" + '    const payload = { title: draft.title.trim(),')
$next=$next.Replace('          <label>Proyecto (opcional)<select', '          <label>Proyecto (opcional)<select')
$backup = Join-Path 'G:\Github' ('CalendarDestino-Backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $backup -Force | Out-Null
Copy-Item $path (Join-Path $backup 'WorkspaceCalendar.jsx')
$utf8 = New-Object System.Text.UTF8Encoding($false)
try {
  [IO.File]::WriteAllText($path,$next,$utf8)
  npm run typecheck
  if ($LASTEXITCODE -ne 0) { throw 'Fallo typecheck.' }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'Fallo build.' }
  git diff --check
  if ($LASTEXITCODE -ne 0) { throw 'Fallo git diff --check.' }
  Write-Host 'DESTINO DE CALENDARIO INSTALADO LOCALMENTE.' -ForegroundColor Green
  Write-Host "Respaldo: $backup"
  Write-Host 'SIN deploy, SIN commit, SIN push.'
  git status --short
} catch {
  Copy-Item (Join-Path $backup 'WorkspaceCalendar.jsx') $path -Force
  throw "Se restauro WorkspaceCalendar.jsx: $($_.Exception.Message)"
}
