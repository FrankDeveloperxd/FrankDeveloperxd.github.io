// WORKSPACE USER ISOLATION V1

const cache = new Map();
const MAX_AGE = 3 * 60 * 1000;

function cacheKey(ownerId, projectId) {
  if (!ownerId || !projectId) return null;
  return ownerId + ":" + projectId;
}

export function getCachedProjectServices(ownerId, projectId) {
  const key = cacheKey(ownerId, projectId);
  if (!key) return null;

  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > MAX_AGE) {
    cache.delete(key);
    return null;
  }

  return entry.services;
}

export function saveCachedProjectServices(
  ownerId,
  projectId,
  services
) {
  const key = cacheKey(ownerId, projectId);
  if (!key || !Array.isArray(services)) return;

  cache.set(key, {
    services,
    timestamp: Date.now()
  });
}

export function clearCachedProjectServices(ownerId, projectId) {
  if (!ownerId) {
    cache.clear();
    return;
  }

  if (projectId) {
    cache.delete(cacheKey(ownerId, projectId));
    return;
  }

  for (const key of cache.keys()) {
    if (key.startsWith(ownerId + ":")) {
      cache.delete(key);
    }
  }
}
