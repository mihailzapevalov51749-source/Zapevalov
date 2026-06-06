const STORAGE_KEY = "yasnopro-dashboard-owner-detail-sections-v1";

const DEFAULT_SECTIONS = {
  next: true,
  inWork: true,
  done: true,
};

export function readOwnerStageDetailSections(stageId) {
  if (!stageId) {
    return { ...DEFAULT_SECTIONS };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SECTIONS };
    }
    const parsed = JSON.parse(raw);
    const saved = parsed?.[stageId];
    if (!saved || typeof saved !== "object") {
      return { ...DEFAULT_SECTIONS };
    }
    return {
      next: saved.next !== false,
      inWork: saved.inWork !== false,
      done: saved.done !== false,
    };
  } catch {
    return { ...DEFAULT_SECTIONS };
  }
}

export function writeOwnerStageDetailSections(stageId, sections) {
  if (!stageId) {
    return;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[stageId] = {
      next: sections.next !== false,
      inWork: sections.inWork !== false,
      done: sections.done !== false,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore quota / privacy errors
  }
}

export function readOwnerStageDetailListExpansion(stageId, listKey) {
  if (!stageId || !listKey) {
    return false;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return false;
    }
    const parsed = JSON.parse(raw);
    return Boolean(parsed?.[stageId]?.listExpansion?.[listKey]);
  } catch {
    return false;
  }
}

export function writeOwnerStageDetailListExpansion(stageId, listKey, expanded) {
  if (!stageId || !listKey) {
    return;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const stageState = parsed[stageId] || { ...DEFAULT_SECTIONS };
    stageState.listExpansion = {
      ...(stageState.listExpansion || {}),
      [listKey]: Boolean(expanded),
    };
    parsed[stageId] = stageState;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}
