import { normalizeObjectTypeColor } from "../../../shared/icons/iconFileUtils";
import { computeObjectTypePublishFlags } from "./objectTypePublishState";

/**
 * UI lifecycle mapping for Object Type workspace publish/save actions.
 */
export const OBJECT_TYPE_LIFECYCLE_STATES = {
  UNSAVED_DRAFT: "unsaved_draft",
  SAVED_UNPUBLISHED: "saved_unpublished",
  PUBLISHED_SYNCED: "published_synced",
  PENDING_CONTENT_UPDATE: "pending_content_update",
};

/**
 * @param {{
 *   isDirty: boolean;
 *   objectType?: object | null;
 *   catalogVersion?: string | number | null;
 *   hasMenuPlacement?: boolean;
 * }} params
 */
export function resolveObjectTypeLifecycleState({
  isDirty = false,
  objectType = null,
  catalogVersion = null,
  hasMenuPlacement = false,
}) {
  const flags = computeObjectTypePublishFlags(objectType, {
    catalogVersion,
    hasMenuPlacement,
  });

  if (isDirty) {
    return {
      ...flags,
      state: OBJECT_TYPE_LIFECYCLE_STATES.UNSAVED_DRAFT,
      saveVariant: "primary",
      publishVariant: "muted",
      publishLabel: "Опубликовать",
      saveDisabled: false,
      publishDisabled: true,
      publishAction: "none",
    };
  }

  if (flags.publishAction === "update-catalog") {
    return {
      ...flags,
      state: OBJECT_TYPE_LIFECYCLE_STATES.PENDING_CONTENT_UPDATE,
      saveVariant: "outline",
      publishVariant: "warning",
      publishLabel: "Обновить публикацию",
      saveDisabled: false,
      publishDisabled: false,
      publishAction: "update-catalog",
    };
  }

  if (flags.publishAction === "wizard") {
    return {
      ...flags,
      state: OBJECT_TYPE_LIFECYCLE_STATES.SAVED_UNPUBLISHED,
      saveVariant: "outline",
      publishVariant: "primary",
      publishLabel: "Опубликовать",
      saveDisabled: false,
      publishDisabled: false,
      publishAction: "wizard",
    };
  }

  if (flags.hasPublishedBaseline) {
    return {
      ...flags,
      state: OBJECT_TYPE_LIFECYCLE_STATES.PUBLISHED_SYNCED,
      saveVariant: "neutral",
      publishVariant: "success",
      publishLabel: "Опубликовано",
      saveDisabled: false,
      publishDisabled: true,
      publishAction: "none",
    };
  }

  return {
    ...flags,
    state: OBJECT_TYPE_LIFECYCLE_STATES.SAVED_UNPUBLISHED,
    saveVariant: "outline",
    publishVariant: "primary",
    publishLabel: "Опубликовать",
    saveDisabled: false,
    publishDisabled: false,
    publishAction: "wizard",
  };
}

export function getObjectTypeFormSnapshot(objectType) {
  if (!objectType) {
    return null;
  }

  return {
    name: objectType.name || "",
    description: objectType.description || "",
    icon_type: objectType.icon_type ?? null,
    icon_file_url: objectType.icon_file_url ?? null,
    color: normalizeObjectTypeColor(objectType.color),
    status: objectType.status || "active",
  };
}

export function isObjectTypeFormDirty(form, objectType) {
  const snapshot = getObjectTypeFormSnapshot(objectType);
  if (!snapshot || !form) {
    return false;
  }

  return (
    form.name !== snapshot.name ||
    form.description !== snapshot.description ||
    form.icon_type !== snapshot.icon_type ||
    form.icon_file_url !== snapshot.icon_file_url ||
    form.color !== snapshot.color ||
    form.status !== snapshot.status
  );
}
