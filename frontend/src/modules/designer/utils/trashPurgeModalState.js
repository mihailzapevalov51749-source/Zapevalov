export const TRASH_PURGE_MODAL_PARAM = "modal";
export const TRASH_PURGE_MODAL_VALUE = "delete-dependencies";
export const TRASH_PURGE_KIND_PARAM = "kind";
export const TRASH_PURGE_ID_PARAM = "id";
export const TRASH_PURGE_MODE_PARAM = "mode";

export const TRASH_PURGE_DELETE_MODES = {
  CLEAR: "clear",
  CASCADE: "cascade",
};

export function isTrashPurgeModalRequested(searchParams) {
  return searchParams?.get(TRASH_PURGE_MODAL_PARAM) === TRASH_PURGE_MODAL_VALUE;
}

export function parseTrashPurgeModalState(searchParams) {
  if (!isTrashPurgeModalRequested(searchParams)) {
    return null;
  }

  const kind = String(searchParams.get(TRASH_PURGE_KIND_PARAM) || "").trim();
  const id = String(searchParams.get(TRASH_PURGE_ID_PARAM) || "").trim();
  const modeRaw = String(searchParams.get(TRASH_PURGE_MODE_PARAM) || "").trim();

  if (!kind || !id) {
    return null;
  }

  const mode =
    modeRaw === TRASH_PURGE_DELETE_MODES.CLEAR || modeRaw === TRASH_PURGE_DELETE_MODES.CASCADE
      ? modeRaw
      : null;

  return { kind, id, mode };
}

export function buildTrashPurgeModalSearchParams(item, mode = null, currentSearchParams = null) {
  const params = new URLSearchParams(currentSearchParams || undefined);
  params.set(TRASH_PURGE_MODAL_PARAM, TRASH_PURGE_MODAL_VALUE);
  params.set(TRASH_PURGE_KIND_PARAM, String(item.kind));
  params.set(TRASH_PURGE_ID_PARAM, String(item.id));

  if (mode === TRASH_PURGE_DELETE_MODES.CLEAR || mode === TRASH_PURGE_DELETE_MODES.CASCADE) {
    params.set(TRASH_PURGE_MODE_PARAM, mode);
  } else {
    params.delete(TRASH_PURGE_MODE_PARAM);
  }

  return params;
}

export function clearTrashPurgeModalSearchParams(currentSearchParams) {
  const params = new URLSearchParams(currentSearchParams || undefined);
  params.delete(TRASH_PURGE_MODAL_PARAM);
  params.delete(TRASH_PURGE_KIND_PARAM);
  params.delete(TRASH_PURGE_ID_PARAM);
  params.delete(TRASH_PURGE_MODE_PARAM);
  return params;
}

export function findFirstOpenableDependency(groups) {
  for (const group of groups || []) {
    for (const item of group.items || []) {
      if (item?.canOpen && item?.route) {
        return item;
      }
    }
  }
  return null;
}

export function countDependencyItems(groups) {
  return (groups || []).reduce(
    (sum, group) => sum + (group.items?.length || group.count || 0),
    0,
  );
}
