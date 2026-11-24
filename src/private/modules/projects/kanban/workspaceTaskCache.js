const PREFIX = "workspace-task-cache:v1:";
const memory = new Map();

function key(ownerId, boardId) {
  return `${PREFIX}${ownerId}:${boardId}`;
}

export function readCachedTasks(ownerId, boardId) {
  if (!ownerId || !boardId) return null;
  const id = key(ownerId, boardId);

  if (memory.has(id)) return memory.get(id);

  try {
    const rows = JSON.parse(sessionStorage.getItem(id) || "null");
    if (!Array.isArray(rows)) return null;
    memory.set(id, rows);
    return rows;
  } catch {
    return null;
  }
}

export function saveCachedTasks(ownerId, boardId, rows) {
  if (!ownerId || !boardId || !Array.isArray(rows)) return;

  // No recuperar tarjetas temporales de una petición todavía pendiente.
  const valid = rows.filter(row =>
    row.board_id === boardId &&
    /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(row.id))
  );

  const id = key(ownerId, boardId);
  memory.set(id, valid);

  try {
    sessionStorage.setItem(id, JSON.stringify(valid));
  } catch {}
}

export function clearCachedTasks() {
  memory.clear();
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index--) {
      const id = sessionStorage.key(index);
      if (id?.startsWith(PREFIX)) sessionStorage.removeItem(id);
    }
  } catch {}
}