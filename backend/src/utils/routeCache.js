const cacheStore = new Map();

const now = () => Date.now();

const getRouteCacheEntry = (key) => {
  if (!key) {
    return null;
  }

  const cached = cacheStore.get(key);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= now()) {
    cacheStore.delete(key);
    return null;
  }

  return cached.value;
};

const setRouteCacheEntry = (key, value, ttlMs) => {
  if (!key || !Number.isFinite(ttlMs) || ttlMs <= 0) {
    return;
  }

  cacheStore.set(key, {
    value,
    expiresAt: now() + ttlMs,
  });
};

const invalidateRouteCacheByPrefix = (prefix) => {
  if (!prefix) {
    return;
  }

  for (const key of cacheStore.keys()) {
    if (String(key).startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
};

module.exports = {
  getRouteCacheEntry,
  setRouteCacheEntry,
  invalidateRouteCacheByPrefix,
};
