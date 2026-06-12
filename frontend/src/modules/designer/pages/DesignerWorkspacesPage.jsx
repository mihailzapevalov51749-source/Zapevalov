import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { useDesignerShell } from "../context/DesignerShellContext";
import {
  archiveDesignerWorkspace,
  createDesignerWorkspace,
  deleteDesignerWorkspace,
  getWorkspaceMenuPlacements,
  listDesignerWorkspaces,
  unpublishDesignerWorkspace,
  updateDesignerWorkspace,
} from "../api/designerApi";
import WorkspacePublishToMenuDialog from "../components/workspaces/WorkspacePublishToMenuDialog";
import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";
import { usePlatformConfirm } from "../../../shared/platformModal";
import "../styles/designerWorkspacesPage.css";

const fieldStyle = { display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 };
const inputStyle = { border: "1px solid #CBD5E1", borderRadius: 8, padding: "8px 10px", fontSize: 14 };
const buttonStyle = {
  border: "1px solid #2563EB",
  background: "#2563EB",
  color: "#FFFFFF",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
};
const ghostButtonStyle = {
  border: "1px solid #CBD5E1",
  background: "#FFFFFF",
  color: "#0F172A",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
};

const initialForm = { title: "", description: "", slug: "", icon: "", sort_order: 0, status: "active" };

function WorkspaceActionsMenu({ workspace, disabled, onEdit, onPublish, onUnpublish, onArchive, onDelete }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const panelWidth = 220;
    const panelHeight = 248;
    const viewportPadding = 10;
    const availableBottom = window.innerHeight - rect.bottom;
    const preferTop = availableBottom < panelHeight;
    const top = preferTop
      ? Math.max(viewportPadding, rect.top - panelHeight - 8)
      : Math.min(window.innerHeight - panelHeight - viewportPadding, rect.bottom + 8);
    const left = Math.min(
      window.innerWidth - panelWidth - viewportPadding,
      Math.max(viewportPadding, rect.right - panelWidth),
    );
    setPanelPosition({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onClickOutside = (event) => {
      const insideTrigger = rootRef.current?.contains(event.target);
      const insidePanel = panelRef.current?.contains(event.target);
      if (!insideTrigger && !insidePanel) {
        setOpen(false);
      }
    };
    const onEscape = (event) => event.key === "Escape" && setOpen(false);
    updatePanelPosition();
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open, updatePanelPosition]);
  const closeAndRun = (fn) => {
    setOpen(false);
    fn?.();
  };
  return (
    <div className="designer-workspace-menu" ref={rootRef}>
      <button
        type="button"
        className="designer-workspace-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        ref={triggerRef}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        <MoreHorizontal size={16} strokeWidth={1.75} />
      </button>
      {open
        ? createPortal(
            <div
              className="designer-workspace-menu__panel"
              ref={panelRef}
              style={{ top: panelPosition.top, left: panelPosition.left }}
              role="menu"
              aria-label="Действия пространства"
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" className="designer-workspace-menu__item" role="menuitem" onClick={() => closeAndRun(() => window.location.assign(`/portal/${workspace.tenant_id}/workspaces/${workspace.slug}`))}>
                Открыть в Офисе
              </button>
              <button type="button" className="designer-workspace-menu__item" role="menuitem" onClick={() => closeAndRun(onEdit)}>
                Редактировать
              </button>
              {workspace.publication_status === "published" ? (
                <button type="button" className="designer-workspace-menu__item" role="menuitem" onClick={() => closeAndRun(onUnpublish)}>
                  Снять с публикации
                </button>
              ) : (
                <button type="button" className="designer-workspace-menu__item" role="menuitem" onClick={() => closeAndRun(onPublish)}>
                  Опубликовать
                </button>
              )}
              {workspace.status !== "archived" ? (
                <button type="button" className="designer-workspace-menu__item" role="menuitem" onClick={() => closeAndRun(onArchive)}>
                  Архивировать
                </button>
              ) : null}
              <div className="designer-workspace-menu__danger-zone">
                <button
                  type="button"
                  className="designer-workspace-menu__item designer-workspace-menu__item--danger"
                  role="menuitem"
                  onClick={() => closeAndRun(onDelete)}
                >
                  Удалить
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function CreateWorkspaceModal({ title, submitLabel, initialValue, onClose, onSubmit, isSaving }) {
  const [form, setForm] = useState(initialValue || initialForm);
  useEffect(() => {
    setForm(initialValue || initialForm);
  }, [initialValue]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1600 }}>
      <div style={{ width: "100%", maxWidth: 560, border: "1px solid #E2E8F0", borderRadius: 12, background: "#fff", padding: "20px 22px", boxSizing: "border-box" }}>
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>{title}</h3>
        <label style={fieldStyle}><span>Название</span><input style={inputStyle} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Например, Разработка" /></label>
        <label style={fieldStyle}><span>Описание</span><textarea style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></label>
        <label style={fieldStyle}><span>Slug (необязательно)</span><input style={inputStyle} value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder="development" /></label>
        <label style={fieldStyle}><span>Иконка (опционально)</span><input style={inputStyle} value={form.icon} onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))} placeholder="🛠" /></label>
        <label style={fieldStyle}><span>Порядок</span><input style={inputStyle} type="number" value={String(form.sort_order)} onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) || 0 }))} /></label>
        <label style={fieldStyle}><span>Статус</span><select style={inputStyle} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}><option value="active">Активное</option><option value="archived">Архивное</option></select></label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button type="button" style={ghostButtonStyle} onClick={onClose} disabled={isSaving}>Отмена</button>
          <button type="button" style={buttonStyle} disabled={isSaving || !form.title.trim()} onClick={() => onSubmit(form)}>{isSaving ? "Сохраняем..." : submitLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default function DesignerWorkspacesPage() {
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_WORKSPACES,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    canMinimize: true,
  });

  const platformConfirm = usePlatformConfirm();
  const navigate = useNavigate();
  const { tenantId } = useDesignerShell();
  const resolvedTenantId = Number(tenantId) || 1;
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [publishingId, setPublishingId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [publishDialogWorkspace, setPublishDialogWorkspace] = useState(null);
  const [placementsByWorkspaceId, setPlacementsByWorkspaceId] = useState({});

  const sortedItems = useMemo(() => [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id), [items]);

  const resolveNavigationLabel = useCallback((workspace) => {
    const placements = placementsByWorkspaceId[workspace.id] || [];
    if (!placements.length) {
      return ["Не опубликовано"];
    }
    const preferred = placements.find((item) => item.menu_scope === "designer") || placements[0];
    const scopeLabel = preferred.menu_scope === "runtime" ? "Офис" : "Студия";
    return [scopeLabel, workspace.title];
  }, [placementsByWorkspaceId]);

  const resolveObjectCount = useCallback((workspace) => {
    const maybeCount =
      workspace?.objects_count ??
      workspace?.object_count ??
      workspace?.objectsCount ??
      workspace?.stats?.objects ??
      workspace?.counters?.objects;
    const normalized = Number(maybeCount);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await listDesignerWorkspaces(resolvedTenantId);
      const list = Array.isArray(data) ? data : [];
      setItems(list);
      const published = list.filter((item) => item.publication_status === "published");
      const entries = await Promise.all(
        published.map(async (item) => {
          try {
            const result = await getWorkspaceMenuPlacements(resolvedTenantId, item.id);
            return [item.id, result?.placements || []];
          } catch {
            return [item.id, []];
          }
        }),
      );
      setPlacementsByWorkspaceId(Object.fromEntries(entries));
    } catch (loadError) {
      setError(loadError?.message || "Не удалось загрузить рабочие пространства");
    } finally {
      setIsLoading(false);
    }
  }, [resolvedTenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toPayload = useCallback((form) => {
    const payload = {
      title: String(form.title || "").trim(),
      description: String(form.description || "").trim(),
      sort_order: Number(form.sort_order) || 0,
      status: form.status === "archived" ? "archived" : "active",
    };
    const slug = String(form.slug || "").trim();
    const icon = String(form.icon || "").trim();
    if (slug) payload.slug = slug;
    if (icon) payload.icon = icon;
    return payload;
  }, []);

  const handleCreateOrUpdate = useCallback(async (form) => {
    setIsSaving(true);
    setError("");
    try {
      const payload = toPayload(form);
      if (editingWorkspace) {
        await updateDesignerWorkspace(resolvedTenantId, editingWorkspace.id, payload);
        if (editingWorkspace.publication_status === "published") {
          window.dispatchEvent(new CustomEvent("yasnopro:designer-navigation:reload"));
        }
      } else {
        await createDesignerWorkspace(resolvedTenantId, payload);
      }
      setIsModalOpen(false);
      setEditingWorkspace(null);
      await load();
    } catch (err) {
      setError(err?.message || (editingWorkspace ? "Не удалось обновить пространство" : "Не удалось создать пространство"));
    } finally {
      setIsSaving(false);
    }
  }, [editingWorkspace, load, resolvedTenantId, toPayload]);

  return (
    <section className="designer-workspaces-page">
      <header className="designer-workspaces-page__header">
        <h1 className="designer-workspaces-page__title">Рабочие пространства</h1>
        <button type="button" className="designer-workspaces-page__create-btn" onClick={() => setIsModalOpen(true)}>
          Создать пространство
        </button>
      </header>

      {error ? <p className="designer-workspaces-page__error">{error}</p> : null}
      {isLoading ? <p className="designer-workspaces-page__muted">Загрузка...</p> : null}
      {!isLoading && sortedItems.length === 0 ? <p className="designer-workspaces-page__muted">Пространств пока нет. Создайте первое рабочее пространство.</p> : null}

      {!isLoading && sortedItems.length > 0 ? (
        <section className="designer-workspace-list">
          <header className="designer-workspace-list__header">
            <span>Название</span>
            <span>Навигация</span>
            <span>Статус</span>
            <span>Объекты</span>
            <span>Действия</span>
          </header>
          <div className="designer-workspace-list__rows">
            {sortedItems.map((workspace) => (
              <article
                key={workspace.id}
                className="designer-workspace-row"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/designer/tenant/${resolvedTenantId}/workspaces/${workspace.slug}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/designer/tenant/${resolvedTenantId}/workspaces/${workspace.slug}`);
                  }
                }}
              >
                <div className="designer-workspace-row__name">
                  <div className="designer-workspace-row__icon">{String(workspace.icon || "").trim() || "🗂️"}</div>
                  <div>
                    <h3 className="designer-workspace-row__title">{workspace.title}</h3>
                    <p className="designer-workspace-row__description">{workspace.description || "Описание не добавлено"}</p>
                  </div>
                </div>

                <div className="designer-workspace-row__navigation">
                  {resolveNavigationLabel(workspace).map((crumb, index, arr) => (
                    <span key={`${workspace.id}-crumb-${crumb}-${index}`} className="designer-workspace-row__crumb">
                      <span>{crumb}</span>
                      {index < arr.length - 1 ? <ChevronRight size={14} strokeWidth={1.9} /> : null}
                    </span>
                  ))}
                </div>

                <div className="designer-workspace-row__status">
                  <span className={`designer-workspace-chip ${workspace.status === "archived" ? "is-warning" : "is-success"}`}>
                    {workspace.status === "archived" ? "Архивное" : "Активно"}
                  </span>
                  <span className={`designer-workspace-row__publication ${workspace.publication_status === "published" ? "is-success" : "is-muted"}`}>
                    <span className="designer-workspace-row__publication-dot" />
                    {workspace.publication_status === "published" ? "Опубликовано" : "Не опубликовано"}
                  </span>
                </div>

                <div className="designer-workspace-row__objects">
                  <strong>{resolveObjectCount(workspace)}</strong>
                  <span>объектов</span>
                </div>

                <div className="designer-workspace-row__actions" onClick={(event) => event.stopPropagation()}>
                  <WorkspaceActionsMenu
                    workspace={workspace}
                    disabled={publishingId === workspace.id || actionLoadingId === workspace.id}
                    onEdit={() => { setEditingWorkspace(workspace); setIsModalOpen(true); }}
                    onPublish={() => setPublishDialogWorkspace(workspace)}
                    onUnpublish={async () => {
                      setError("");
                      setPublishingId(workspace.id);
                      try {
                        await unpublishDesignerWorkspace(resolvedTenantId, workspace.id);
                        await load();
                        window.dispatchEvent(new CustomEvent("yasnopro:designer-navigation:reload"));
                      } catch (err) {
                        setError(err?.message || "Не удалось снять с публикации");
                      } finally {
                        setPublishingId(null);
                      }
                    }}
                    onArchive={async () => {
                      setError("");
                      setActionLoadingId(workspace.id);
                      try {
                        await archiveDesignerWorkspace(resolvedTenantId, workspace.id);
                        await load();
                        window.dispatchEvent(new CustomEvent("yasnopro:designer-navigation:reload"));
                      } catch (err) {
                        setError(err?.message || "Не удалось архивировать пространство");
                      } finally {
                        setActionLoadingId(null);
                      }
                    }}
                    onDelete={async () => {
                      const confirmed = await platformConfirm({
                        title: "Удалить рабочее пространство?",
                        message: `Удалить пространство "${workspace.title}"?`,
                        confirmLabel: "Удалить",
                        cancelLabel: "Отмена",
                        variant: "danger",
                      });

                      if (!confirmed) return;

                      setError("");
                      setActionLoadingId(workspace.id);
                      try {
                        await deleteDesignerWorkspace(resolvedTenantId, workspace.id);
                        await load();
                        window.dispatchEvent(new CustomEvent("yasnopro:designer-navigation:reload"));
                      } catch (err) {
                        setError(err?.message || "Не удалось удалить пространство");
                      } finally {
                        setActionLoadingId(null);
                      }
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
          <footer className="designer-workspace-list__footer">Всего пространств: {sortedItems.length}</footer>
        </section>
      ) : null}

      {isModalOpen ? (
        <CreateWorkspaceModal
          title={editingWorkspace ? "Редактировать пространство" : "Создать пространство"}
          submitLabel={editingWorkspace ? "Сохранить изменения" : "Сохранить"}
          initialValue={
            editingWorkspace
              ? { title: editingWorkspace.title || "", description: editingWorkspace.description || "", slug: editingWorkspace.slug || "", icon: editingWorkspace.icon || "", sort_order: editingWorkspace.sort_order ?? 0, status: editingWorkspace.status || "active" }
              : initialForm
          }
          onClose={() => { setIsModalOpen(false); setEditingWorkspace(null); }}
          onSubmit={handleCreateOrUpdate}
          isSaving={isSaving}
        />
      ) : null}

      <WorkspacePublishToMenuDialog
        open={Boolean(publishDialogWorkspace)}
        tenantId={resolvedTenantId}
        workspace={publishDialogWorkspace}
        onClose={() => setPublishDialogWorkspace(null)}
        onSuccess={async () => {
          setPublishingId(publishDialogWorkspace?.id ?? null);
          await load();
          window.dispatchEvent(new CustomEvent("yasnopro:designer-navigation:reload"));
          setPublishingId(null);
        }}
      />
    </section>
  );
}

