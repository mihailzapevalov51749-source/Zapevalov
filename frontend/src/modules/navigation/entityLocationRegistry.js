function isObject(value) {
  return typeof value === "object" && value !== null;
}

function ensureBucket(registry, bucketKey) {
  if (!isObject(registry[bucketKey])) {
    registry[bucketKey] = {};
  }
}

function resolvePath(key) {
  return String(key ?? "")
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function ensureEntityLocationRegistry() {
  if (!isObject(window.__YASNOPRO_ENTITY_LOCATION_REGISTRY__)) {
    window.__YASNOPRO_ENTITY_LOCATION_REGISTRY__ = {
      tables: {},
      files: {},
    };
  }

  const registry = window.__YASNOPRO_ENTITY_LOCATION_REGISTRY__;
  ensureBucket(registry, "tables");
  ensureBucket(registry, "files");

  return registry;
}

export function getEntityLocationRegistry() {
  return ensureEntityLocationRegistry();
}

export function setEntityLocationRegistryEntry(key, value) {
  const registry = ensureEntityLocationRegistry();
  const [bucket, ...rest] = resolvePath(key);

  if (!bucket) return;
  ensureBucket(registry, bucket);

  if (rest.length === 0) {
    registry[bucket] = value;
    return;
  }

  const entryKey = rest.join(".");
  registry[bucket][entryKey] = value;
}

export function removeEntityLocationRegistryEntry(key) {
  const registry = ensureEntityLocationRegistry();
  const [bucket, ...rest] = resolvePath(key);

  if (!bucket) return;

  if (rest.length === 0) {
    if (bucket === "tables" || bucket === "files") {
      registry[bucket] = {};
      return;
    }
    delete registry[bucket];
    return;
  }

  if (!isObject(registry[bucket])) {
    return;
  }

  const entryKey = rest.join(".");
  delete registry[bucket][entryKey];
}

export function clearEntityLocationRegistry() {
  window.__YASNOPRO_ENTITY_LOCATION_REGISTRY__ = {
    tables: {},
    files: {},
  };
}
