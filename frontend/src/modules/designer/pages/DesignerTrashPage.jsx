import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { getApiErrorMessage } from "../api/platformApiClient";
import * as designerApi from "../api/designerApi";
import TrashDetailPanel from "../components/trash/TrashDetailPanel";
import TrashPurgeModal from "../components/trash/TrashPurgeModal";
import { useDesignerShell } from "../context/DesignerShellContext";
import { buildTrashDependencyPresentation } from "../services/trashDependencyPresentation";
import {
  buildTrashPurgeModalSearchParams,
  clearTrashPurgeModalSearchParams,
  parseTrashPurgeModalState,
} from "../utils/trashPurgeModalState";

import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";

import "../styles/designerTrash.css";

const TYPE_FILTER_ALL = "all";

function formatTrashDate(value) {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function itemKey(item) {
  return `${item.kind}:${item.id}`;
}

export default function DesignerTrashPage() {
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_TRASH,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    canMinimize: true,
  });

  const { tenantId } = useDesignerShell();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState(TYPE_FILTER_ALL);
  const [selectedKey, setSelectedKey] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [purgeBlocked, setPurgeBlocked] = useState(null);
  const [cascadePreview, setCascadePreview] = useState(null);
  const [purgeTargetItem, setPurgeTargetItem] = useState(null);
  const [selectedDeleteMode, setSelectedDeleteMode] = useState(null);
  const [selectedDepsLoading, setSelectedDepsLoading] = useState(false);
  const [selectedDepsPresentation, setSelectedDepsPresentation] = useState(null);
  const restoreRequestKeyRef = useRef(null);

  const loadTrash = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await designerApi.listDesignerTrash(tenantId);
      setItems(Array.isArray(payload?.items) ? payload.items : []);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Не удалось загрузить корзину"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadTrash();
  }, [loadTrash]);

  const typeOptions = useMemo(() => {
    const labels = new Map();
    for (const item of items) {
      labels.set(item.kind, item.kind_label);
    }
    return [...labels.entries()].map(([kind, label]) => ({ kind, label }));
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== TYPE_FILTER_ALL && item.kind !== typeFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = [
        item.title,
        item.kind_label,
        item.placement_label,
        item.deleted_by_label,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [items, searchText, typeFilter]);

  const selectedItem = useMemo(
    () => filteredItems.find((item) => itemKey(item) === selectedKey) || null,
    [filteredItems, selectedKey],
  );

  const buildBlockedPresentation = useCallback(
    (blockedPayload, trashItem) => {
      if (!blockedPayload?.blocked) {
        return null;
      }
      return buildTrashDependencyPresentation(
        blockedPayload.dependencies,
        trashItem,
        tenantId,
      );
    },
    [tenantId],
  );

  const clearPurgeModalUrl = useCallback(() => {
    const cleared = clearTrashPurgeModalSearchParams(searchParams);
    if (cleared.toString() !== searchParams.toString()) {
      setSearchParams(cleared, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const syncPurgeModalUrl = useCallback(
    (item, mode = null, replace = true) => {
      if (!item) {
        return;
      }
      setSearchParams(buildTrashPurgeModalSearchParams(item, mode, searchParams), { replace });
    },
    [searchParams, setSearchParams],
  );

  const closePurgeModal = useCallback(() => {
    setPurgeModalOpen(false);
    setPurgeBlocked(null);
    setCascadePreview(null);
    setPurgeTargetItem(null);
    setSelectedDeleteMode(null);
    restoreRequestKeyRef.current = null;
    clearPurgeModalUrl();
  }, [clearPurgeModalUrl]);

  const openBlockedPurgeModal = useCallback(
    (trashItem, blockedPayload, mode = null) => {
      setPurgeTargetItem(trashItem);
      setPurgeBlocked({
        ...blockedPayload,
        presentation: buildBlockedPresentation(blockedPayload, trashItem),
      });
      setCascadePreview(null);
      setSelectedDeleteMode(mode);
      setPurgeModalOpen(true);
      syncPurgeModalUrl(trashItem, mode, true);
    },
    [buildBlockedPresentation, syncPurgeModalUrl],
  );

  const handleOpenDependencyRoute = useCallback(
    (route) => {
      if (!route) {
        return;
      }
      if (purgeTargetItem) {
        syncPurgeModalUrl(purgeTargetItem, selectedDeleteMode, false);
      }
      setPurgeModalOpen(false);
      navigate(route);
    },
    [navigate, purgeTargetItem, selectedDeleteMode, syncPurgeModalUrl],
  );

  const handleSelectedDeleteModeChange = useCallback(
    (mode) => {
      setSelectedDeleteMode(mode);
      if (purgeTargetItem) {
        syncPurgeModalUrl(purgeTargetItem, mode, true);
      }
    },
    [purgeTargetItem, syncPurgeModalUrl],
  );

  useEffect(() => {
    if (!selectedItem) {
      setSelectedDepsPresentation(null);
      setSelectedDepsLoading(false);
      return undefined;
    }

    let cancelled = false;
    setSelectedDepsLoading(true);

    (async () => {
      try {
        const blocked = await designerApi.checkDesignerTrashPurge(
          tenantId,
          selectedItem.kind,
          selectedItem.id,
        );
        if (cancelled) {
          return;
        }
        if (blocked?.blocked) {
          setSelectedDepsPresentation(
            buildTrashDependencyPresentation(blocked.dependencies, selectedItem, tenantId),
          );
        } else {
          setSelectedDepsPresentation({
            totalCount: 0,
            groups: [],
            enriched: [],
            summaryLines: [],
          });
        }
      } catch {
        if (!cancelled) {
          setSelectedDepsPresentation(null);
        }
      } finally {
        if (!cancelled) {
          setSelectedDepsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedItem, tenantId, buildBlockedPresentation]);

  useEffect(() => {
    if (loading) {
      return undefined;
    }

    const parsed = parseTrashPurgeModalState(searchParams);
    if (!parsed) {
      restoreRequestKeyRef.current = null;
      return undefined;
    }

    const restoreKey = `${parsed.kind}:${parsed.id}`;
    const item =
      items.find(
        (entry) => entry.kind === parsed.kind && String(entry.id) === String(parsed.id),
      ) || null;

    if (
      purgeModalOpen &&
      purgeTargetItem &&
      purgeTargetItem.kind === parsed.kind &&
      String(purgeTargetItem.id) === String(parsed.id)
    ) {
      if (parsed.mode && parsed.mode !== selectedDeleteMode) {
        setSelectedDeleteMode(parsed.mode);
      }
      restoreRequestKeyRef.current = restoreKey;
      return undefined;
    }

    if (restoreRequestKeyRef.current === restoreKey) {
      return undefined;
    }

    if (!item) {
      setActionError("Объект удаления не найден в корзине.");
      clearPurgeModalUrl();
      restoreRequestKeyRef.current = null;
      return undefined;
    }

    restoreRequestKeyRef.current = restoreKey;
    setSelectedKey(itemKey(item));

    let cancelled = false;
    (async () => {
      try {
        const blocked = await designerApi.checkDesignerTrashPurge(
          tenantId,
          item.kind,
          item.id,
        );
        if (cancelled) {
          return;
        }
        if (blocked?.blocked) {
          openBlockedPurgeModal(item, blocked, parsed.mode);
        } else {
          setActionError("Объект больше не требует удаления с зависимостями.");
          closePurgeModal();
        }
      } catch {
        if (!cancelled) {
          setActionError("Не удалось восстановить модалку удаления.");
          clearPurgeModalUrl();
          restoreRequestKeyRef.current = null;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    loading,
    items,
    searchParams,
    tenantId,
    purgeModalOpen,
    purgeTargetItem,
    selectedDeleteMode,
    openBlockedPurgeModal,
    closePurgeModal,
    clearPurgeModalUrl,
  ]);

  const selectedRefs = useMemo(() => {
    return filteredItems
      .filter((item) => selectedIds.has(itemKey(item)))
      .map((item) => ({ kind: item.kind, id: item.id }));
  }, [filteredItems, selectedIds]);

  const resolveTrashItemFromRefs = useCallback(
    (refs) => {
      if (!Array.isArray(refs) || !refs.length) {
        return null;
      }
      const ref = refs[0];
      return (
        filteredItems.find((item) => item.kind === ref.kind && item.id === ref.id) ||
        ref
      );
    },
    [filteredItems],
  );

  const toggleSelected = (item) => {
    const key = itemKey(item);
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleRestore = async (refs) => {
    if (!refs.length) {
      return;
    }
    setIsSubmitting(true);
    setActionError("");
    try {
      const response = await designerApi.restoreDesignerTrashItems(tenantId, refs);
      const failed = (response?.results || []).filter((item) => !item.success);
      if (failed.length) {
        setActionError(
          failed
            .map((item) => item.error || "Не удалось восстановить")
            .filter(Boolean)
            .join("\n"),
        );
        await loadTrash();
        return;
      }
      setSelectedIds(new Set());
      setSelectedKey(null);
      await loadTrash();
    } catch (restoreError) {
      setActionError(getApiErrorMessage(restoreError, "Не удалось восстановить"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPurgeModal = async (refs) => {
    if (!refs.length) {
      return;
    }
    const trashItem = resolveTrashItemFromRefs(refs);
    setActionError("");
    setPurgeBlocked(null);
    setCascadePreview(null);
    setSelectedDeleteMode(null);
    setPurgeTargetItem(trashItem);
    if (refs.length === 1) {
      try {
        const blocked = await designerApi.checkDesignerTrashPurge(
          tenantId,
          refs[0].kind,
          refs[0].id,
        );
        if (blocked?.blocked) {
          openBlockedPurgeModal(trashItem, blocked, null);
          return;
        }
      } catch {
        // proceed to confirmation if check endpoint unavailable
      }
    }
    setPurgeModalOpen(true);
    syncPurgeModalUrl(trashItem, null, true);
  };

  const handlePurge = async () => {
    const refs = selectedRefs.length
      ? selectedRefs
      : selectedItem
        ? [{ kind: selectedItem.kind, id: selectedItem.id }]
        : [];
    if (!refs.length || purgeBlocked?.blocked) {
      return;
    }
    setIsSubmitting(true);
    setActionError("");
    try {
      await designerApi.purgeDesignerTrashItems(tenantId, refs);
      closePurgeModal();
      setSelectedIds(new Set());
      setSelectedKey(null);
      await loadTrash();
    } catch (purgeError) {
      const detail = purgeError?.response?.data?.detail;
      if (detail?.dependencies) {
        const blockedPayload = {
          blocked: true,
          message: detail.message || "Зависимости обнаружены",
          dependencies: detail.dependencies,
          tree: detail.tree || null,
        };
        openBlockedPurgeModal(
          purgeTargetItem || resolveTrashItemFromRefs(refs) || selectedItem,
          blockedPayload,
          selectedDeleteMode,
        );
      } else {
        setActionError(getApiErrorMessage(purgeError, "Не удалось удалить окончательно"));
        closePurgeModal();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearDependencies = useCallback(async () => {
    if (!purgeTargetItem) {
      return;
    }
    setIsSubmitting(true);
    setActionError("");
    try {
      await designerApi.clearDesignerTrashDependenciesAndPurge(
        tenantId,
        purgeTargetItem.kind,
        purgeTargetItem.id,
      );
      closePurgeModal();
      setSelectedIds(new Set());
      setSelectedKey(null);
      await loadTrash();
    } catch (error) {
      setActionError(getApiErrorMessage(error, "Не удалось очистить зависимости и удалить объект"));
    } finally {
      setIsSubmitting(false);
    }
  }, [purgeTargetItem, tenantId, closePurgeModal, loadTrash]);

  const handleRequestCascadePreview = useCallback(async () => {
    if (!purgeTargetItem) {
      return;
    }
    setIsSubmitting(true);
    setActionError("");
    try {
      await designerApi.purgeDesignerTrashCascade(
        tenantId,
        purgeTargetItem.kind,
        purgeTargetItem.id,
        { confirm: false },
      );
    } catch (error) {
      const detail = error?.response?.data?.detail;
      if (detail?.tree) {
        setCascadePreview({ tree: detail.tree, total_nodes: detail.total_nodes });
      } else {
        setActionError(getApiErrorMessage(error, "Не удалось построить дерево каскадного удаления"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [purgeTargetItem, tenantId]);

  const handleConfirmCascadeDelete = useCallback(async () => {
    if (!purgeTargetItem) {
      return;
    }
    setIsSubmitting(true);
    setActionError("");
    try {
      await designerApi.purgeDesignerTrashCascade(
        tenantId,
        purgeTargetItem.kind,
        purgeTargetItem.id,
        { confirm: true },
      );
      closePurgeModal();
      setSelectedIds(new Set());
      setSelectedKey(null);
      await loadTrash();
    } catch (error) {
      setActionError(getApiErrorMessage(error, "Не удалось выполнить каскадное удаление"));
    } finally {
      setIsSubmitting(false);
    }
  }, [purgeTargetItem, tenantId, closePurgeModal, loadTrash]);

  return (
    <div className="designer-trash">
      <div className="designer-page-header">
        <div>
          <h1 className="designer-page-title">Корзина</h1>
          <p className="designer-page-subtitle">
            Удалённые сущности платформы: восстановление и окончательное удаление
          </p>
        </div>
      </div>

      <div className="designer-trash__toolbar">
        <input
          type="search"
          className="designer-trash__search"
          placeholder="Поиск по названию, типу, расположению..."
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        <select
          className="designer-trash__filter"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
        >
          <option value={TYPE_FILTER_ALL}>Все типы</option>
          {typeOptions.map((option) => (
            <option key={option.kind} value={option.kind}>
              {option.label}
            </option>
          ))}
        </select>
        {selectedRefs.length ? (
          <div className="designer-trash__bulk">
            <button
              type="button"
              className="designer-btn designer-btn--compact"
              disabled={isSubmitting}
              onClick={() => handleRestore(selectedRefs)}
            >
              Восстановить выбранные ({selectedRefs.length})
            </button>
            <button
              type="button"
              className="designer-btn designer-btn--compact designer-btn--danger"
              disabled={isSubmitting}
              onClick={() => openPurgeModal(selectedRefs)}
            >
              Удалить выбранные окончательно
            </button>
          </div>
        ) : null}
      </div>

      {error ? <p className="designer-error">{error}</p> : null}
      {actionError ? <p className="designer-error">{actionError}</p> : null}

      <div className="designer-trash__workspace">
        <aside className="designer-trash__master" aria-label="Список корзины">
          {loading ? (
            <div className="designer-loading">Загрузка корзины...</div>
          ) : filteredItems.length ? (
            <table className="designer-trash__table">
              <thead>
                <tr>
                  <th />
                  <th>№</th>
                  <th>Название</th>
                  <th>Тип</th>
                  <th>Расположение</th>
                  <th>Удалил</th>
                  <th>Дата удаления</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => {
                  const key = itemKey(item);
                  const isActive = selectedKey === key;
                  return (
                    <tr
                      key={key}
                      className={isActive ? "is-active" : ""}
                      onClick={() => setSelectedKey(key)}
                    >
                      <td onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(key)}
                          onChange={() => toggleSelected(item)}
                        />
                      </td>
                      <td>{index + 1}</td>
                      <td>{item.title}</td>
                      <td>{item.kind_label}</td>
                      <td>{item.placement_label}</td>
                      <td>{item.deleted_by_label}</td>
                      <td>{formatTrashDate(item.deleted_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="designer-empty">Корзина пуста</div>
          )}
        </aside>

        <section className="designer-trash__detail" aria-label="Карточка элемента">
          <TrashDetailPanel
            item={selectedItem}
            depsLoading={selectedDepsLoading}
            depsPresentation={selectedDepsPresentation}
            isSubmitting={isSubmitting}
            onRestore={() => {
              if (!selectedItem) {
                return;
              }
              handleRestore([{ kind: selectedItem.kind, id: selectedItem.id }]);
            }}
            onPurge={() => {
              if (!selectedItem) {
                return;
              }
              openPurgeModal([{ kind: selectedItem.kind, id: selectedItem.id }]);
            }}
            onOpenRoute={handleOpenDependencyRoute}
          />
        </section>
      </div>

      <TrashPurgeModal
        open={purgeModalOpen}
        targetItem={purgeTargetItem}
        blocked={purgeBlocked}
        cascadePreview={cascadePreview}
        isSubmitting={isSubmitting}
        selectedDeleteMode={selectedDeleteMode}
        onSelectedDeleteModeChange={handleSelectedDeleteModeChange}
        onClose={closePurgeModal}
        onConfirmPurge={handlePurge}
        onClearDependencies={handleClearDependencies}
        onOpenRoute={handleOpenDependencyRoute}
        onRequestCascadePreview={handleRequestCascadePreview}
        onConfirmCascadeDelete={handleConfirmCascadeDelete}
      />
    </div>
  );
}
