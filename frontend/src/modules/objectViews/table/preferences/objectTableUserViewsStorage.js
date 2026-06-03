import { getStoredCurrentUser } from "../../../designer/constants/designerRoles";
import { buildObjectViewPayload } from "../../services/buildObjectViewPayload";
import { generateViewKey } from "../../services/generateViewKey";
import { normalizeObjectViewDefinition } from "../../services/normalizeObjectViewDefinition";

export const OBJECT_TABLE_USER_VIEWS_STORAGE_VERSION = 1;
const STORAGE_KEY_PREFIX = "yasnopro-object-table-user-views-v1";

export function getStoredCurrentUserId() {
  const user = getStoredCurrentUser();

  if (!user || typeof user !== "object") {
    return "anonymous";
  }

  const id = user.id ?? user.userId ?? user.user_id;

  return id != null ? String(id) : "anonymous";
}

/**
 * @param {{ tenantId: string | number, userId?: string, objectTypeKey: string }} scope
 */
export function buildUserTableViewsStorageKey({
  tenantId,
  userId = getStoredCurrentUserId(),
  objectTypeKey,
}) {
  const tenant = String(tenantId ?? "").trim() || "0";
  const user = String(userId ?? "anonymous").trim() || "anonymous";
  const objectKey = String(objectTypeKey || "default").trim() || "default";

  return `${STORAGE_KEY_PREFIX}::${tenant}::${user}::${objectKey}`;
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function createEmptyState() {
  return {
    version: OBJECT_TABLE_USER_VIEWS_STORAGE_VERSION,
    views: [],
    defaultViewKey: null,
  };
}

function normalizeState(raw) {
  if (!raw || typeof raw !== "object") {
    return createEmptyState();
  }

  const views = Array.isArray(raw.views) ? raw.views : [];

  return {
    version: OBJECT_TABLE_USER_VIEWS_STORAGE_VERSION,
    views: views
      .filter((item) => item && typeof item === "object" && item.id && item.key)
      .map((item) => ({
        id: String(item.id),
        key: String(item.key),
        name: String(item.name || item.key),
        isFavorite: Boolean(item.isFavorite),
        isDefault: Boolean(item.isDefault),
        isVisible: item.isVisible !== false,
        slot:
          item.slot != null && Number.isFinite(Number(item.slot))
            ? Number(item.slot)
            : null,
        sourcePublishedKey:
          typeof item.sourcePublishedKey === "string"
            ? item.sourcePublishedKey
            : null,
        settings_json:
          item.settings_json && typeof item.settings_json === "object"
            ? item.settings_json
            : {},
        filters_json:
          item.filters_json && typeof item.filters_json === "object"
            ? item.filters_json
            : {},
        layout_json:
          item.layout_json && typeof item.layout_json === "object"
            ? item.layout_json
            : {},
        visibility_json:
          item.visibility_json && typeof item.visibility_json === "object"
            ? item.visibility_json
            : {},
      })),
    defaultViewKey:
      typeof raw.defaultViewKey === "string" && raw.defaultViewKey.trim()
        ? raw.defaultViewKey.trim()
        : null,
  };
}

/**
 * @param {{ tenantId: string | number, userId?: string, objectTypeKey: string }} scope
 */
export function loadUserTableViewsState(scope) {
  const key = buildUserTableViewsStorageKey(scope);
  return normalizeState(readJson(key, createEmptyState()));
}

/**
 * @param {{ tenantId: string | number, userId?: string, objectTypeKey: string }} scope
 * @param {ReturnType<typeof createEmptyState>} state
 */
export function saveUserTableViewsState(scope, state) {
  const key = buildUserTableViewsStorageKey(scope);
  return writeJson(key, normalizeState(state));
}

function createUserViewId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `uv-${crypto.randomUUID()}`;
  }

  return `uv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function contractToStoredPayload(contract) {
  const payload = buildObjectViewPayload(contract, { mode: "update" });

  return {
    settings_json: payload.settings_json || {},
    filters_json: payload.filters_json || {},
    layout_json: payload.layout_json || {},
    visibility_json: payload.visibility_json || {},
  };
}

/**
 * Raw view shape for normalizeObjectViewDefinition (Office user view).
 */
export function userViewRecordToRawView(record) {
  return {
    id: record.id,
    key: record.key,
    name: record.name,
    view_type: "table",
    is_system: false,
    is_default: Boolean(record.isDefault),
    is_active: record.isVisible !== false,
    settings_json: record.settings_json || {},
    filters_json: record.filters_json || {},
    layout_json: record.layout_json || {},
    visibility_json: record.visibility_json || {},
  };
}

/**
 * @param {import('../../services/objectViewContract').ObjectViewContract} contract
 * @param {{ userViewId: string }} meta
 */
export function attachUserViewMeta(contract, meta) {
  return {
    ...contract,
    meta: {
      ...contract.meta,
      isUserView: true,
      isSystem: false,
      isPublished: true,
      viewId: null,
      userViewId: meta.userViewId,
      draftRevision: null,
    },
  };
}

/**
 * @param {{ tenantId, userId?, objectTypeKey }} scope
 * @param {{ name: string, contract: object, sourcePublishedKey?: string | null }} params
 */
export function createUserTableView(scope, { name, contract, sourcePublishedKey = null }) {
  const state = loadUserTableViewsState(scope);
  const trimmedName = String(name || "").trim();

  if (!trimmedName) {
    return { ok: false, reason: "empty_name" };
  }

  const existingKeys = [
    ...state.views.map((item) => item.key),
  ];

  const nextKey = generateViewKey(trimmedName, existingKeys);
  const storedPayload = contractToStoredPayload(contract);
  const id = createUserViewId();

  const record = {
    id,
    key: nextKey,
    name: trimmedName,
    isFavorite: false,
    isDefault: state.views.length === 0 && !state.defaultViewKey,
    isVisible: true,
    slot: null,
    sourcePublishedKey,
    ...storedPayload,
  };

  if (record.isDefault) {
    state.defaultViewKey = nextKey;
    for (const view of state.views) {
      view.isDefault = false;
    }
  }

  state.views.push(record);
  saveUserTableViewsState(scope, state);

  const normalized = normalizeObjectViewDefinition(userViewRecordToRawView(record), {
    viewKey: nextKey,
    isPublished: true,
  });

  return {
    ok: true,
    record,
    contract: attachUserViewMeta(
      { ...normalized, key: nextKey, name: trimmedName },
      { userViewId: id },
    ),
  };
}

export function updateUserTableViewContract(scope, userViewId, contract) {
  const state = loadUserTableViewsState(scope);
  const index = state.views.findIndex((item) => item.id === userViewId);

  if (index < 0) {
    return { ok: false, reason: "not_found" };
  }

  const storedPayload = contractToStoredPayload(contract);
  const current = state.views[index];

  state.views[index] = {
    ...current,
    name: String(contract.name || current.name),
    key: String(contract.key || current.key),
    ...storedPayload,
  };

  saveUserTableViewsState(scope, state);
  return { ok: true };
}

export function renameUserTableView(scope, userViewId, newName) {
  const state = loadUserTableViewsState(scope);
  const trimmedName = String(newName || "").trim();
  const view = state.views.find((item) => item.id === userViewId);

  if (!view || !trimmedName) {
    return { ok: false, reason: "invalid_input" };
  }

  view.name = trimmedName;
  saveUserTableViewsState(scope, state);
  return { ok: true };
}

export function deleteUserTableView(scope, userViewId) {
  const state = loadUserTableViewsState(scope);
  const removed = state.views.find((item) => item.id === userViewId);

  if (!removed) {
    return { ok: false, reason: "not_found" };
  }

  state.views = state.views.filter((item) => item.id !== userViewId);

  if (state.defaultViewKey === removed.key) {
    state.defaultViewKey = state.views[0]?.key ?? null;
    if (state.views[0]) {
      state.views[0].isDefault = true;
    }
  }

  saveUserTableViewsState(scope, state);
  return { ok: true, removedKey: removed.key };
}

export function setUserDefaultTableView(scope, viewKey) {
  const state = loadUserTableViewsState(scope);
  const normalizedKey = String(viewKey || "").trim();

  if (!normalizedKey) {
    return { ok: false, reason: "invalid_input" };
  }

  const target = state.views.find((item) => item.key === normalizedKey);

  if (!target) {
    state.defaultViewKey = normalizedKey;
    saveUserTableViewsState(scope, state);
    return { ok: true, isPublishedView: true };
  }

  for (const view of state.views) {
    view.isDefault = view.key === normalizedKey;
  }

  state.defaultViewKey = normalizedKey;
  saveUserTableViewsState(scope, state);
  return { ok: true, isPublishedView: false };
}
