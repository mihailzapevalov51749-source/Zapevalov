import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  loadTablePresentationColumnWidths,
  saveTablePresentationColumnWidths,
} from "../table/preferences/objectTablePresentationPrefs";
import { updateUserTableViewContract } from "../table/preferences/objectTableUserViewsStorage";

import {
  isObjectViewQueryDirty,
  mergeEffectiveContract,
} from "../services/mergeEffectiveContract";
import { normalizePresentationTable } from "../services/contractGuards";
import {
  areColumnWidthsEqual,
  getProjectionFieldKeys,
  resolvePanelColumnOrder,
} from "../services/columnPresentationUtils";
import {
  canMoveTableColumn,
  normalizeTableDisplayFieldKeys,
  resolveTableDisplayContext,
} from "../services/tableColumnOrder";
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
  presentationPrefsScope = null,
  persistUserViewOnPresentationChange = false,
}) {
  const [sessionDelta, setSessionDelta] = useState(EMPTY_SESSION_DELTA);
  const [activeQuickFilterId, setActiveQuickFilterId] = useState(null);
  const persistWidthsTimerRef = useRef(null);
  const persistUserViewTimerRef = useRef(null);
  const effectiveContractRef = useRef(null);
  const resolvedContractRef = useRef(resolvedContract);
  const lastPersistedWidthsRef = useRef(null);

  resolvedContractRef.current = resolvedContract;

  // Do not include projection field keys: catalog/projection sync must not wipe session deltas.
  const baselineKey = `${activeViewKey || ""}:${resolvedContract?.meta?.viewId || ""}:${resolvedContract?.meta?.userViewId || ""}`;

  const presentationPrefsScopeKey = presentationPrefsScope
    ? `${presentationPrefsScope.tenantId ?? ""}:${presentationPrefsScope.userId ?? ""}:${presentationPrefsScope.objectTypeKey ?? ""}`
    : "";

  const commitPresentationColumnWidths = useCallback(
    (columnWidths) => {
      const viewKey = String(activeViewKey || "").trim();

      if (!presentationPrefsScope || !viewKey || !columnWidths) {
        return;
      }

      if (areColumnWidthsEqual(lastPersistedWidthsRef.current, columnWidths)) {
        return;
      }

      lastPersistedWidthsRef.current = { ...columnWidths };
      saveTablePresentationColumnWidths(
        presentationPrefsScope,
        viewKey,
        columnWidths,
      );

      const userViewId = effectiveContractRef.current?.meta?.userViewId;

      if (!persistUserViewOnPresentationChange || !userViewId) {
        return;
      }

      if (persistUserViewTimerRef.current) {
        clearTimeout(persistUserViewTimerRef.current);
      }

      persistUserViewTimerRef.current = setTimeout(() => {
        const contract = effectiveContractRef.current;

        if (!contract) {
          return;
        }

        updateUserTableViewContract(presentationPrefsScope, userViewId, contract);
      }, 400);
    },
    [
      activeViewKey,
      presentationPrefsScope,
      persistUserViewOnPresentationChange,
    ],
  );

  useEffect(() => {
    return () => {
      if (persistWidthsTimerRef.current) {
        clearTimeout(persistWidthsTimerRef.current);
      }

      if (persistUserViewTimerRef.current) {
        clearTimeout(persistUserViewTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const contract = resolvedContractRef.current;

    if (!contract) {
      setSessionDelta(EMPTY_SESSION_DELTA);
      setActiveQuickFilterId(null);
      lastPersistedWidthsRef.current = null;
      return;
    }

    const projectionKeys = contract.projection?.fieldKeys || [];
    const titleFieldKey = contract.projection?.titleFieldKey ?? null;

    const baselineWidths = normalizePresentationTable(
      {
        columnWidths: contract.presentation?.table?.columnWidths || {},
      },
      projectionKeys,
      titleFieldKey,
    ).columnWidths;

    let storedWidths = {};

    if (presentationPrefsScope && activeViewKey) {
      storedWidths = normalizePresentationTable(
        {
          columnWidths: loadTablePresentationColumnWidths(
            presentationPrefsScope,
            activeViewKey,
          ),
        },
        projectionKeys,
        titleFieldKey,
      ).columnWidths;
    }

    const mergedWidths = {
      ...baselineWidths,
      ...storedWidths,
    };

    const hasMergedWidths = Object.keys(mergedWidths).length > 0;

    setSessionDelta({
      ...EMPTY_SESSION_DELTA,
      ...(hasMergedWidths ? { columnWidths: mergedWidths } : {}),
    });

    lastPersistedWidthsRef.current = hasMergedWidths ? { ...mergedWidths } : null;

    const defaultId = contract.query?.filters?.defaultQuickFilterId;
    setActiveQuickFilterId(defaultId ? String(defaultId) : null);
  }, [baselineKey, activeViewKey, presentationPrefsScopeKey]);

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

  useEffect(() => {
    effectiveContractRef.current = effectiveContract;
  }, [effectiveContract]);

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
    setSessionDelta((current) => {
      if (
        patch.columnWidths != null &&
        areColumnWidthsEqual(current.columnWidths, patch.columnWidths)
      ) {
        const { columnWidths: _ignored, ...restPatch } = patch;

        if (Object.keys(restPatch).length === 0) {
          return current;
        }

        return {
          ...current,
          ...restPatch,
        };
      }

      return {
        ...current,
        ...patch,
      };
    });
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

      const titleFieldKey = String(
        effectiveContract?.projection?.titleFieldKey || "",
      ).trim();

      if (titleFieldKey && normalized === titleFieldKey) {
        return { ok: false, reason: "title_field_locked" };
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
        columnOrder: normalizePresentationTable(
          { columnOrder: Array.isArray(next) ? [...next] : [] },
          effectiveContract?.projection?.fieldKeys || [],
          effectiveContract?.projection?.titleFieldKey,
        ).columnOrder,
      });
    },
    [effectiveContract, patchSession],
  );

  const moveColumn = useCallback(
    (fieldKey, direction) => {
      const normalized = String(fieldKey || "").trim();
      const order = resolvePanelColumnOrder(effectiveContract);
      const titleFieldKey = effectiveContract?.projection?.titleFieldKey || null;

      if (
        !canMoveTableColumn(normalized, direction, order, titleFieldKey)
      ) {
        return;
      }

      const index = order.indexOf(normalized);
      const offset = direction === "up" ? -1 : 1;
      const targetIndex = index + offset;
      const nextOrder = [...order];
      const temp = nextOrder[index];
      nextOrder[index] = nextOrder[targetIndex];
      nextOrder[targetIndex] = temp;

      patchSession({
        columnOrder: normalizePresentationTable(
          { columnOrder: nextOrder },
          effectiveContract?.projection?.fieldKeys || [],
          titleFieldKey,
        ).columnOrder,
      });
    },
    [effectiveContract, patchSession],
  );

  const flushPresentationColumnWidths = useCallback(
    (columnWidthsOverride = null) => {
      if (persistWidthsTimerRef.current) {
        clearTimeout(persistWidthsTimerRef.current);
        persistWidthsTimerRef.current = null;
      }

      const columnWidths =
        columnWidthsOverride && typeof columnWidthsOverride === "object"
          ? columnWidthsOverride
          : effectiveContractRef.current?.presentation?.table?.columnWidths;

      if (columnWidths && typeof columnWidths === "object") {
        commitPresentationColumnWidths(columnWidths);
      }
    },
    [commitPresentationColumnWidths],
  );

  const setColumnWidth = useCallback((fieldKey, width) => {
    const normalized = String(fieldKey || "").trim();
    const numericWidth = Number(width);

    if (!normalized || !Number.isFinite(numericWidth) || numericWidth <= 0) {
      return false;
    }

    const baseline = resolvedContractRef.current;

    if (!baseline) {
      return false;
    }

    let committed = false;

    setSessionDelta((sessionCurrent) => {
      const mergedContract = mergeEffectiveContract(baseline, sessionCurrent);
      const projectionKeys = mergedContract.projection?.fieldKeys || [];
      const current = mergedContract.presentation?.table?.columnWidths || {};
      const previousWidth = Number(current[normalized]);

      if (
        Number.isFinite(previousWidth) &&
        previousWidth > 0 &&
        Math.abs(previousWidth - numericWidth) < 0.5
      ) {
        return sessionCurrent;
      }

      const nextColumnWidths = normalizePresentationTable(
        {
          ...current,
          [normalized]: numericWidth,
        },
        projectionKeys,
        mergedContract.projection?.titleFieldKey,
      ).columnWidths;

      if (areColumnWidthsEqual(current, nextColumnWidths)) {
        return sessionCurrent;
      }

      if (areColumnWidthsEqual(sessionCurrent.columnWidths, nextColumnWidths)) {
        return sessionCurrent;
      }

      const nextDelta = {
        ...sessionCurrent,
        columnWidths: nextColumnWidths,
      };

      effectiveContractRef.current = mergeEffectiveContract(baseline, nextDelta);
      committed = true;

      return nextDelta;
    });

    return committed;
  }, []);

  const setDensity = useCallback(
    (density) => {
      patchSession({ density: density || "compact" });
    },
    [patchSession],
  );

  const resetPresentationToProjectionOrder = useCallback(() => {
    const { titleFieldKey, isAllMode } = resolveTableDisplayContext(resolvedContract);
    const fieldOrder = normalizeTableDisplayFieldKeys(
      [
        ...(resolvedContract?.projection?.fieldOrder ||
          resolvedContract?.projection?.fieldKeys ||
          []),
      ],
      { titleFieldKey, isAllMode },
    );

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
    flushPresentationColumnWidths,
    setDensity,
    resetPresentationToProjectionOrder,
    resetPresentationSession,
    setCardLayout,
  };
}
