import { useCallback, useEffect, useMemo, useState } from "react";

import {
  compactPinnedViewKeys,
  readHiddenViewKeys,
  readPinnedViewKeys,
  readVisibleSlotsLimit,
  writeHiddenViewKeys,
  writePinnedViewKeys,
  writeVisibleSlotsLimit,
} from "./objectTableRepresentationsPrefs";
import { sanitizePinnedViewKeys } from "../preferences/tableRepresentationSlots";
import { getViewIdentity } from "../../services/resolveActiveView";

function areStringArraysEqual(left = [], right = []) {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (String(left[index]) !== String(right[index])) {
      return false;
    }
  }

  return true;
}

function normalizeObjectViewRow(item, index) {
  const contract = item?.contract || item || {};
  const key = String(contract?.key || contract?.meta?.viewId || index).trim();

  return {
    key,
    contract,
    name: String(contract?.name || key || "Без названия"),
    isDefault: contract?.meta?.isDefault === true,
    position: Number.isFinite(Number(contract?.meta?.position))
      ? Number(contract.meta.position)
      : index,
  };
}

/**
 * UX state for Object Table representations bar (reference: useTableRepresentationsBarState).
 */
export default function useObjectTableRepresentationsBar({
  objectTypeKey = "",
  prefsScopeKey = null,
  views = [],
  activeViewKey = "",
  onSelectView,
  isDirty = false,
  dirtyGuard,
  visibilityRevision = 0,
}) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [visibleSlotsLimit, setVisibleSlotsLimitState] = useState(() =>
    readVisibleSlotsLimit(objectTypeKey, 2, prefsScopeKey),
  );
  const [pinnedKeys, setPinnedKeys] = useState(() =>
    readPinnedViewKeys(objectTypeKey, prefsScopeKey),
  );
  const [hiddenKeys, setHiddenKeys] = useState(() =>
    readHiddenViewKeys(objectTypeKey, prefsScopeKey),
  );

  const normalizedViews = useMemo(() => {
    const list = Array.isArray(views) ? views.filter(Boolean) : [];

    return list
      .map((item, index) => normalizeObjectViewRow(item, index))
      .sort((a, b) => a.position - b.position);
  }, [views]);

  const hiddenSet = useMemo(() => new Set(hiddenKeys.map(String)), [hiddenKeys]);

  const viewsWithVisibility = useMemo(() => {
    return normalizedViews.map((view) => ({
      ...view,
      isVisible: !hiddenSet.has(view.key),
    }));
  }, [normalizedViews, hiddenSet]);

  const visibleViews = useMemo(
    () => viewsWithVisibility.filter((view) => view.isVisible),
    [viewsWithVisibility],
  );

  const existingKeys = useMemo(
    () => new Set(normalizedViews.map((view) => view.key)),
    [normalizedViews],
  );

  const visibleKeyList = useMemo(
    () => visibleViews.map((view) => view.key),
    [visibleViews],
  );

  const syncKey = useMemo(
    () =>
      `${objectTypeKey}::${visibleKeyList.join(",")}::${visibleSlotsLimit}`,
    [objectTypeKey, visibleKeyList, visibleSlotsLimit],
  );

  useEffect(() => {
    setVisibleSlotsLimitState(readVisibleSlotsLimit(objectTypeKey, 2, prefsScopeKey));

    const slotViews = (Array.isArray(views) ? views : [])
      .map((item, index) => normalizeObjectViewRow(item, index));

    const sanitizedPinned = sanitizePinnedViewKeys(
      readPinnedViewKeys(objectTypeKey, prefsScopeKey),
      slotViews,
    );

    setPinnedKeys(sanitizedPinned);

    if (
      sanitizedPinned.length !== readPinnedViewKeys(objectTypeKey, prefsScopeKey).length
    ) {
      writePinnedViewKeys(objectTypeKey, sanitizedPinned, prefsScopeKey);
    }

    const allowedKeys = new Set(slotViews.map((view) => view.key));
    const rawHidden = readHiddenViewKeys(objectTypeKey, prefsScopeKey);
    const sanitizedHidden = rawHidden.filter((key) => allowedKeys.has(String(key)));

    setHiddenKeys(sanitizedHidden);

    if (sanitizedHidden.length !== rawHidden.length) {
      writeHiddenViewKeys(objectTypeKey, sanitizedHidden, prefsScopeKey);
    }
  }, [objectTypeKey, prefsScopeKey, visibilityRevision, views]);

  useEffect(() => {
    setPinnedKeys((current) => {
      const next = compactPinnedViewKeys({
        pinnedKeys: current,
        visibleKeys: visibleKeyList,
        existingKeys,
        limit: visibleSlotsLimit,
      });

      if (!areStringArraysEqual(current, next)) {
        writePinnedViewKeys(objectTypeKey, next, prefsScopeKey);
        return next;
      }

      return current;
    });
  }, [syncKey, objectTypeKey, prefsScopeKey, visibleKeyList, existingKeys, visibleSlotsLimit]);

  const pinnedViews = useMemo(() => {
    return pinnedKeys
      .slice(0, visibleSlotsLimit)
      .map((key) => visibleViews.find((view) => view.key === key))
      .filter(Boolean);
  }, [pinnedKeys, visibleViews, visibleSlotsLimit]);

  const runGuarded = dirtyGuard?.runGuarded || ((action) => action?.());

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const togglePanel = useCallback(() => {
    setIsPanelOpen((current) => !current);
  }, []);

  const setVisibleSlotsLimit = useCallback(
    (nextValue) => {
      const normalized = Math.max(1, Math.min(2, Number(nextValue) || 2));

      setVisibleSlotsLimitState(normalized);
      writeVisibleSlotsLimit(objectTypeKey, normalized, prefsScopeKey);
    },
    [objectTypeKey, prefsScopeKey],
  );

  const getPinnedSlotIndex = useCallback(
    (view) => {
      const index = pinnedKeys.findIndex((key) => key === String(view?.key));

      return index >= 0 ? index : null;
    },
    [pinnedKeys],
  );

  const replacePinnedSlot = useCallback(
    (view, slotIndex) => {
      if (!view?.isVisible) {
        return;
      }

      const viewKey = String(view.key);
      const normalizedSlot = Number(slotIndex);

      if (
        !Number.isInteger(normalizedSlot) ||
        normalizedSlot < 0 ||
        normalizedSlot >= visibleSlotsLimit
      ) {
        return;
      }

      setPinnedKeys((current) => {
        const base = compactPinnedViewKeys({
          pinnedKeys: current,
          visibleKeys: visibleKeyList,
          existingKeys,
          limit: visibleSlotsLimit,
        });

        const next = [...base];
        const displaced = next[normalizedSlot];
        const existingIndex = next.indexOf(viewKey);

        if (existingIndex >= 0) {
          next[existingIndex] = displaced || viewKey;
        }

        next[normalizedSlot] = viewKey;

        const compacted = compactPinnedViewKeys({
          pinnedKeys: next,
          visibleKeys: visibleKeyList,
          existingKeys,
          limit: visibleSlotsLimit,
        });

        writePinnedViewKeys(objectTypeKey, compacted, prefsScopeKey);
        return compacted;
      });
    },
    [existingKeys, objectTypeKey, prefsScopeKey, visibleKeyList, visibleSlotsLimit],
  );

  const toggleViewVisibility = useCallback(
    (view) => {
      const key = String(view?.key || "").trim();

      if (!key) {
        return;
      }

      setHiddenKeys((current) => {
        const set = new Set(current.map(String));
        const willHide = !set.has(key);

        if (willHide) {
          set.add(key);
        } else {
          set.delete(key);
        }

        const next = Array.from(set);
        writeHiddenViewKeys(objectTypeKey, next, prefsScopeKey);
        return next;
      });
    },
    [objectTypeKey, prefsScopeKey],
  );

  const selectView = useCallback(
    (view) => {
      if (!view?.isVisible) {
        return;
      }

      const key = String(view.key || "").trim();

      const activeIdentity = String(activeViewKey || "").trim();

      if (!key || getViewIdentity(view) === activeIdentity || key === activeIdentity) {
        closePanel();
        return;
      }

      runGuarded(() => {
        onSelectView?.(key);
        closePanel();
      });
    },
    [activeViewKey, closePanel, onSelectView, runGuarded],
  );

  useEffect(() => {
    if (!activeViewKey) {
      return;
    }

    const activeIdentity = String(activeViewKey || "").trim();
    const active = viewsWithVisibility.find(
      (view) => getViewIdentity(view) === activeIdentity || view.key === activeIdentity,
    );

    if (!active || active.isVisible) {
      return;
    }

    const fallback = visibleViews.find((view) => view.key !== String(activeViewKey));

    if (fallback) {
      onSelectView?.(fallback.key);
    }
  }, [activeViewKey, onSelectView, viewsWithVisibility, visibleViews]);

  return {
    isPanelOpen,
    togglePanel,
    closePanel,
    visibleSlotsLimit,
    setVisibleSlotsLimit,
    normalizedViews: viewsWithVisibility,
    visibleViews,
    pinnedViews,
    pinnedSlots: Array.from({ length: visibleSlotsLimit }, (_, index) => ({
      index,
      view: pinnedViews[index] || null,
    })),
    getPinnedSlotIndex,
    replacePinnedSlot,
    toggleViewVisibility,
    selectView,
    isDirty,
  };
}
