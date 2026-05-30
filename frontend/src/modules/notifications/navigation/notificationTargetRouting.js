// Keep in sync with shared/entityIdentity COMMUNICATION_ENTITY_TYPE_RUNTIME_ENTITY.
const COMMUNICATION_ENTITY_TYPE_RUNTIME_ENTITY = "runtime_entity";
function isRuntimeEntityCommunicationType(entityType) {
  return (
    String(entityType ?? "").trim() === COMMUNICATION_ENTITY_TYPE_RUNTIME_ENTITY
  );
}

function normalizeId(value) {
  return String(value ?? "").trim();
}

export function resolveNotificationEntityIdentity(context = {}) {
  const entityType = normalizeId(context.entity_type || context.entityType);
  const entityId = normalizeId(context.entity_id || context.entityId);

  return { entityType, entityId };
}

export function isRuntimeEntityNotificationTarget(targetOrContext) {
  if (!targetOrContext || typeof targetOrContext !== "object") {
    return false;
  }

  const type = normalizeId(targetOrContext.type);

  if (
    type === "runtime_entity_card" ||
    type === "published_runtime_reference"
  ) {
    return true;
  }

  if (targetOrContext.publishedRuntimeRef?.runtime_entity_id) {
    return true;
  }

  if (targetOrContext.published_runtime_ref?.runtime_entity_id) {
    return true;
  }

  const { entityType } = resolveNotificationEntityIdentity(targetOrContext);

  return isRuntimeEntityCommunicationType(entityType);
}

export function isFileNotificationTarget(targetOrContext) {
  if (!targetOrContext || typeof targetOrContext !== "object") {
    return false;
  }

  const type = normalizeId(targetOrContext.type);
  if (type === "library_file" || type === "uploaded_file") {
    return true;
  }

  const source = normalizeId(targetOrContext.source);

  if (source === "library_file" || source === "uploaded_file") {
    return true;
  }

  const entityType = normalizeId(
    targetOrContext.entity_type || targetOrContext.entityType,
  );

  if (entityType === "file") {
    return true;
  }

  const fileId = normalizeId(
    targetOrContext.fileId ||
      targetOrContext.file_id ||
      targetOrContext.context?.file_id,
  );

  return Boolean(fileId);
}

export function isBlockedNotificationTarget(targetOrContext) {
  const type = normalizeId(targetOrContext?.type);
  return (
    type === "notification_unavailable" ||
    type === "runtime_context_missing" ||
    type === "access_denied"
  );
}

export function resolveRuntimeRouteFromPublishedRef(
  publishedRuntimeRef,
  portalId = 1,
) {
  if (!publishedRuntimeRef || typeof publishedRuntimeRef !== "object") {
    return null;
  }

  const explicitRoute = normalizeId(
    publishedRuntimeRef.runtime_route || publishedRuntimeRef.runtimeRoute,
  );

  if (explicitRoute) {
    return explicitRoute;
  }

  const objectTypeKey = normalizeId(
    publishedRuntimeRef.object_type_key || publishedRuntimeRef.objectTypeKey,
  );

  if (!objectTypeKey) {
    return null;
  }

  const pid = Number(portalId) || 1;

  return `/portal/${pid}/object-types/${encodeURIComponent(objectTypeKey)}`;
}

export function resolvePortalIdFromPathname(pathname = "") {
  const portalMatch = String(pathname || "").match(/\/portal\/(\d+)/);
  if (portalMatch) {
    return Number(portalMatch[1]) || 1;
  }

  const designerMatch = String(pathname || "").match(/\/designer\/tenant\/(\d+)/);
  if (designerMatch) {
    return Number(designerMatch[1]) || 1;
  }

  return 1;
}

export function resolveObjectOverlayContext(pendingTarget) {
  if (!pendingTarget || typeof pendingTarget !== "object") {
    return null;
  }

  const runtimeEntityId = normalizeId(
    pendingTarget?.publishedRuntimeRef?.runtime_entity_id ||
      pendingTarget?.published_runtime_ref?.runtime_entity_id ||
      (normalizeId(pendingTarget?.type) === "runtime_entity_card"
        ? pendingTarget?.entityId
        : "") ||
      (isRuntimeEntityCommunicationType(pendingTarget?.entityType)
        ? pendingTarget?.entityId
        : ""),
  );

  const objectTypeKey = normalizeId(
    pendingTarget?.publishedRuntimeRef?.object_type_key ||
      pendingTarget?.published_runtime_ref?.object_type_key ||
      pendingTarget?.objectTypeKey,
  );

  if (!runtimeEntityId || !objectTypeKey) {
    return null;
  }

  return { runtimeEntityId, objectTypeKey };
}

export function isDesignerPathname(pathname = "") {
  return String(pathname || "").includes("/designer/");
}

/**
 * @returns {"open_object_overlay"|"open_file_overlay"|"open_chat"|"blocked"}
 */
export function resolveNotificationNavigationOutcome(
  pendingTarget,
  { pathname = "", user = null } = {},
) {
  void pathname;
  void user;

  if (!pendingTarget || typeof pendingTarget !== "object") {
    return {
      action: "blocked",
      blockedTarget: {
        type: "notification_unavailable",
        message:
          "Не удалось открыть объект. Уведомление создано по устаревшему формату.",
      },
    };
  }

  if (isBlockedNotificationTarget(pendingTarget)) {
    return { action: "blocked", blockedTarget: pendingTarget };
  }

  if (normalizeId(pendingTarget.type) === "chat_message") {
    return { action: "open_chat" };
  }

  if (isRuntimeEntityNotificationTarget(pendingTarget)) {
    const overlayContext = resolveObjectOverlayContext(pendingTarget);

    if (!overlayContext) {
      return {
        action: "blocked",
        blockedTarget: {
          type: "runtime_context_missing",
          message:
            "Контекст уведомления недоступен. Объект не опубликован или ссылка устарела.",
          detail: pendingTarget.detail || null,
        },
      };
    }

    return {
      action: "open_object_overlay",
      overlayTarget: pendingTarget,
      overlayContext,
    };
  }

  if (isFileNotificationTarget(pendingTarget)) {
    return { action: "open_file_overlay" };
  }

  return {
    action: "blocked",
    blockedTarget: {
      type: "notification_unavailable",
      message:
        pendingTarget.message ||
        "Не удалось открыть объект. Уведомление создано по устаревшему формату.",
      detail: pendingTarget.detail || null,
    },
  };
}
