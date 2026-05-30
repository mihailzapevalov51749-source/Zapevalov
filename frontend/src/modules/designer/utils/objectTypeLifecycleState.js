import { normalizeObjectTypeColor } from "../../../shared/icons/iconFileUtils";

/**
 * UI-only lifecycle mapping for Object Type workspace actions.
 * Backend publish/draft sync is not wired yet — flags are frontend placeholders.
 */
export const OBJECT_TYPE_LIFECYCLE_STATES = {
  UNSAVED_DRAFT: "unsaved_draft",
  SAVED_UNPUBLISHED: "saved_unpublished",
  PUBLISHED_SYNCED: "published_synced",
  PENDING_REPUBLISH: "pending_republish",
};

/**
 * @param {{
 *   isDirty: boolean;
 *   needsPublish: boolean;
 *   hasPublishedBaseline: boolean;
 * }} params
 */
export function resolveObjectTypeLifecycleState({
  isDirty = false,
  needsPublish = false,
  hasPublishedBaseline = false,
}) {
  if (isDirty) {
    return {
      state: OBJECT_TYPE_LIFECYCLE_STATES.UNSAVED_DRAFT,
      saveVariant: "primary",
      publishVariant: "muted",
      publishLabel: "Опубликовать",
      saveDisabled: false,
      publishDisabled: true,
    };
  }

  if (needsPublish) {
    if (hasPublishedBaseline) {
      return {
        state: OBJECT_TYPE_LIFECYCLE_STATES.PENDING_REPUBLISH,
        saveVariant: "outline",
        publishVariant: "warning",
        publishLabel: "Требует публикации",
        saveDisabled: false,
        publishDisabled: false,
      };
    }

    return {
      state: OBJECT_TYPE_LIFECYCLE_STATES.SAVED_UNPUBLISHED,
      saveVariant: "outline",
      publishVariant: "primary",
      publishLabel: "Опубликовать",
      saveDisabled: false,
      publishDisabled: false,
    };
  }

  return {
    state: OBJECT_TYPE_LIFECYCLE_STATES.PUBLISHED_SYNCED,
    saveVariant: "neutral",
    publishVariant: "success",
    publishLabel: "Опубликовать",
    saveDisabled: false,
    publishDisabled: false,
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
