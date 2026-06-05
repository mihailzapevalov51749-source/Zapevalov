import {
  createOfficeUserTableView,
  deleteOfficeUserTableView,
  listOfficeUserTableViews,
  updateOfficeUserTableView,
} from "../../api/officeUserTableViewsApi";
import { buildObjectViewPayload } from "../../services/buildObjectViewPayload";
import { generateViewKey } from "../../services/generateViewKey";
import { normalizeObjectViewDefinition } from "../../services/normalizeObjectViewDefinition";
import {
  attachUserViewMeta,
  buildUserTableViewsStorageKey,
  loadUserTableViewsState,
  saveUserTableViewsState,
  userViewRecordToRawView,
} from "./objectTableUserViewsStorage";

function apiViewToRecord(apiView) {
  return {
    id: String(apiView.id),
    key: String(apiView.key),
    name: String(apiView.name || apiView.key),
    isFavorite: false,
    isDefault: Boolean(apiView.is_default),
    isVisible: apiView.is_visible !== false,
    slot: null,
    sourcePublishedKey: null,
    settings_json:
      apiView.settings_json && typeof apiView.settings_json === "object"
        ? apiView.settings_json
        : {},
    filters_json:
      apiView.filters_json && typeof apiView.filters_json === "object"
        ? apiView.filters_json
        : {},
    layout_json:
      apiView.layout_json && typeof apiView.layout_json === "object"
        ? apiView.layout_json
        : {},
    visibility_json:
      apiView.visibility_json && typeof apiView.visibility_json === "object"
        ? apiView.visibility_json
        : {},
  };
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

function recordToContract(record, { pageSize = 20 } = {}) {
  const raw = userViewRecordToRawView(record);
  const contract = normalizeObjectViewDefinition(raw, {
    viewKey: record.key,
    pageSize,
    isPublished: true,
  });

  return attachUserViewMeta(
    {
      ...contract,
      key: record.key,
      name: record.name,
      meta: {
        ...contract.meta,
        isDefault: Boolean(record.isDefault),
        isSystem: false,
      },
    },
    { userViewId: record.id },
  );
}

/**
 * @param {{ tenantId: string | number, objectTypeKey: string }} scope
 */
export async function fetchUserTableViewsState(scope, { pageSize = 20 } = {}) {
  const tenantId = Number(scope.tenantId);

  if (!tenantId || !scope.objectTypeKey) {
    return loadUserTableViewsState(scope);
  }

  try {
    const remote = await listOfficeUserTableViews(tenantId, scope.objectTypeKey);
    const views = Array.isArray(remote?.views)
      ? remote.views.map(apiViewToRecord)
      : [];

    if (views.length) {
      return {
        version: 1,
        views,
        defaultViewId: remote?.default_view_id
          ? String(remote.default_view_id)
          : null,
        defaultViewKey: remote?.default_view_key || null,
      };
    }

    const localState = loadUserTableViewsState(scope);

    if (!localState.views.length) {
      return localState;
    }

    const migratedViews = [];

    for (const localView of localState.views) {
      const payload = {
        key: localView.key,
        name: localView.name,
        is_default: Boolean(localView.isDefault),
        is_visible: localView.isVisible !== false,
        settings_json: localView.settings_json || {},
        filters_json: localView.filters_json || {},
        layout_json: localView.layout_json || {},
        visibility_json: localView.visibility_json || {},
      };

      const created = await createOfficeUserTableView(
        tenantId,
        scope.objectTypeKey,
        payload,
      );

      migratedViews.push(apiViewToRecord(created));
    }

    if (localState.defaultViewKey) {
      const defaultRecord = migratedViews.find(
        (item) => item.key === localState.defaultViewKey,
      );

      if (defaultRecord) {
        await updateOfficeUserTableView(
          tenantId,
          scope.objectTypeKey,
          defaultRecord.id,
          { is_default: true },
        );
        defaultRecord.isDefault = true;
      }
    }

    const migratedState = {
      version: 1,
      views: migratedViews,
      defaultViewKey: localState.defaultViewKey,
    };

    saveUserTableViewsState(scope, { views: [], defaultViewKey: null });

    return migratedState;
  } catch (error) {
    console.error(
      "[officeUserViews] Failed to load user table views from API",
      error,
    );

    const localState = loadUserTableViewsState(scope);

    if (localState.views.length) {
      return localState;
    }

    throw error;
  }
}

/**
 * @param {{ tenantId, objectTypeKey }} scope
 * @param {{ name: string, contract: object, sourcePublishedKey?: string | null }} params
 */
export async function createUserTableViewRemote(scope, params, { pageSize = 20 } = {}) {
  const tenantId = Number(scope.tenantId);
  const trimmedName = String(params.name || "").trim();

  if (!trimmedName) {
    return { ok: false, reason: "empty_name" };
  }

  const state = await fetchUserTableViewsState(scope, { pageSize });
  const existingKeys = state.views.map((item) => item.key);
  const nextKey = generateViewKey(trimmedName, existingKeys);
  const storedPayload = contractToStoredPayload(params.contract);

  const payload = {
    key: nextKey,
    name: trimmedName,
    is_default: state.views.length === 0 && !state.defaultViewKey,
    is_visible: true,
    ...storedPayload,
  };

  const created = await createOfficeUserTableView(
    tenantId,
    scope.objectTypeKey,
    payload,
  );

  const record = apiViewToRecord(created);

  return {
    ok: true,
    record,
    contract: recordToContract(record, { pageSize }),
  };
}

export async function updateUserTableViewContractRemote(
  scope,
  userViewId,
  contract,
  { pageSize = 20 } = {},
) {
  const tenantId = Number(scope.tenantId);
  const storedPayload = contractToStoredPayload(contract);

  const updated = await updateOfficeUserTableView(
    tenantId,
    scope.objectTypeKey,
    userViewId,
    {
      name: String(contract.name || "").trim() || undefined,
      ...storedPayload,
    },
  );

  const record = apiViewToRecord(updated);

  return {
    ok: true,
    record,
    contract: recordToContract(record, { pageSize }),
  };
}

export async function renameUserTableViewRemote(scope, userViewId, newName) {
  const tenantId = Number(scope.tenantId);
  const trimmedName = String(newName || "").trim();

  if (!trimmedName) {
    return { ok: false, reason: "invalid_input" };
  }

  await updateOfficeUserTableView(tenantId, scope.objectTypeKey, userViewId, {
    name: trimmedName,
  });

  return { ok: true };
}

export async function deleteUserTableViewRemote(scope, userViewId) {
  const tenantId = Number(scope.tenantId);
  const state = await fetchUserTableViewsState(scope);
  const removed = state.views.find((item) => item.id === userViewId);

  if (!removed) {
    return { ok: false, reason: "not_found" };
  }

  await deleteOfficeUserTableView(tenantId, scope.objectTypeKey, userViewId);

  return { ok: true, removedKey: removed.key };
}

export async function setUserDefaultTableViewRemote(scope, viewKey) {
  const tenantId = Number(scope.tenantId);
  const normalizedKey = String(viewKey || "").trim();

  if (!normalizedKey) {
    return { ok: false, reason: "invalid_input" };
  }

  const state = await fetchUserTableViewsState(scope);
  const target = state.views.find((item) => item.key === normalizedKey);

  if (!target) {
    return { ok: true, isPublishedView: true };
  }

  if (target.isDefault) {
    return { ok: true, isPublishedView: false, viewKey: normalizedKey, skipped: true };
  }

  await updateOfficeUserTableView(tenantId, scope.objectTypeKey, target.id, {
    is_default: true,
  });

  return { ok: true, isPublishedView: false, viewKey: normalizedKey };
}
