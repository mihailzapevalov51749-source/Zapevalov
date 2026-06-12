import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import { createPage, updatePage } from "../../../api/pagesApi";
import { getApiErrorMessage } from "../api/platformApiClient";
import * as designerApi from "../api/designerApi";
import { resolvePageOpenHref } from "../utils/resolvePageOpenTarget";
import { useDesignerShell } from "../context/DesignerShellContext";
import CreatePageModal from "../components/pages/CreatePageModal";
import BulkDeletePagesConfirmModal from "../components/pages/BulkDeletePagesConfirmModal";
import DeletePageConfirmModal from "../components/pages/DeletePageConfirmModal";
import PageDetailPanel from "../components/pages/PageDetailPanel";
import PagesRegistryTable from "../components/pages/PagesRegistryTable";
import {
  filterAndSortPages,
  getNextSortDirection,
  PAGE_SORT_KEYS,
  PAGE_STATUS_FILTERS,
} from "../utils/pagesRegistryUtils";
import { buildBulkDeleteNotice, splitPagesForBulkDelete } from "../utils/pagesBulkDelete";
import { dispatchPageStatusNavigationRefresh } from "../utils/navigationReload";
import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";

import "../styles/designerPagesRegistry.css";

function resolveDeletePageErrorMessage(error) {
  const status = Number(error?.response?.status);
  const detail = error?.response?.data?.detail;

  if (status === 409 && detail?.reason === "protected_page") {
    const title = detail.message || "Удаление запрещено";
    const subtitle = detail.detail || "Системную страницу нельзя удалить.";
    return `${title}. ${subtitle}`;
  }

  if (status === 401 || status === 403 || status >= 500) {
    return "Не удалось удалить страницу. Причина: нет прав или сессия истекла.";
  }
  return getApiErrorMessage(error, "Не удалось удалить страницу.");
}

const STATUS_FILTER_OPTIONS = [
  { id: PAGE_STATUS_FILTERS.ALL, label: "Все" },
  { id: PAGE_STATUS_FILTERS.DRAFT, label: "Черновики" },
  { id: PAGE_STATUS_FILTERS.PUBLISHED, label: "Опубликованные" },
  { id: PAGE_STATUS_FILTERS.HIDDEN, label: "Скрытые" },
];

export default function DesignerPagesPage() {
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_PAGES,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    canMinimize: true,
  });

  const navigate = useNavigate();
  const { tenantId } = useDesignerShell();

  const [items, setItems] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [listError, setListError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [selectedPageIds, setSelectedPageIds] = useState(() => new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState(PAGE_STATUS_FILTERS.ALL);
  const [sortKey, setSortKey] = useState(PAGE_SORT_KEYS.UPDATED);
  const [sortDirection, setSortDirection] = useState("desc");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitError, setCreateSubmitError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadRegistry = useCallback(async () => {
    setLoadingList(true);
    setListError("");

    try {
      const payload = await designerApi.listDesignerPagesRegistry(tenantId);
      const nextItems = Array.isArray(payload?.items) ? payload.items : [];
      setItems(nextItems);
      return nextItems;
    } catch (error) {
      setListError(getApiErrorMessage(error, "Не удалось загрузить реестр страниц"));
      setItems([]);
      return [];
    } finally {
      setLoadingList(false);
    }
  }, [tenantId]);

  const loadDetail = useCallback(
    async (pageId) => {
      if (pageId == null) {
        setSelectedDetail(null);
        return;
      }

      setLoadingDetail(true);
      setDetailError("");

      try {
        const detail = await designerApi.getDesignerPageRegistry(tenantId, pageId);
        setSelectedDetail(detail);
      } catch (error) {
        setDetailError(getApiErrorMessage(error, "Не удалось загрузить карточку страницы"));
        setSelectedDetail(null);
      } finally {
        setLoadingDetail(false);
      }
    },
    [tenantId],
  );

  useEffect(() => {
    loadRegistry().then((nextItems) => {
      if (nextItems.length === 0) {
        setSelectedPageId(null);
        return;
      }

      setSelectedPageId((previous) => {
        if (
          previous != null
          && nextItems.some((item) => String(item.id) === String(previous))
        ) {
          return previous;
        }
        return nextItems[0].id;
      });
    });
  }, [loadRegistry]);

  useEffect(() => {
    if (selectedPageId == null) {
      setSelectedDetail(null);
      return undefined;
    }

    loadDetail(selectedPageId);
    return undefined;
  }, [selectedPageId, loadDetail]);

  const filteredItems = useMemo(
    () =>
      filterAndSortPages(items, {
        searchText,
        statusFilter,
        sortKey,
        sortDirection,
      }),
    [items, searchText, statusFilter, sortKey, sortDirection],
  );

  const selectedPages = useMemo(
    () => items.filter((item) => selectedPageIds.has(String(item.id))),
    [items, selectedPageIds],
  );

  const selectedCount = selectedPages.length;

  useEffect(() => {
    setSelectedPageIds(new Set());
  }, [searchText, statusFilter]);

  const togglePageSelection = useCallback((pageId) => {
    const key = String(pageId);
    setSelectedPageIds((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleAllVisibleSelection = useCallback(() => {
    const visibleKeys = filteredItems.map((item) => String(item.id));
    const allVisibleSelected =
      visibleKeys.length > 0 && visibleKeys.every((key) => selectedPageIds.has(key));

    setSelectedPageIds((previous) => {
      const next = new Set(previous);
      if (allVisibleSelected) {
        for (const key of visibleKeys) {
          next.delete(key);
        }
      } else {
        for (const key of visibleKeys) {
          next.add(key);
        }
      }
      return next;
    });
  }, [filteredItems, selectedPageIds]);

  const clearPageSelection = useCallback(() => {
    setSelectedPageIds(new Set());
  }, []);

  const filterCounts = useMemo(() => {
    const counts = {
      [PAGE_STATUS_FILTERS.ALL]: items.length,
      [PAGE_STATUS_FILTERS.DRAFT]: 0,
      [PAGE_STATUS_FILTERS.PUBLISHED]: 0,
      [PAGE_STATUS_FILTERS.HIDDEN]: 0,
    };

    for (const item of items) {
      const status = String(item.status || "").toLowerCase();
      if (status === PAGE_STATUS_FILTERS.DRAFT) {
        counts[PAGE_STATUS_FILTERS.DRAFT] += 1;
      }
      if (status === PAGE_STATUS_FILTERS.PUBLISHED) {
        counts[PAGE_STATUS_FILTERS.PUBLISHED] += 1;
      }
      if (status === PAGE_STATUS_FILTERS.HIDDEN) {
        counts[PAGE_STATUS_FILTERS.HIDDEN] += 1;
      }
    }

    return counts;
  }, [items]);

  const handleToggleSort = (nextSortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection((previous) => getNextSortDirection(previous));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection(nextSortKey === PAGE_SORT_KEYS.UPDATED ? "desc" : "asc");
  };

  const refreshAfterMutation = async (pageId = null) => {
    const nextItems = await loadRegistry();
    if (pageId != null && nextItems.some((item) => String(item.id) === String(pageId))) {
      setSelectedPageId(pageId);
      await loadDetail(pageId);
      return;
    }

    if (nextItems.length > 0) {
      setSelectedPageId(nextItems[0].id);
      return;
    }

    setSelectedPageId(null);
    setSelectedDetail(null);
  };

  const handleOpenPage = async () => {
    if (!selectedDetail?.id) {
      return;
    }

    setActionError("");

    try {
      const href = await resolvePageOpenHref({
        tenantId,
        page: selectedDetail,
        listWorkspaceTabs: designerApi.listDesignerWorkspaceTabs,
      });
      navigate(href);
    } catch (error) {
      setActionError(getApiErrorMessage(error, "Не удалось открыть страницу"));
    }
  };

  const handleCreatePage = async ({ title }) => {
    setIsCreating(true);
    setCreateSubmitError("");

    try {
      const created = await createPage({
        portal_id: tenantId,
        title,
        status: "draft",
      });
      setCreateModalOpen(false);
      await refreshAfterMutation(created.id);
    } catch (error) {
      setCreateSubmitError(getApiErrorMessage(error, "Не удалось создать страницу"));
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const handleDuplicate = async () => {
    if (!selectedPageId) {
      return;
    }

    setIsSubmittingAction(true);
    setActionError("");

    try {
      const result = await designerApi.duplicateDesignerPage(tenantId, selectedPageId);
      await refreshAfterMutation(result?.page?.id ?? null);
    } catch (error) {
      setActionError(getApiErrorMessage(error, "Не удалось дублировать страницу"));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handlePublishToggle = async (nextStatus) => {
    if (!selectedPageId) {
      return;
    }

    setIsSubmittingAction(true);
    setActionError("");

    try {
      await updatePage(selectedPageId, { status: nextStatus });
      dispatchPageStatusNavigationRefresh();
      await refreshAfterMutation(selectedPageId);
    } catch (error) {
      setActionError(
        getApiErrorMessage(
          error,
          nextStatus === "published"
            ? "Не удалось опубликовать страницу"
            : "Не удалось снять публикацию",
        ),
      );
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const bulkDeletePreview = useMemo(
    () => splitPagesForBulkDelete(selectedPages),
    [selectedPages],
  );

  const handleOpenBulkDeleteModal = () => {
    if (!selectedCount) {
      return;
    }

    const { deletablePages, protectedPages } = bulkDeletePreview;

    if (!deletablePages.length) {
      setActionNotice(buildBulkDeleteNotice({ deletedCount: 0, skipped: protectedPages }));
      setActionError("");
      clearPageSelection();
      return;
    }

    setBulkDeleteModalOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    const { deletablePages, protectedPages } = bulkDeletePreview;

    if (!deletablePages.length) {
      setBulkDeleteModalOpen(false);
      return;
    }

    setIsBulkDeleting(true);
    setActionError("");
    setActionNotice("");

    try {
      const response = await designerApi.bulkDeleteDesignerPages(
        tenantId,
        deletablePages.map((page) => page.id),
      );
      setBulkDeleteModalOpen(false);
      setActionNotice(
        response?.message || buildBulkDeleteNotice({
          deletedCount: response?.deleted_count ?? deletablePages.length,
          skipped: response?.skipped ?? protectedPages,
        }),
      );
      clearPageSelection();
      await refreshAfterMutation(selectedPageId);
    } catch (error) {
      setActionError(getApiErrorMessage(error, "Не удалось удалить выбранные страницы"));
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedPageId) {
      return;
    }

    setIsDeleting(true);
    setActionError("");

    try {
      await designerApi.deleteDesignerPage(tenantId, selectedPageId);
      setDeleteModalOpen(false);
      await refreshAfterMutation();
    } catch (error) {
      setActionError(resolveDeletePageErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="designer-pages-registry">
      <div className="designer-page-header">
        <div>
          <h1 className="designer-page-title">Страницы</h1>
          <p className="designer-page-subtitle">
            Реестр страниц платформы: статус, использование и состав
          </p>
        </div>
        <button
          type="button"
          className="designer-btn designer-btn--primary"
          onClick={() => {
            setCreateSubmitError("");
            setCreateModalOpen(true);
          }}
        >
          <Plus size={16} style={{ marginRight: 6, verticalAlign: -2 }} />
          Страница
        </button>
      </div>

      <div className="designer-pages-registry__toolbar">
        <input
          type="search"
          className="designer-pages-registry__search"
          placeholder="Поиск по названию, типу, workspace, slug..."
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />

        <div className="designer-filter-chips">
          {STATUS_FILTER_OPTIONS.map((option) => {
            const isActive = statusFilter === option.id;
            const count = filterCounts[option.id] ?? 0;

            return (
              <button
                key={option.id}
                type="button"
                className={`designer-btn${isActive ? " designer-btn--primary" : ""}`}
                style={
                  isActive
                    ? undefined
                    : {
                        background: "#fff",
                        color: "#334155",
                        border: "1px solid var(--designer-border)",
                      }
                }
                onClick={() => setStatusFilter(option.id)}
              >
                {option.label} {count}
              </button>
            );
          })}
        </div>
      </div>

      {listError ? <p className="designer-error">{listError}</p> : null}
      {actionNotice ? <p className="designer-pages-registry__notice">{actionNotice}</p> : null}

      {selectedCount > 0 ? (
        <div className="designer-pages-registry__bulk" aria-label="Массовые действия">
          <span className="designer-pages-registry__bulk-count">Выбрано: {selectedCount}</span>
          <button
            type="button"
            className="designer-btn designer-btn--compact"
            disabled={isBulkDeleting || isSubmittingAction || isDeleting}
            onClick={clearPageSelection}
          >
            Снять выбор
          </button>
          <button
            type="button"
            className="designer-btn designer-btn--compact designer-btn--danger"
            disabled={isBulkDeleting || isSubmittingAction || isDeleting}
            onClick={handleOpenBulkDeleteModal}
          >
            {isBulkDeleting ? "Удаление…" : "Удалить выбранные"}
          </button>
        </div>
      ) : null}

      <div className="designer-pages-registry__workspace">
        <aside className="designer-pages-registry__master" aria-label="Список страниц">
          {loadingList ? (
            <div className="designer-loading">Загрузка страниц...</div>
          ) : (
            <PagesRegistryTable
              items={filteredItems}
              selectedPageId={selectedPageId}
              selectedPageIds={selectedPageIds}
              onSelectPage={setSelectedPageId}
              onTogglePageSelection={togglePageSelection}
              onToggleAllVisibleSelection={toggleAllVisibleSelection}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onToggleSort={handleToggleSort}
            />
          )}
        </aside>

        <section className="designer-pages-registry__detail" aria-label="Карточка страницы">
          {detailError ? <p className="designer-error">{detailError}</p> : null}
          <PageDetailPanel
            page={selectedDetail}
            loading={loadingDetail}
            actionError={actionError}
            isSubmittingAction={isSubmittingAction || isDeleting || isBulkDeleting}
            onOpen={handleOpenPage}
            onDuplicate={handleDuplicate}
            onPublish={() => handlePublishToggle("published")}
            onUnpublish={() => handlePublishToggle("draft")}
            onHideFromNavigation={() => handlePublishToggle("hidden")}
            onRestoreToNavigation={() => handlePublishToggle("published")}
            onDelete={() => setDeleteModalOpen(true)}
          />
        </section>
      </div>

      <CreatePageModal
        open={createModalOpen}
        isSubmitting={isCreating}
        submitError={createSubmitError}
        onClose={() => {
          if (!isCreating) {
            setCreateModalOpen(false);
          }
        }}
        onSubmit={handleCreatePage}
      />

      <DeletePageConfirmModal
        open={deleteModalOpen}
        pageTitle={selectedDetail?.title || "Страница"}
        bindings={selectedDetail?.bindings || []}
        isSubmitting={isDeleting}
        onCancel={() => {
          if (!isDeleting) {
            setDeleteModalOpen(false);
          }
        }}
        onConfirm={handleConfirmDelete}
      />

      <BulkDeletePagesConfirmModal
        open={bulkDeleteModalOpen}
        deletableCount={bulkDeletePreview.deletablePages.length}
        protectedCount={bulkDeletePreview.protectedPages.length}
        isSubmitting={isBulkDeleting}
        onCancel={() => {
          if (!isBulkDeleting) {
            setBulkDeleteModalOpen(false);
          }
        }}
        onConfirm={handleConfirmBulkDelete}
      />
    </div>
  );
}
