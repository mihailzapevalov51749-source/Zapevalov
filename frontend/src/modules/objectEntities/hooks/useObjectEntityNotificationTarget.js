import { useCallback, useEffect } from "react";

import { subscribePendingTarget } from "../../notifications/navigation/notificationNavigationBus";
import { isRuntimeEntityNotificationTarget } from "../../notifications/navigation/notificationTargetRouting";
import {
  buildObjectEntityNotificationContext,
  resolveRuntimeEntityIdFromNotificationTarget,
} from "../services/buildObjectEntityNotificationContext";

function normalizeObjectTypeKey(value) {
  return String(value ?? "").trim();
}

function resolveTargetObjectTypeKey(target, fallbackObjectTypeKey) {
  const fromRef = normalizeObjectTypeKey(
    target?.publishedRuntimeRef?.object_type_key ||
      target?.published_runtime_ref?.object_type_key,
  );

  if (fromRef) {
    return fromRef;
  }

  return normalizeObjectTypeKey(fallbackObjectTypeKey);
}

function shouldHandleTargetForPage(target, objectTypeKey) {
  const refObjectTypeKey = normalizeObjectTypeKey(
    target?.publishedRuntimeRef?.object_type_key ||
      target?.published_runtime_ref?.object_type_key,
  );
  const pageObjectTypeKey = normalizeObjectTypeKey(objectTypeKey);

  if (!pageObjectTypeKey) {
    return true;
  }

  if (!refObjectTypeKey) {
    return true;
  }

  return refObjectTypeKey === pageObjectTypeKey;
}

/**
 * Opens Object Entity Card when a notification targets runtime_entity identity.
 */
export default function useObjectEntityNotificationTarget({
  enabled = true,
  entityCard,
  objectTypeKey = null,
}) {
  const handleNotificationTarget = useCallback(
    (target) => {
      if (!enabled || !entityCard?.openCard || !target) {
        return false;
      }

      if (!isRuntimeEntityNotificationTarget(target)) {
        return false;
      }

      const runtimeEntityId = resolveRuntimeEntityIdFromNotificationTarget(target);

      if (!runtimeEntityId) {
        return false;
      }

      if (!shouldHandleTargetForPage(target, objectTypeKey)) {
        return false;
      }

      const resolvedObjectTypeKey = resolveTargetObjectTypeKey(
        target,
        objectTypeKey,
      );

      void entityCard.openCard(runtimeEntityId, {
        initialContext: buildObjectEntityNotificationContext(target),
        objectTypeKey: resolvedObjectTypeKey || objectTypeKey,
      });

      return true;
    },
    [enabled, entityCard, objectTypeKey],
  );

  useEffect(() => {
    if (!enabled || !entityCard?.openCard) {
      return undefined;
    }

    const pendingTarget = window.__YASNOPRO_PENDING_NOTIFICATION_TARGET__;

    if (pendingTarget) {
      handleNotificationTarget(pendingTarget);
    }

    return subscribePendingTarget((target) => {
      handleNotificationTarget(target);
    });
  }, [enabled, entityCard, handleNotificationTarget]);
}

