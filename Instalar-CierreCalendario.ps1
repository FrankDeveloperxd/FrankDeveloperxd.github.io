& {
    $ErrorActionPreference = 'Stop'
    $repo = 'G:\Github\FrankPortfolio-Publicacion'
    Set-Location $repo
    $app = Join-Path $repo 'src\private\PrivateApp.jsx'
    $suite = Join-Path $repo 'src\private\components\GoogleCalendarSuite.jsx'
    $backend = Join-Path $repo 'supabase\functions\google-calendar-disconnect\index.ts'
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    if (!(Test-Path $app) -or !(Test-Path $suite)) { throw 'No se encuentran los archivos del Workspace.' }
    if (Test-Path $backend) { throw 'La funcion de desconexion ya existe. No se sobrescribe.' }

    $appText = [IO.File]::ReadAllText($app)
    $suiteText = [IO.File]::ReadAllText($suite)
    $dashboardAnchor = '            <div className="private-module private-module-future">'
    $suiteAnchor = "  function toggle(id){"
    $buttonAnchor = @'
<button type="button" className="gcs-primary" onClick={connect} disabled={busy}>{connected?'Reconectar Google':'Conectar Google'}</button>
'@
    if ($appText.IndexOf($dashboardAnchor) -lt 0 -or $suiteText.IndexOf($suiteAnchor) -lt 0 -or $suiteText.IndexOf($buttonAnchor) -lt 0) {
        throw 'No coinciden los puntos de integracion del Dashboard o del Calendario; no se hizo ningun cambio.'
    }
    if ($appText.Contains('private-calendar-module-card') -or $suiteText.Contains('async function disconnectGoogle()')) {
        throw 'La modificacion ya parece instalada; no se repite.'
    }
    $backup = Join-Path 'G:\Github' ('CalendarCerrar-Backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
    New-Item -ItemType Directory -Path $backup -Force | Out-Null
    Copy-Item $app (Join-Path $backup 'PrivateApp.jsx')
    Copy-Item $suite (Join-Path $backup 'GoogleCalendarSuite.jsx')

    $dashboardCard = @'
            <button type="button" className="private-module private-calendar-module-card" onClick={() => { openCalendar(); }}>
              <span className="private-module-icon"><CalendarDays size={29}/></span>
              <strong>Calendario</strong>
              <small>Organiza tu agenda y conecta tus calendarios de Google.</small>
              <span className="private-module-link">Abrir módulo</span>
            </button>
'@
    # The original Dashboard uses an openCalendar helper only if it exists.
    if ($appText -notmatch '\bfunction openCalendar\b|\bconst openCalendar\s*=') {
        $dashboardCard = $dashboardCard.Replace('openCalendar();', 'setView("calendar");')
    }
    $appUpdated = $appText.Replace($dashboardAnchor, $dashboardCard + "`n" + $dashboardAnchor)

    $disconnect = @'
  async function disconnectGoogle() {
    if (!connected || busy) return;
    if (!window.confirm('¿Desconectar Google Calendar? No se borrarán los eventos de Google ni los del Workspace.')) return;
    setBusy(true);
    setError('');
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-disconnect', { body: {} });
      if (error) {
        let detail = error.message;
        try { if (error.context?.json) detail = (await error.context.json())?.error || detail; } catch {}
        throw new Error(detail);
      }
      if (!data?.disconnected) throw new Error(data?.error || 'No se confirmó la desconexión.');
      setConnected(false);
      setCalendars([]);
      setSelectedIds(null);
      setEvents([]);
      setEmail('');
    } catch (e) {
      setError(e.message || 'No fue posible desconectar Google.');
    } finally {
      setBusy(false);
    }
  }
'@
    $suiteUpdated = $suiteText.Replace($suiteAnchor, $disconnect + "`n" + $suiteAnchor)
    $disconnectButton = '<button type="button" onClick={disconnectGoogle} disabled={busy} aria-label="Desconectar Google Calendar">Desconectar Google</button>'
    $suiteUpdated = $suiteUpdated.Replace($buttonAnchor, $buttonAnchor + $disconnectButton)

    $backendCode = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('aW1wb3J0IHsgY3JlYXRlQ2xpZW50IH0gZnJvbSAnaHR0cHM6Ly9lc20uc2gvQHN1cGFiYXNlL3N1cGFiYXNlLWpzQDInOwoKY29uc3QgZW52ID0gKG5hbWU6IHN0cmluZykgPT4gRGVuby5lbnYuZ2V0KG5hbWUpID8/ICcnOwpjb25zdCBjb3JzID0gewogICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsCiAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnYXV0aG9yaXphdGlvbiwgYXBpa2V5LCB4LWNsaWVudC1pbmZvLCBjb250ZW50LXR5cGUnLAogICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogJ1BPU1QsIE9QVElPTlMnLAp9Owpjb25zdCByZXBseSA9IChib2R5OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiwgc3RhdHVzID0gMjAwKSA9PiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoYm9keSksIHsKICBzdGF0dXMsCiAgaGVhZGVyczogeyAuLi5jb3JzLCAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLTgnLCAnQ2FjaGUtQ29udHJvbCc6ICduby1zdG9yZScgfSwKfSk7Cgphc3luYyBmdW5jdGlvbiBkZWNyeXB0KHZhbHVlOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4gewogIGlmICghdmFsdWUuc3RhcnRzV2l0aCgndjE6JykpIHRocm93IG5ldyBFcnJvcignVW5zdXBwb3J0ZWQgdG9rZW4gZm9ybWF0Jyk7CiAgY29uc3QgcmF3S2V5ID0gVWludDhBcnJheS5mcm9tKGF0b2IoZW52KCdHT09HTEVfVE9LRU5fRU5DUllQVElPTl9LRVknKSksIGMgPT4gYy5jaGFyQ29kZUF0KDApKTsKICBpZiAocmF3S2V5Lmxlbmd0aCAhPT0gMzIpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBlbmNyeXB0aW9uIGtleScpOwogIGNvbnN0IGtleSA9IGF3YWl0IGNyeXB0by5zdWJ0bGUuaW1wb3J0S2V5KCdyYXcnLCByYXdLZXksICdBRVMtR0NNJywgZmFsc2UsIFsnZGVjcnlwdCddKTsKICBjb25zdCBieXRlcyA9IFVpbnQ4QXJyYXkuZnJvbShhdG9iKHZhbHVlLnNsaWNlKDMpKSwgYyA9PiBjLmNoYXJDb2RlQXQoMCkpOwogIGlmIChieXRlcy5sZW5ndGggPCAyOSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGVuY3J5cHRlZCB0b2tlbicpOwogIGNvbnN0IHBsYWludGV4dCA9IGF3YWl0IGNyeXB0by5zdWJ0bGUuZGVjcnlwdCh7IG5hbWU6ICdBRVMtR0NNJywgaXY6IGJ5dGVzLnNsaWNlKDAsIDEyKSB9LCBrZXksIGJ5dGVzLnNsaWNlKDEyKSk7CiAgcmV0dXJuIG5ldyBUZXh0RGVjb2RlcigpLmRlY29kZShwbGFpbnRleHQpOwp9CgpEZW5vLnNlcnZlKGFzeW5jIHJlcSA9PiB7CiAgaWYgKHJlcS5tZXRob2QgPT09ICdPUFRJT05TJykgcmV0dXJuIG5ldyBSZXNwb25zZShudWxsLCB7IHN0YXR1czogMjA0LCBoZWFkZXJzOiBjb3JzIH0pOwogIGlmIChyZXEubWV0aG9kICE9PSAnUE9TVCcpIHJldHVybiByZXBseSh7IGVycm9yOiAnTWV0aG9kIG5vdCBhbGxvd2VkJyB9LCA0MDUpOwogIGNvbnN0IHVybCA9IGVudignU1VQQUJBU0VfVVJMJyk7CiAgY29uc3Qgc2VydmljZUtleSA9IGVudignU1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWScpOwogIGlmICghdXJsIHx8ICFzZXJ2aWNlS2V5IHx8ICFlbnYoJ0dPT0dMRV9UT0tFTl9FTkNSWVBUSU9OX0tFWScpKSByZXR1cm4gcmVwbHkoeyBlcnJvcjogJ0JhY2tlbmQgY29uZmlndXJhdGlvbiB1bmF2YWlsYWJsZScgfSwgNTAwKTsKICBjb25zdCBiZWFyZXIgPSByZXEuaGVhZGVycy5nZXQoJ0F1dGhvcml6YXRpb24nKT8ubWF0Y2goL15CZWFyZXJccysoLispJC9pKT8uWzFdOwogIGlmICghYmVhcmVyKSByZXR1cm4gcmVwbHkoeyBlcnJvcjogJ1VuYXV0aG9yaXplZCcgfSwgNDAxKTsKICBjb25zdCBhZG1pbiA9IGNyZWF0ZUNsaWVudCh1cmwsIHNlcnZpY2VLZXksIHsgYXV0aDogeyBwZXJzaXN0U2Vzc2lvbjogZmFsc2UsIGF1dG9SZWZyZXNoVG9rZW46IGZhbHNlIH0gfSk7CiAgY29uc3QgeyBkYXRhOiB7IHVzZXIgfSwgZXJyb3I6IGF1dGhFcnJvciB9ID0gYXdhaXQgYWRtaW4uYXV0aC5nZXRVc2VyKGJlYXJlcik7CiAgaWYgKGF1dGhFcnJvciB8fCAhdXNlcikgcmV0dXJuIHJlcGx5KHsgZXJyb3I6ICdJbnZhbGlkIHNlc3Npb24nIH0sIDQwMSk7CiAgY29uc3QgeyBkYXRhOiBvd25lciwgZXJyb3I6IG93bmVyRXJyb3IgfSA9IGF3YWl0IGFkbWluLmZyb20oJ3dvcmtzcGFjZV9vd25lcicpLnNlbGVjdCgndXNlcl9pZCcpLmVxKCd1c2VyX2lkJywgdXNlci5pZCkubWF5YmVTaW5nbGUoKTsKICBpZiAob3duZXJFcnJvcikgcmV0dXJuIHJlcGx5KHsgZXJyb3I6ICdXb3Jrc3BhY2UgYXV0aG9yaXphdGlvbiB1bmF2YWlsYWJsZScgfSwgNTAwKTsKICBpZiAoIW93bmVyKSByZXR1cm4gcmVwbHkoeyBlcnJvcjogJ1dvcmtzcGFjZSBhY2Nlc3MgZGVuaWVkJyB9LCA0MDMpOwogIGNvbnN0IHsgZGF0YTogY29ubmVjdGlvbiwgZXJyb3I6IGxvb2t1cEVycm9yIH0gPSBhd2FpdCBhZG1pbi5mcm9tKCd3b3Jrc3BhY2VfZ29vZ2xlX2Nvbm5lY3Rpb25zJykKICAgIC5zZWxlY3QoJ3JlZnJlc2hfdG9rZW5fZW5jcnlwdGVkJykuZXEoJ293bmVyX2lkJywgdXNlci5pZCkubWF5YmVTaW5nbGUoKTsKICBpZiAobG9va3VwRXJyb3IpIHJldHVybiByZXBseSh7IGVycm9yOiAnR29vZ2xlIGNvbm5lY3Rpb24gbG9va3VwIGZhaWxlZCcgfSwgNTAwKTsKICBpZiAoIWNvbm5lY3Rpb24pIHJldHVybiByZXBseSh7IGRpc2Nvbm5lY3RlZDogdHJ1ZSwgYWxyZWFkeV9kaXNjb25uZWN0ZWQ6IHRydWUgfSk7CiAgaWYgKGNvbm5lY3Rpb24ucmVmcmVzaF90b2tlbl9lbmNyeXB0ZWQpIHsKICAgIGxldCByZWZyZXNoOiBzdHJpbmc7CiAgICB0cnkgeyByZWZyZXNoID0gYXdhaXQgZGVjcnlwdChjb25uZWN0aW9uLnJlZnJlc2hfdG9rZW5fZW5jcnlwdGVkKTsgfQogICAgY2F0Y2ggeyByZXR1cm4gcmVwbHkoeyBlcnJvcjogJ0Nhbm5vdCBkZWNyeXB0IEdvb2dsZSB0b2tlbi4gQ29ubmVjdGlvbiBwcmVzZXJ2ZWQuJyB9LCA1MDApOyB9CiAgICBsZXQgcmV2b2tlOiBSZXNwb25zZTsKICAgIHRyeSB7CiAgICAgIHJldm9rZSA9IGF3YWl0IGZldGNoKCdodHRwczovL29hdXRoMi5nb29nbGVhcGlzLmNvbS9yZXZva2UnLCB7CiAgICAgICAgbWV0aG9kOiAnUE9TVCcsCiAgICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcgfSwKICAgICAgICBib2R5OiBuZXcgVVJMU2VhcmNoUGFyYW1zKHsgdG9rZW46IHJlZnJlc2ggfSksCiAgICAgIH0pOwogICAgfSBjYXRjaCB7IHJldHVybiByZXBseSh7IGVycm9yOiAnR29vZ2xlIHJldm9jYXRpb24gaXMgdW5yZWFjaGFibGUuIENvbm5lY3Rpb24gcHJlc2VydmVkLicgfSwgNTAyKTsgfQogICAgLy8gR29vZ2xlIHJldHVybnMgNDAwIGZvciBhbiBhbHJlYWR5LWludmFsaWQgdG9rZW47IGxvY2FsIGNsZWFudXAgaXMgc3RpbGwgYXBwcm9wcmlhdGUuCiAgICBpZiAoIXJldm9rZS5vayAmJiByZXZva2Uuc3RhdHVzICE9PSA0MDApIHsKICAgICAgcmV0dXJuIHJlcGx5KHsgZXJyb3I6ICdHb29nbGUgZGlkIG5vdCBjb25maXJtIHJldm9jYXRpb24uIENvbm5lY3Rpb24gcHJlc2VydmVkLicsIGdvb2dsZV9zdGF0dXM6IHJldm9rZS5zdGF0dXMgfSwgNTAyKTsKICAgIH0KICB9CiAgY29uc3QgeyBlcnJvcjogZGVsZXRlRXJyb3IgfSA9IGF3YWl0IGFkbWluLmZyb20oJ3dvcmtzcGFjZV9nb29nbGVfY29ubmVjdGlvbnMnKS5kZWxldGUoKS5lcSgnb3duZXJfaWQnLCB1c2VyLmlkKTsKICBpZiAoZGVsZXRlRXJyb3IpIHJldHVybiByZXBseSh7IGVycm9yOiAnRmFpbGVkIHRvIHJlbW92ZSBsb2NhbCBHb29nbGUgY29ubmVjdGlvbicgfSwgNTAwKTsKICByZXR1cm4gcmVwbHkoeyBkaXNjb25uZWN0ZWQ6IHRydWUgfSk7Cn0pOwo='))
    try {
        New-Item -ItemType Directory -Path (Split-Path $backend -Parent) -Force | Out-Null
        [IO.File]::WriteAllText($app, $appUpdated, $utf8)
        [IO.File]::WriteAllText($suite, $suiteUpdated, $utf8)
        [IO.File]::WriteAllText($backend, $backendCode, $utf8)
        npm run typecheck
        if ($LASTEXITCODE -ne 0) { throw 'Typecheck fallo' }
        npm run build
        if ($LASTEXITCODE -ne 0) { throw 'Build fallo' }
        git diff --check
        if ($LASTEXITCODE -ne 0) { throw 'Git diff --check fallo' }
        Write-Host 'DASHBOARD Y DESCONEXION INSTALADOS LOCALMENTE' -ForegroundColor Green
        Write-Host "Respaldo externo: $backup"
        Write-Host 'Aun no hay deploy, commit ni push.'
    } catch {
        Copy-Item (Join-Path $backup 'PrivateApp.jsx') $app -Force
        Copy-Item (Join-Path $backup 'GoogleCalendarSuite.jsx') $suite -Force
        Remove-Item $backend -Force -ErrorAction SilentlyContinue
        throw "Cambios restaurados: $($_.Exception.Message)"
    }
}
