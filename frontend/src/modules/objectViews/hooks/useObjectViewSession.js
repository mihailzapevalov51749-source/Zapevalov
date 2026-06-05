import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  loadColumnWidths,
  resolveColumnWidthsViewKey,
  saveColumnWidths,
} from "../table/services/objectTableColumnWidthsStorage";
import { updateUserTableViewContract } from "../table/preferences/objectTableUserViewsStorage";

import {
  buildObjectViewResolvedFingerprint,
  isObjectViewQueryDirty,
  mergeEffectiveContract,
} from "../services/mergeEffectiveContract";
import { normalizePresentationTable } from "../services/contractGuards";
import {
  areColumnWidthsEqual,
  getTablePresentationFieldKeys,
  resolvePanelColumnOrder,
} from "../services/columnPresentationUtils";
import {
  canMoveTableColumn,
  normalizeTableDisplayFieldKeys,
  preserveUserViewColumnOrder,
  resolveTableDisplayContext,
} from "../services/tableColumnOrder";
import { isTableBaseStateKey } from "../table/preferences/tableBaseState";
import {
  buildSavedFilter,
  cloneFilterConditions,
  ensureSingleDefaultFilter,
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

function cloneContractSnapshot(contract) {
  if (!contract) {
    return null;
  }

  return JSON.parse(JSON.stringify(contract));
}

function buildInitialSessionFromResolved(
  contract,
  presentationPrefsScope,
  activeViewKey,
) {
  if (!contract) {
    return {
      sessionDelta: EMPTY_SESSION_DELTA,
      sessionBaseline: null,
    };
  }

  const presentationKeys = getTablePresentationFieldKeys(contract);
  const titleFieldKey = contract.projection?.titleFieldKey ?? null;

  const baselineWidths = normalizePresentationTable(
    {
      columnWidths: contract.presentation?.table?.columnWidths || {},
    },
    presentationKeys,
    titleFieldKey,
  ).columnWidths;

  let storedWidths = {};

  if (presentationPrefsScope && activeViewKey) {
    storedWidths = normalizePresentationTable(
      {
        columnWidths: loadColumnWidths({
          tenantId: presentationPrefsScope.tenantId,
          objectTypeKey: presentationPrefsScope.objectTypeKey,
          userId: presentationPrefsScope.userId,
          viewKey: resolveColumnWidthsViewKey(
            activeViewKey,
            contract.key,
          ),
          contract,
        }),
      },
      presentationKeys,
      titleFieldKey,
    ).columnWidths;
  }

  const mergedWidths = {
    ...baselineWidths,
    ...storedWidths,
  };

  const hasMergedWidths = Object.keys(mergedWidths).length > 0;
  const sessionDelta = {
    ...EMPTY_SESSION_DELTA,
    ...(hasMergedWidths ? { columnWidths: mergedWidths } : {}),
  };
  const sessionBaseline = mergeEffectiveContract(contract, sessionDelta);

  return {
    sessionDelta,
    sessionBaseline: cloneContractSnapshot(sessionBaseline),
    lastPersistedWidths: hasMergedWidths ? { ...mergedWidths } : null,
    defaultQuickFilterId: contract.query?.filters?.defaultQuickFilterId
      ? String(contract.query.filters.defaultQuickFilterId)
      : null,
  };
}

/**
 * Transient session layered on top of resolved view contract.
 */
export default function useObjectViewSession({
  resolvedContract,
  activeViewKey = null,
  presentationPrefsScope = null,
  persistUserViewOnPresentationChange = false,
  catalog = null,
  objectTypeKey = null,
}) {
  const [sessionDelta, setSessionDelta] = useState(EMPTY_SESSION_DELTA);
  const [sessionBaseline, setSessionBaseline] = useState(null);
  const [hasUserSessionEdits, setHasUserSessionEdits] = useState(false);
  const [activeQuickFilterId, setActiveQuickFilterId] = useState(null);
  const persistWidthsTimerRef = useRef(null);
  const persistUserViewTimerRef = useRef(null);
  const effectiveContractRef = useRef(null);
  const resolvedContractRef = useRef(resolvedContract);
  const lastPersistedWidthsRef = useRef(null);

  resolvedContractRef.current = resolvedContract;

  const viewSessionKey = `${activeViewKey || ""}:${resolvedContract?.meta?.viewId || ""}:${resolvedContract?.meta?.userViewId || ""}`;

  const resolvedFingerprint = useMemo(
    () => buildObjectViewResolvedFingerprint(resolvedContract),
    [resolvedContract],
  );

  const presentationPrefsScopeKey = presentationPrefsScope
    ? `${presentationPrefsScope.tenantId ?? ""}:${presentationPrefsScope.userId ?? ""}:${presentationPrefsScope.objectTypeKey ?? ""}`
    : "";

  const commitPresentationColumnWidths = useCallback(
    (columnWidths) => {
      const contract = effectiveContractRef.current;
      const viewKey = resolveColumnWidthsViewKey(
        activeViewKey,
        contract?.key,
      );

      if (!presentationPrefsScope || !viewKey || !columnWidths) {
        return;
      }

      if (areColumnWidthsEqual(lastPersistedWidthsRef.current, columnWidths)) {
        return;
      }

      lastPersistedWidthsRef.current = { ...columnWidths };
      saveColumnWidths({
        tenantId: presentationPrefsScope.tenantId,
        objectTypeKey: presentationPrefsScope.objectTypeKey,
        userId: presentationPrefsScope.userId,
        viewKey,
        contract,
      }, columnWidths);

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

  const applyInitialSession = useCallback(() => {
    const contract = resolvedContractRef.current;
    const initial = buildInitialSessionFromResolved(
      contract,
      presentationPrefsScope,
      activeViewKey,
    );

    setSessionDelta(initial.sessionDelta);
    setSessionBaseline(initial.sessionBaseline);
    setActiveQuickFilterId(initial.defaultQuickFilterId);
    lastPersistedWidthsRef.current = initial.lastPersistedWidths;
  }, [presentationPrefsScope, activeViewKey]);

  useEffect(() => {
    setHasUserSessionEdits(false);
    applyInitialSession();
  }, [viewSessionKey, applyInitialSession]);

  useEffect(() => {
    if (hasUserSessionEdits) {
      return;
    }

    applyInitialSession();
  }, [resolvedFingerprint, hasUserSessionEdits, applyInitialSession]);

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
    if (hasUserSessionEdits) {
      return true;
    }

    if (!sessionBaseline || !effectiveContract) {
      return false;
    }

    return isObjectViewQueryDirty(sessionBaseline, effectiveContract);
  }, [hasUserSessionEdits, sessionBaseline, effectiveContract]);

  const getEffectiveSavedFilters = useCallback(() => {
    return effectiveContract?.query?.filters?.savedFilters || [];
  }, [effectiveContract]);

  const patchSession = useCallback((patch = {}) => {
    setHasUserSessionEdits(true);

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

  /**
   * Updates saved filter catalog (quick + saved) without marking the view dirty.
   * Syncs catalog slice into session baseline so navigation guard stays clean.
   */
  const patchSavedFiltersCatalog = useCallback((patch = {}) => {
    setSessionDelta((current) => {
      const nextDelta = {
        ...current,
        ...patch,
      };

      const resolved = resolvedContractRef.current;

      if (resolved) {
        const merged = mergeEffectiveContract(resolved, nextDelta);

        setSessionBaseline((baseline) => {
          if (!baseline) {
            return baseline;
          }

          return cloneContractSnapshot({
            ...baseline,
            query: {
              ...baseline.query,
              filters: {
                ...baseline.query.filters,
                savedFilters: merged.query.filters.savedFilters,
                defaultQuickFilterId: merged.query.filters.defaultQuickFilterId,
              },
            },
          });
        });
      }

      return nextDelta;
    });
  }, []);

  const resetSession = useCallback(() => {
    setHasUserSessionEdits(false);
    applyInitialSession();
  }, [applyInitialSession]);

  const markSaved = useCallback(() => {
    const saved = effectiveContractRef.current;
    const resolved = resolvedContractRef.current;

    if (saved) {
      const baselineSnapshot = cloneContractSnapshot(saved);

      if (resolved?.presentation?.table) {
        baselineSnapshot.presentation = {
          ...baselineSnapshot.presentation,
          table: {
            ...baselineSnapshot.presentation.table,
            columnWidths: {
              ...(resolved.presentation.table.columnWidths || {}),
            },
          },
        };
      }

      setSessionBaseline(baselineSnapshot);
    }

    const localWidths = saved?.presentation?.table?.columnWidths;
    setSessionDelta({
      ...EMPTY_SESSION_DELTA,
      ...(localWidths && Object.keys(localWidths).length > 0
        ? { columnWidths: { ...localWidths } }
        : {}),
    });
    setHasUserSessionEdits(false);
  }, []);

  const setActiveQuickFilter = useCallback(
    (filterId) => {
      const normalized =
        filterId == null || filterId === "" ? null : String(filterId);
      setActiveQuickFilterId(normalized);
    },
    [],
  );

  const deleteSavedFilter = useCallback(
    (filterId) => {
      const normalizedId = String(filterId || "").trim();
      if (!normalizedId) {
        return;
      }

      const existingSaved = getEffectiveSavedFilters();
      const nextSaved = existingSaved.filter(
        (item) => String(item.id) !== normalizedId,
      );

      patchSavedFiltersCatalog({
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
      patchSavedFiltersCatalog,
      effectiveContract,
      sessionDelta.defaultQuickFilterId,
      activeQuickFilterId,
    ],
  );

  const removeQuickFilter = useCallback(
    (filterId) => {
      deleteSavedFilter(filterId);
    },
    [deleteSavedFilter],
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

      patchSavedFiltersCatalog({ savedFilters: nextSaved });
    },
    [getEffectiveSavedFilters, patchSavedFiltersCatalog],
  );

  const setDefaultQuickFilter = useCallback(
    (filterId) => {
      const normalizedId =
        filterId == null || filterId === "" ? null : String(filterId);

      const existingSaved = getEffectiveSavedFilters();
      const nextSaved = ensureSingleDefaultFilter(existingSaved, normalizedId);

      patchSavedFiltersCatalog({
        savedFilters: nextSaved,
        defaultQuickFilterId: normalizedId,
      });

      if (normalizedId) {
        setActiveQuickFilterId(normalizedId);
      }
    },
    [getEffectiveSavedFilters, patchSavedFiltersCatalog],
  );

  const upsertSavedFilter = useCallback(
    ({ id = null, label, conditions, isQuick = false, isDefault = false }) => {
      const trimmedLabel = String(label || "").trim();
      if (!trimmedLabel) {
        return { ok: false, reason: "empty_label" };
      }

      const normalizedConditions = cloneFilterConditions(conditions).filter(
        (item) => String(item?.fieldKey || "").trim(),
      );

      if (!normalizedConditions.length) {
        return { ok: false, reason: "no_conditions" };
      }

      const existingSaved = getEffectiveSavedFilters();
      const existingKeys = existingSaved.map((item) => item.key).filter(Boolean);
      const normalizedId = id ? String(id) : null;
      const existingFilter = normalizedId
        ? existingSaved.find((item) => String(item.id) === normalizedId)
        : null;

      const nextFilter = buildSavedFilter({
        id: normalizedId || existingFilter?.id || null,
        key: existingFilter?.key || null,
        label: trimmedLabel,
        conditions: normalizedConditions,
        existingKeys,
        isQuick,
        isDefault: isQuick && isDefault,
      });

      const withoutCurrent = normalizedId
        ? existingSaved.filter((item) => String(item.id) !== normalizedId)
        : existingSaved;

      let nextSaved = [...withoutCurrent, nextFilter];
      const currentDefaultId =
        effectiveContract?.query?.filters?.defaultQuickFilterId != null
          ? String(effectiveContract.query.filters.defaultQuickFilterId)
          : null;

      let nextDefaultId = currentDefaultId;

      if (isQuick && isDefault) {
        nextDefaultId = String(nextFilter.id);
        nextSaved = ensureSingleDefaultFilter(nextSaved, nextFilter.id);
      } else {
        if (normalizedId && nextDefaultId === normalizedId) {
          nextDefaultId = null;
        }
        nextSaved = ensureSingleDefaultFilter(nextSaved, nextDefaultId);
      }

      patchSavedFiltersCatalog({
        savedFilters: nextSaved,
        defaultQuickFilterId: nextDefaultId,
      });

      if (isQuick && isDefault) {
        setActiveQuickFilterId(String(nextFilter.id));
      } else if (
        normalizedId &&
        activeQuickFilterId === normalizedId &&
        !isQuick
      ) {
        setActiveQuickFilterId(null);
      }

      return { ok: true, filter: nextFilter };
    },
    [
      getEffectiveSavedFilters,
      patchSavedFiltersCatalog,
      effectiveContract,
      activeQuickFilterId,
    ],
  );

  const removeActiveFilterCondition = useCallback(
    (conditionId, source = "base", sourceFilterId = null) => {
      const normalizedConditionId = String(conditionId || "").trim();
      if (!normalizedConditionId) {
        return;
      }

      if (source === "quick" && sourceFilterId) {
        const existingSaved = getEffectiveSavedFilters();
        const normalizedFilterId = String(sourceFilterId);
        const targetFilter = existingSaved.find(
          (item) => String(item.id) === normalizedFilterId,
        );

        if (!targetFilter) {
          return;
        }

        const nextConditions = cloneFilterConditions(
          targetFilter.conditions || [],
        ).filter((item) => String(item.id) !== normalizedConditionId);

        if (!nextConditions.length) {
          deleteSavedFilter(normalizedFilterId);
          return;
        }

        const nextSaved = existingSaved.map((item) =>
          String(item.id) === normalizedFilterId
            ? { ...item, conditions: nextConditions }
            : item,
        );

        patchSavedFiltersCatalog({ savedFilters: nextSaved });
        return;
      }

      const currentConditions =
        sessionDelta.filterConditions != null
          ? cloneFilterConditions(sessionDelta.filterConditions)
          : cloneFilterConditions(
              resolvedContract?.query?.filters?.conditions || [],
            );

      patchSession({
        filterConditions: currentConditions.filter(
          (item) => String(item.id) !== normalizedConditionId,
        ),
      });
    },
    [
      getEffectiveSavedFilters,
      patchSession,
      patchSavedFiltersCatalog,
      deleteSavedFilter,
      sessionDelta.filterConditions,
      resolvedContract,
    ],
  );

  const clearAllActiveFilters = useCallback(() => {
    patchSession({ filterConditions: [] });
    setActiveQuickFilterId(null);
  }, [patchSession]);

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

  const panelPresentationOptions = useMemo(
    () => ({
      catalog,
      objectTypeKey,
    }),
    [catalog, objectTypeKey],
  );

  const presentationNormalizeOptions = useMemo(() => {
    const contract = effectiveContractRef.current || resolvedContract;

    return {
      preserveExactColumnOrder: contract?.meta?.isUserView === true,
      isAllMode: isTableBaseStateKey(contract?.key),
    };
  }, [resolvedContract, effectiveContract]);

  const panelColumnOrder = useMemo(() => {
    return resolvePanelColumnOrder(
      effectiveContract,
      null,
      panelPresentationOptions,
    );
  }, [effectiveContract, panelPresentationOptions]);

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

      const presentationKeys = getTablePresentationFieldKeys(effectiveContract);
      const hidden = new Set(
        effectiveContract?.presentation?.table?.hiddenFieldKeys || [],
      );

      if (hidden.has(normalized)) {
        hidden.delete(normalized);
      } else {
        const visibleCount = presentationKeys.filter((key) => !hidden.has(key)).length;

        if (visibleCount <= 1) {
          return { ok: false, reason: "last_visible_field" };
        }

        hidden.add(normalized);
      }

      patchSession({
        hiddenFieldKeys: normalizePresentationTable(
          { hiddenFieldKeys: [...hidden] },
          presentationKeys,
          effectiveContract?.projection?.titleFieldKey,
          presentationNormalizeOptions,
        ).hiddenFieldKeys,
      });
      return { ok: true };
    },
    [effectiveContract, patchSession, presentationNormalizeOptions],
  );

  const setColumnOrder = useCallback(
    (next) => {
      patchSession({
        columnOrder: normalizePresentationTable(
          { columnOrder: Array.isArray(next) ? [...next] : [] },
          getTablePresentationFieldKeys(effectiveContract),
          effectiveContract?.projection?.titleFieldKey,
          presentationNormalizeOptions,
        ).columnOrder,
      });
    },
    [effectiveContract, patchSession, presentationNormalizeOptions],
  );

  const columnMoveOptions = useMemo(
    () => ({
      preserveExactOrder: effectiveContract?.meta?.isUserView === true,
    }),
    [effectiveContract?.meta?.isUserView],
  );

  const moveColumn = useCallback(
    (fieldKey, direction) => {
      const normalized = String(fieldKey || "").trim();
      const contract = effectiveContractRef.current;

      if (!contract) {
        return;
      }

      const order = resolvePanelColumnOrder(
        contract,
        null,
        panelPresentationOptions,
      );
      const titleFieldKey = contract?.projection?.titleFieldKey || null;
      const moveOptions = {
        preserveExactOrder: contract?.meta?.isUserView === true,
      };

      if (!canMoveTableColumn(normalized, direction, order, titleFieldKey, moveOptions)) {
        return;
      }

      const index = order.indexOf(normalized);
      const offset = direction === "up" ? -1 : 1;
      const targetIndex = index + offset;
      const nextOrder = [...order];
      const temp = nextOrder[index];
      nextOrder[index] = nextOrder[targetIndex];
      nextOrder[targetIndex] = temp;

      const presentationKeys = getTablePresentationFieldKeys(contract);
      const normalizedOrder = moveOptions.preserveExactOrder
        ? preserveUserViewColumnOrder(nextOrder, presentationKeys)
        : normalizePresentationTable(
            { columnOrder: nextOrder },
            presentationKeys,
            titleFieldKey,
            presentationNormalizeOptions,
          ).columnOrder;

      patchSession({
        columnOrder: normalizedOrder,
      });
    },
    [patchSession, panelPresentationOptions, presentationNormalizeOptions],
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
      const presentationKeys = getTablePresentationFieldKeys(mergedContract);
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
        presentationKeys,
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

    if (committed) {
      if (persistWidthsTimerRef.current) {
        clearTimeout(persistWidthsTimerRef.current);
      }

      persistWidthsTimerRef.current = setTimeout(() => {
        const widths =
          effectiveContractRef.current?.presentation?.table?.columnWidths;

        if (widths && typeof widths === "object") {
          commitPresentationColumnWidths(widths);
        }
      }, 400);
    }

    return committed;
  }, [commitPresentationColumnWidths]);

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
    removeQuickFilter,
    updateQuickFilter,
    setDefaultQuickFilter,
    upsertSavedFilter,
    deleteSavedFilter,
    removeActiveFilterCondition,
    clearAllActiveFilters,
    panelColumnOrder,
    columnMoveOptions,
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
