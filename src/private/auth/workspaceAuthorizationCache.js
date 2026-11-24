// WORKSPACE AUTHORIZATION UI CACHE V1
const prefix = "workspace-authorized:";

function cacheKey(userId) {
  if (!userId) return null;
  return prefix + import.meta.env.VITE_SUPABASE_URL + ":" + userId;
}

export function hasCachedWorkspaceAccess(userId) {
  const key = cacheKey(userId);
  if (!key) return false;

  try {
    const item = JSON.parse(localStorage.getItem(key) || "null");

    if (!item || item.userId !== userId) return false;

    // Esta cache acelera la interfaz; no autoriza peticiones.
    return Date.now() - item.verifiedAt < 7 * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function rememberWorkspaceAccess(userId) {
  const key = cacheKey(userId);
  if (!key) return;

  try {
    localStorage.setItem(
      key,
      JSON.stringify({ userId, verifiedAt: Date.now() })
    );
  } catch {
    // Si se bloquea el almacenamiento, la app sigue funcionando.
  }
}

export function clearWorkspaceAccess(userId) {
  const key = cacheKey(userId);
  if (!key) return;

  try {
    localStorage.removeItem(key);
  } catch {
    // No afecta el cierre de sesion en Supabase.
  }
}
