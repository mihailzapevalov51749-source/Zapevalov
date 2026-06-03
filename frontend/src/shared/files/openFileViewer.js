import { resolveFileViewerPresentation } from "./resolveFileViewerPresentation";

export const OPEN_FILE_VIEWER_EVENT = "yasnopro:open-file-viewer";
export const CLOSE_FILE_VIEWER_EVENT = "yasnopro:close-file-viewer";

/**
 * @param {Record<string, unknown>} context
 * @returns {Record<string, unknown>}
 */
function normalizeViewerContext(context = {}) {
  if (!context || typeof context !== "object") {
    return {};
  }

  return { ...context };
}

/**
 * @param {unknown} raw
 * @param {{ sourceType: string, sourceId: string, context: Record<string, unknown> }} hints
 */
function normalizeReturnContext(raw, hints = {}) {
  const base =
    raw && typeof raw === "object" ? { ...raw } : {};
  const ctx = hints.context || {};

  if (!base.type && hints.sourceType === "object_entity_attachment") {
    base.type = "object_entity_card";
  }

  if (!base.entityId && !base.entity_id) {
    base.entityId =
      ctx.entityId ||
      ctx.entity_id ||
      ctx.runtime_entity_id ||
      hints.sourceId ||
      null;
  }

  if (!base.objectTypeKey && !base.object_type_key) {
    base.objectTypeKey = ctx.objectTypeKey || ctx.object_type_key || null;
  }

  if (base.tenantId == null && base.tenant_id == null) {
    base.tenantId = ctx.tenantId ?? ctx.tenant_id ?? null;
  }

  return Object.keys(base).length ? base : null;
}

/**
 * @param {Record<string, unknown>} payload
 */
export function normalizeOpenFileViewerPayload(payload = {}) {
  const fileId = String(
    payload.fileId || payload.file_id || payload.id || "",
  ).trim();
  const fileUrl = String(payload.fileUrl || payload.file_url || "").trim();
  const fileName = String(payload.fileName || payload.file_name || "Файл").trim();
  const fileType = String(
    payload.mimeType ||
      payload.mime_type ||
      payload.fileType ||
      payload.file_type ||
      "",
  ).trim();
  const sourceType = String(payload.sourceType || payload.source_type || "").trim();
  const sourceId = String(payload.sourceId || payload.source_id || "").trim();
  const context = normalizeViewerContext(payload.context);
  const returnContext = normalizeReturnContext(
    payload.returnContext || payload.return_context || context.returnContext,
    { sourceType, sourceId, context },
  );

  const initialContext = {
    ...context,
    source: context.source || sourceType || null,
    source_type: sourceType || context.source_type || null,
    source_id: sourceId || context.source_id || null,
    entity_type: context.entity_type || "file",
    entity_id: context.entity_id || fileId || null,
    file_id: context.file_id || fileId || null,
    file_url: context.file_url || fileUrl || null,
    file_name: context.file_name || fileName || null,
    tab: context.tab || "comments",
  };

  const normalized = {
    fileId,
    fileName,
    fileUrl,
    fileType,
    size: payload.size ?? payload.file_size ?? null,
    sourceType,
    sourceId,
    context,
    initialContext,
    userId: payload.userId || payload.user_id || null,
    userName: payload.userName || payload.user_name || null,
    mode: payload.mode || "view",
    presentation: resolveFileViewerPresentation({
      ...payload,
      sourceType,
      source_type: sourceType,
    }),
    returnContext,
  };

  return normalized;
}

export const REOPEN_OBJECT_ENTITY_CARD_EVENT =
  "yasnopro:reopen-object-entity-card";

/**
 * Opens the platform FileViewerWorkspace overlay (same shell as document library).
 *
 * @param {{
 *   fileId?: string,
 *   fileName?: string,
 *   fileUrl?: string,
 *   mimeType?: string,
 *   size?: number | null,
 *   sourceType?: string,
 *   sourceId?: string,
 *   context?: Record<string, unknown>,
 *   userId?: string | number,
 *   userName?: string,
 *   mode?: string,
 * }} payload
 */
export function openFileViewer(payload = {}) {
  const normalized = normalizeOpenFileViewerPayload(payload);

  if (!normalized.fileUrl && !normalized.fileId) {
    return false;
  }

  window.dispatchEvent(
    new CustomEvent(OPEN_FILE_VIEWER_EVENT, {
      detail: normalized,
    }),
  );

  return true;
}

export function closeFileViewer() {
  window.dispatchEvent(new CustomEvent(CLOSE_FILE_VIEWER_EVENT));
  window.__YASNOPRO_PENDING_NOTIFICATION_TARGET__ = null;
}
