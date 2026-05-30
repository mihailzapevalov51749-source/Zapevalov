import { useCallback, useEffect, useMemo, useState } from "react";

import {
  isObjectViewQueryDirty,
  mergeEffectiveContract,
} from "../services/mergeEffectiveContract";
import { normalizePresentationTable } from "../services/contractGuards";
import {
  getProjectionFieldKeys,
  resolvePanelColumnOrder,
} from "../services/columnPresentationUtils";
import {
  buildQuickSavedFilter,
  cloneFilterConditions,
  getQuickFilters,
} from "../services/savedFilterUtils";

const EMPTY_SESSION_DELTA = {
  filterConditions: null,
  sortRules: null,
  savedFilters: null,
  defaultQuickFilterId: undefined,
  hiddenFieldKeys: null,
  columnOrder: null,
  columnWidths: null,
  density: undefined,
  cardLayout: null,
};

/**
 * Transient session layered on top of resolved view contract.
 */
export default function useObjectViewSession({
  resolvedContract,
  activeViewKey = null,
}) {
  const [sessionDelta, setSessionDelta] = useState(EMPTY_SESSION_DELTA);
  const [activeQuickFilterId, setActiveQuickFilterId] = useState(null);

  // Do not include projection field keys: catalog/projection sync must not wipe session deltas.
  const baselineKey = `${activeViewKey || ""}:${resolvedContract?.meta?.viewId || ""}`;

  useEffect(() => {
    setSessionDelta(EMPTY_SESSION_DELTA);

    const defaultId = resolvedContract?.query?.filters?.defaultQuickFilterId;
    setActiveQuickFilterId(defaultId ? String(defaultId) : null);
  }, [baselineKey, resolvedContract?.query?.filters?.defaultQuickFilterId]);

  const sessionState = useMemo(
    () => ({
      activeQuickFilterId,
      filterConditions:
        sessionDelta.filterConditions != null
          ? sessionDelta.filterConditions
          : [],
      sortRules:
        sessionDelta.sortRules != null ? sessionDelta.sortRules : null,
    }),
    [sessionDelta, activeQuickFilterId],
  );

  const effectiveContract = useMemo(() => {
    if (!resolvedContract) {
      return null;
    }

    return mergeEffectiveContract(resolvedContract, sessionDelta);
  }, [resolvedContract, sessionDelta]);

  const isDirty = useMemo(() => {
    if (!resolvedContract || !effectiveContract) {
      return false;
    }

    return isObjectViewQueryDirty(resolvedContract, effectiveContract);
  }, [resolvedContract, effectiveContract]);

  const getEffectiveSavedFilters = useCallback(() => {
    return effectiveContract?.query?.filters?.savedFilters || [];
  }, [effectiveContract]);

  const patchSession = useCallback((patch = {}) => {
    setSessionDelta((current) => ({
      ...current,
      ...patch,
    }));
  }, []);

  const resetSession = useCallback(() => {
    setSessionDelta(EMPTY_SESSION_DELTA);
    setActiveQuickFilterId(null);
  }, []);

  const markSaved = useCallback(() => {
    setSessionDelta(EMPTY_SESSION_DELTA);
  }, []);

  const setActiveQuickFilter = useCallback(
    (filterId) => {
      const normalized =
        filterId == null || filterId === "" ? null : String(filterId);
      setActiveQuickFilterId(normalized);
    },
    [],
  );

  const createQuickFilterFromCurrent = useCallback(
    ({ label }) => {
      const trimmedLabel = String(label || "").trim();
      if (!trimmedLabel) {
        return { ok: false, reason: "empty_label" };
      }

      const currentConditions =
        sessionDelta.filterConditions != null
          ? sessionDelta.filterConditions
          : resolvedContract?.query?.filters?.conditions || [];

      if (!currentConditions.length) {
        return { ok: false, reason: "no_conditions" };
      }

      const existingSaved = getEffectiveSavedFilters();
      const existingKeys = existingSaved.map((item) => item.key).filter(Boolean);
      const newFilter = buildQuickSavedFilter({
        label: trimmedLabel,
        conditions: currentConditions,
        existingKeys,
      });

      patchSession({
        savedFilters: [...existingSaved, newFilter],
      });

      return { ok: true, filter: newFilter };
    },
    [sessionDelta.filterConditions, resolvedContract, getEffectiveSavedFilters, patchSession],
  );

  const removeQuickFilter = useCallback(
    (filterId) => {
      const normalizedId = String(filterId || "").trim();
      if (!normalizedId) {
        return;
      }

      const existingSaved = getEffectiveSavedFilters();
      const nextSaved = existingSaved.filter(
        (item) => String(item.id) !== normalizedId,
      );

      patchSession({
        savedFilters: nextSaved,
        defaultQuickFilterId:
          effectiveContract?.query?.filters?.defaultQuickFilterId === normalizedId
            ? null
            : sessionDelta.defaultQuickFilterId,
      });

      if (activeQuickFilterId === normalizedId) {
        setActiveQuickFilterId(null);
      }
    },
    [
      getEffectiveSavedFilters,
      patchSession,
      effectiveContract,
      sessionDelta.defaultQuickFilterId,
      activeQuickFilterId,
    ],
  );

  const updateQuickFilter = useCallback(
    (filterId, patch = {}) => {
      const normalizedId = String(filterId || "").trim();
      if (!normalizedId) {
        return;
      }

      const existingSaved = getEffectiveSavedFilters();
      const nextSaved = existingSaved.map((item) => {
        if (String(item.id) !== normalizedId) {
          return item;
        }

        return { ...item, ...patch };
      });

      patchSession({ savedFilters: nextSaved });
    },
    [getEffectiveSavedFilters, patchSession],
  );

  const setDefaultQuickFilter = useCallback(
    (filterId) => {
      const normalizedId =
        filterId == null || filterId === "" ? null : String(filterId);

      const existingSaved = getEffectiveSavedFilters();
      const nextSaved = existingSaved.map((item) => ({
        ...item,
        isDefault: normalizedId ? String(item.id) === normalizedId : false,
      }));

      patchSession({
        savedFilters: nextSaved,
        defaultQuickFilterId: normalizedId,
      });

      if (normalizedId) {
        setActiveQuickFilterId(normalizedId);
      }
    },
    [getEffectiveSavedFilters, patchSession],
  );

  const quickFilters = useMemo(() => {
    return getQuickFilters(effectiveContract?.query?.filters?.savedFilters);
  }, [effectiveContract]);

  const currentFilterConditions = useMemo(() => {
    if (sessionDelta.filterConditions != null) {
      return cloneFilterConditions(sessionDelta.filterConditions);
    }

    return cloneFilterConditions(
      resolvedContract?.query?.filters?.conditions || [],
    );
  }, [sessionDelta.filterConditions, resolvedContract]);

  const panelColumnOrder = useMemo(() => {
    return resolvePanelColumnOrder(effectiveContract);
  }, [effectiveContract]);

  const hiddenFieldKeys = useMemo(() => {
    return effectiveContract?.presentation?.table?.hiddenFieldKeys || [];
  }, [effectiveContract]);

  const setHiddenFieldKeys = useCallback(
    (next) => {
      patchSession({
        hiddenFieldKeys: Array.isArray(next) ? [...next] : [],
      });
    },
    [patchSession],
  );

  const toggleFieldVisibility = useCallback(
    (fieldKey) => {
      const normalized = String(fieldKey || "").trim();

      if (!normalized) {
        return { ok: false, reason: "invalid_field" };
      }

      const projectionKeys = getProjectionFieldKeys(effectiveContract);
      const hidden = new Set(
        effectiveContract?.presentation?.table?.hiddenFieldKeys || [],
      );

      if (hidden.has(normalized)) {
        hidden.delete(normalized);
      } else {
        const visibleCount = projectionKeys.filter((key) => !hidden.has(key)).length;

        if (visibleCount <= 1) {
          return { ok: false, reason: "last_visible_field" };
        }

        hidden.add(normalized);
      }

      patchSession({
        hiddenFieldKeys: normalizePresentationTable(
          { hiddenFieldKeys: [...hidden] },
          projectionKeys,
        ).hiddenFieldKeys,
      });
      return { ok: true };
    },
    [effectiveContract, patchSession],
  );

  const setColumnOrder = useCallback(
    (next) => {
      patchSession({
        columnOrder: Array.isArray(next) ? [...next] : [],
      });
    },
    [patchSession],
  );

  const moveColumn = useCallback(
    (fieldKey, direction) => {
      const normalized = String(fieldKey || "").trim();
      const order = resolvePanelColumnOrder(effectiveContract);
      const index = order.indexOf(normalized);

      if (index < 0) {
        return;
      }

      const offset = direction === "up" ? -1 : 1;
      const targetIndex = index + offset;

      if (targetIndex < 0 || targetIndex >= order.length) {
        return;
      }

      const nextOrder = [...order];
      const temp = nextOrder[index];
      nextOrder[index] = nextOrder[targetIndex];
      nextOrder[targetIndex] = temp;

      patchSession({
        columnOrder: normalizePresentationTable(
          { columnOrder: nextOrder },
          effectiveContract?.projection?.fieldKeys || [],
        ).columnOrder,
      });
    },
    [effectiveContract, patchSession],
  );

  const setColumnWidth = useCallback(
    (fieldKey, width) => {
      const normalized = String(fieldKey || "").trim();
      const numericWidth = Number(width);

      if (!normalized || !Number.isFinite(numericWidth) || numericWidth <= 0) {
        return;
      }

      const projectionKeys = effectiveContract?.projection?.fieldKeys || [];
      const current =
        effectiveContract?.presentation?.table?.columnWidths || {};

      patchSession({
        columnWidths: normalizePresentationTable(
          {
            ...current,
            [normalized]: numericWidth,
          },
          projectionKeys,
        ).columnWidths,
      });
    },
    [effectiveContract, patchSession],
  );

  const setDensity = useCallback(
    (density) => {
      patchSession({ density: density || "compact" });
    },
    [patchSession],
  );

  const resetPresentationToProjectionOrder = useCallback(() => {
    const fieldOrder = [
      ...(resolvedContract?.projection?.fieldOrder ||
        resolvedContract?.projection?.fieldKeys ||
        []),
    ];

    patchSession({ columnOrder: fieldOrder });
  }, [resolvedContract, patchSession]);

  const resetPresentationSession = useCallback(() => {
    patchSession({
      hiddenFieldKeys: null,
      columnOrder: null,
      columnWidths: null,
      density: undefined,
      cardLayout: null,
    });
  }, [patchSession]);

  const setCardLayout = useCallback(
    (nextLayout) => {
      patchSession({
        cardLayout: nextLayout && typeof nextLayout === "object" ? nextLayout : null,
      });
    },
    [patchSession],
  );

  return {
    resolvedContract,
    effectiveContract,
    sessionState,
    sessionDelta,
    isDirty,
    patchSession,
    resetSession,
    markSaved,
    activeQuickFilterId,
    quickFilters,
    currentFilterConditions,
    setActiveQuickFilter,
    createQuickFilterFromCurrent,
    removeQuickFilter,
    updateQuickFilter,
    setDefaultQuickFilter,
    panelColumnOrder,
    hiddenFieldKeys,
    setHiddenFieldKeys,
    toggleFieldVisibility,
    setColumnOrder,
    moveColumn,
    setColumnWidth,
    setDensity,
    resetPresentationToProjectionOrder,
    resetPresentationSession,
    setCardLayout,
  };
}
