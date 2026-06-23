import { buildRuntimeAuthHeaders, hasRuntimeAuthToken } from "./runtimeFetch.js";
import {
  getApiErrorMessage,
  platformApiClient,
} from "./authenticatedApiClient";

function buildAuthHeaders() {
  return buildRuntimeAuthHeaders();
}

export async function getNavigationTree(portalId, options = {}) {
  const params = {};
  if (options?.scope) {
    params.scope = options.scope;
  }
  if (options?.mode) {
    params.mode = options.mode;
  }
  if (options?.context) {
    params.context = options.context;
  }
  if (options?.forEditMode) {
    params.for_edit_mode = true;
  }

  const hasParams = Object.keys(params).length > 0;
  const res = await platformApiClient.get(
    `/navigation/portal/${portalId}/tree`,
    hasParams ? { params } : undefined,
  );
  return res.data;
}

export async function getNavigationList(portalId) {
  const res = await platformApiClient.get(`/navigation/portal/${portalId}`);
  return res.data;
}

export async function createNavigationItem(portalId, data) {
  const res = await platformApiClient.post(`/navigation/portal/${portalId}/`, {
    ...data,
    portal_id: portalId,
  });
  return res.data;
}

export async function updateNavigationItem(portalId, itemId, data) {
  const res = await platformApiClient.put(
    `/navigation/portal/${portalId}/${itemId}`,
    data,
  );
  return res.data;
}

export async function deleteNavigationItem(portalId, itemId) {
  if (!hasRuntimeAuthToken()) {
    throw new Error("Требуется авторизация. Войдите в систему и повторите удаление.");
  }

  const res = await platformApiClient.delete(
    `/navigation/portal/${portalId}/${itemId}`,
    {
      headers: buildAuthHeaders(),
    },
  );
  return res.data;
}

export async function moveNavigationItems(portalId, items) {
  const res = await platformApiClient.post(
    `/navigation/portal/${portalId}/move`,
    items,
  );
  return res.data;
}

const DELETE_ERROR_MESSAGES = {
  401: "Требуется авторизация. Войдите в систему и повторите удаление.",
  403: "Недостаточно прав для удаления пункта меню.",
  404: "Пункт меню не найден.",
  409: "Пункт меню нельзя удалить: сначала удалите дочерние пункты.",
  500: "Не удалось удалить пункт меню. Попробуйте позже.",
};

export function resolveNavigationDeleteError(error, fallback = "Не удалось удалить пункт меню.") {
  const status = Number(error?.response?.status);
  const apiMessage = getApiErrorMessage(error, "");

  if (apiMessage) {
    return apiMessage;
  }

  if (DELETE_ERROR_MESSAGES[status]) {
    return DELETE_ERROR_MESSAGES[status];
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export { getApiErrorMessage };
