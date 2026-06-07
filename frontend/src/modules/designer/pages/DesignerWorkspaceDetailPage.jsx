import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useDesignerShell } from "../context/DesignerShellContext";
import {
  createDesignerWorkspaceTab,
  deleteDesignerWorkspaceTab,
  ensureDesignerWorkspaceTabs,
  getDesignerWorkspaceBySlug,
  listDesignerWorkspaceTabs,
  listObjectTypes,
  listPortalPages,
  updateDesignerWorkspaceTab,
} from "../api/designerApi";
import { listPublishedObjectViewsForWorkspace } from "../utils/listPublishedObjectViewsForWorkspace";
import "../styles/designerWorkspaceDetailPage.css";

const TAB_TYPE_OPTIONS = [
  { value: "object", label: "Объект" },
  { value: "page", label: "Страница" },
  { value: "link", label: "Ссылка" },
  { value: "dashboard", label: "Дашборд" },
  { value: "documents", label: "Документы" },
  { value: "process", label: "Процесс" },
  { value: "group", label: "Раздел" },
];

const INITIAL_FORM = {
  title: "",
  description: "",
  slug: "",
  slug_is_manual: false,
  icon: "",
  sort_order: 10,
  is_visible: true,
  tab_type: "object",
  page_source: "existing",
  new_page_title: "",
  object_type_id: "",
  object_view_id: "",
  target_id: "",
  url: "",
  open_in_new_tab: false,
};

export default function DesignerWorkspaceDetailPage() {
  const { tenantId } = useDesignerShell();
  const { workspaceSlug } = useParams();
  const resolvedTenantId = Number(tenantId) || 1;
  const [workspace, setWorkspace] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [objectTypes, setObjectTypes] = useState([]);
  const [pages, setPages] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(INITIAL_FORM);
  const [editingTabId, setEditingTabId] = useState(null);
  const [editingForm, setEditingForm] = useState(INITIAL_FORM);
  const [createObjectViews, setCreateObjectViews] = useState([]);
  const [editingObjectViews, setEditingObjectViews] = useState([]);
  const [createObjectViewsLoading, setCreateObjectViewsLoading] = useState(false);
  const [editingObjectViewsLoading, setEditingObjectViewsLoading] = useState(false);

  const slugify = useCallback((value) => {
    const map = {
      а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
      к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
      х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
    };
    return String(value || "")
      .trim()
      .toLowerCase()
      .split("")
      .map((char) => map[char] ?? char)
      .join("")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }, []);

  useEffect(() => {
    if (createForm.slug_is_manual) return;
    const nextSlug = slugify(createForm.title);
    setCreateForm((prev) => (prev.slug === nextSlug ? prev : { ...prev, slug: nextSlug }));
  }, [createForm.slug_is_manual, createForm.title, slugify]);

  useEffect(() => {
    if (editingForm.slug_is_manual) return;
    if (!editingTabId) return;
    const nextSlug = slugify(editingForm.title);
    setEditingForm((prev) => (prev.slug === nextSlug ? prev : { ...prev, slug: nextSlug }));
  }, [editingForm.slug_is_manual, editingForm.title, editingTabId, slugify]);

  const loadWorkspaceData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getDesignerWorkspaceBySlug(resolvedTenantId, workspaceSlug || "");
      setWorkspace(data);
      if (!data?.id) {
        return;
      }
      await ensureDesignerWorkspaceTabs(resolvedTenantId, data.id);
      const [tabsResponse, objectTypesResponse, pagesResponse] = await Promise.all([
        listDesignerWorkspaceTabs(resolvedTenantId, data.id),
        listObjectTypes(resolvedTenantId),
        listPortalPages(resolvedTenantId),
      ]);
      setTabs(Array.isArray(tabsResponse?.tabs) ? tabsResponse.tabs : []);
      const allObjectTypes = Array.isArray(objectTypesResponse) ? objectTypesResponse : [];
      setObjectTypes(allObjectTypes.filter((item) => String(item?.status || "active") !== "archived"));
      setPages(Array.isArray(pagesResponse) ? pagesResponse : []);
    } catch (loadError) {
      setError(loadError?.message || "Не удалось открыть рабочее пространство");
    } finally {
      setIsLoading(false);
    }
  }, [resolvedTenantId, workspaceSlug]);

  useEffect(() => {
    void loadWorkspaceData();
  }, [loadWorkspaceData]);

  const objectTypeById = useMemo(
    () => Object.fromEntries(objectTypes.map((item) => [String(item.id), item])),
    [objectTypes],
  );
  const objectTypeOptions = useMemo(
    () =>
      objectTypes.map((item) => ({
        id: String(item.id),
        label: item.name || item.key,
      })),
    [objectTypes],
  );
  const pageOptions = useMemo(
    () =>
      pages.map((item) => ({
        id: String(item.id),
        label: item.title || `Страница #${item.id}`,
      })),
    [pages],
  );
  const pageById = useMemo(() => Object.fromEntries(pageOptions.map((item) => [item.id, item.label])), [pageOptions]);
  const editingTab = useMemo(
    () => tabs.find((tab) => tab.id === editingTabId) || null,
    [editingTabId, tabs],
  );

  const loadPublishedViewsForObject = useCallback(
    async (objectTypeId, setter, loadingSetter) => {
      const objectType = objectTypeById[String(objectTypeId || "")];
      if (!objectType) {
        setter([]);
        return;
      }
      loadingSetter(true);
      try {
        const views = await listPublishedObjectViewsForWorkspace(resolvedTenantId, objectType);
        setter(views);
      } catch {
        setter([]);
      } finally {
        loadingSetter(false);
      }
    },
    [objectTypeById, resolvedTenantId],
  );

  useEffect(() => {
    if (createForm.tab_type !== "object" || !createForm.object_type_id) {
      setCreateObjectViews([]);
      return undefined;
    }
    let cancelled = false;
    void loadPublishedViewsForObject(
      createForm.object_type_id,
      (views) => {
        if (!cancelled) {
          setCreateObjectViews(views);
        }
      },
      setCreateObjectViewsLoading,
    );
    return () => {
      cancelled = true;
    };
  }, [createForm.object_type_id, createForm.tab_type, loadPublishedViewsForObject]);

  useEffect(() => {
    if (editingForm.tab_type !== "object" || !editingForm.object_type_id) {
      setEditingObjectViews([]);
      return undefined;
    }
    let cancelled = false;
    void loadPublishedViewsForObject(
      editingForm.object_type_id,
      (views) => {
        if (!cancelled) {
          setEditingObjectViews(views);
        }
      },
      setEditingObjectViewsLoading,
    );
    return () => {
      cancelled = true;
    };
  }, [editingForm.object_type_id, editingForm.tab_type, loadPublishedViewsForObject]);

  const handleCreateTab = useCallback(async () => {
    if (!workspace?.id || !createForm.title.trim()) {
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const payload = {
        title: createForm.title.trim(),
        description: createForm.description.trim() || undefined,
        slug: createForm.slug_is_manual ? createForm.slug.trim() || undefined : undefined,
        icon: createForm.icon.trim() || undefined,
        sort_order: Number(createForm.sort_order) || 0,
        is_visible: Boolean(createForm.is_visible),
        tab_type: createForm.tab_type,
        open_in_new_tab: Boolean(createForm.open_in_new_tab),
      };
      if (createForm.tab_type === "object") {
        payload.object_type_id = createForm.object_type_id || undefined;
        payload.object_view_id = createForm.object_view_id || undefined;
      } else if (createForm.tab_type === "page") {
        if (createForm.page_source === "new") {
          payload.create_new_page = true;
          payload.new_page_title = (createForm.new_page_title || createForm.title).trim() || undefined;
        } else {
          payload.target_id = createForm.target_id || undefined;
        }
      } else if (createForm.tab_type === "link") {
        payload.url = createForm.url.trim() || undefined;
      } else if (createForm.tab_type !== "group") {
        payload.target_id = createForm.target_id.trim() || undefined;
      }
      await createDesignerWorkspaceTab(resolvedTenantId, workspace.id, payload);
      setCreateForm(INITIAL_FORM);
      setIsCreateOpen(false);
      await loadWorkspaceData();
    } catch (saveError) {
      setError(saveError?.message || "Не удалось создать вкладку");
    } finally {
      setIsSaving(false);
    }
  }, [createForm, loadWorkspaceData, resolvedTenantId, workspace?.id]);

  const updateTabField = useCallback(
    async (tab, patch) => {
      if (!workspace?.id) return;
      setError("");
      try {
        await updateDesignerWorkspaceTab(resolvedTenantId, workspace.id, tab.id, patch);
        await loadWorkspaceData();
      } catch (saveError) {
        setError(saveError?.message || "Не удалось обновить вкладку");
      }
    },
    [loadWorkspaceData, resolvedTenantId, workspace?.id],
  );
  const handleStartEdit = useCallback((tab) => {
    setEditingTabId(tab.id);
    setEditingForm({
      title: tab.title || "",
      description: tab.description || "",
      slug: tab.slug || "",
      slug_is_manual: Boolean(tab.slug_is_manual),
      icon: tab.icon || "",
      sort_order: Number(tab.sort_order || 0),
      is_visible: Boolean(tab.is_visible),
      tab_type: tab.tab_type || "object",
      page_source: "existing",
      new_page_title: "",
      object_type_id: String(tab.object_type_id || ""),
      object_view_id: String(tab.object_view_id || ""),
      target_id: String(tab.target_id || ""),
      url: String(tab.url || ""),
      open_in_new_tab: Boolean(tab.open_in_new_tab),
    });
  }, []);
  const handleSaveEdit = useCallback(async () => {
    if (!editingTabId) return;
    const targetTab = tabs.find((tab) => tab.id === editingTabId);
    if (!targetTab) return;
    setIsSaving(true);
    try {
      const payload = {
        title: editingForm.title.trim(),
        description: editingForm.description.trim() || null,
        slug: editingForm.slug_is_manual ? editingForm.slug.trim() || undefined : undefined,
        icon: editingForm.icon.trim() || null,
        sort_order: Number(editingForm.sort_order) || 0,
        is_visible: Boolean(editingForm.is_visible),
        tab_type: editingForm.tab_type,
        open_in_new_tab: Boolean(editingForm.open_in_new_tab),
      };
      if (!targetTab.is_system && editingForm.tab_type === "object") {
        payload.object_type_id = editingForm.object_type_id;
        payload.object_view_id = editingForm.object_view_id;
      } else if (editingForm.tab_type === "page") {
        payload.target_id = editingForm.target_id;
      } else if (editingForm.tab_type === "link") {
        payload.url = editingForm.url;
      } else if (editingForm.tab_type !== "group") {
        payload.target_id = editingForm.target_id;
      }
      await updateTabField(targetTab, payload);
      setEditingTabId(null);
    } finally {
      setIsSaving(false);
    }
  }, [editingForm, editingTabId, tabs, updateTabField]);

  const resolveTabTypeLabel = useCallback((tabType) => {
    return TAB_TYPE_OPTIONS.find((item) => item.value === tabType)?.label || "Неизвестно";
  }, []);
  const resolveTargetLabel = useCallback(
    (tab) => {
      if (tab.tab_type === "object") {
        const typeLabel =
          tab.object_type_name ||
          objectTypeById[String(tab.object_type_id || "")]?.name ||
          "Не выбран";
        return tab.object_view_name ? `${typeLabel} · ${tab.object_view_name}` : typeLabel;
      }
      if (tab.tab_type === "page") {
        return pageById[String(tab.target_id || "")] || tab.target_label || "Не выбрана";
      }
      if (tab.tab_type === "link") {
        return tab.url || "—";
      }
      if (tab.tab_type === "group") {
        return "Группирующая вкладка";
      }
      return tab.target_id || "—";
    },
    [objectTypeById, pageById],
  );
  const isCreateValid = useMemo(() => {
    if (!createForm.title.trim()) return false;
    if (createForm.tab_type === "object") {
      return Boolean(createForm.object_type_id && createForm.object_view_id);
    }
    if (createForm.tab_type === "page") {
      if (createForm.page_source === "new") {
        return Boolean((createForm.new_page_title || createForm.title).trim());
      }
      return Boolean(createForm.target_id);
    }
    if (createForm.tab_type === "link") return Boolean(createForm.url.trim());
    if (createForm.tab_type === "group") return true;
    return Boolean(createForm.target_id.trim());
  }, [createForm]);
  const createNewPageSlugPreview = useMemo(
    () => slugify((createForm.new_page_title || createForm.title || "").trim()),
    [createForm.new_page_title, createForm.title, slugify],
  );

  const handleDeleteTab = useCallback(
    async (tab) => {
      if (!workspace?.id || tab.is_system) return;
      if (!window.confirm(`Удалить вкладку "${tab.title}"?`)) return;
      setError("");
      try {
        await deleteDesignerWorkspaceTab(resolvedTenantId, workspace.id, tab.id);
        await loadWorkspaceData();
      } catch (deleteError) {
        setError(deleteError?.message || "Не удалось удалить вкладку");
      }
    },
    [loadWorkspaceData, resolvedTenantId, workspace?.id],
  );

  if (isLoading) {
    return <p className="designer-workspace-settings__muted">Загрузка настроек пространства...</p>;
  }

  if (error) {
    return (
      <section className="designer-workspace-settings">
        <p className="designer-workspace-settings__error">{error}</p>
        <button
          type="button"
          className="designer-workspace-settings__btn designer-workspace-settings__btn--ghost"
          onClick={() => void loadWorkspaceData()}
        >
          Повторить
        </button>
      </section>
    );
  }

  return (
    <section className="designer-workspace-settings">
      <header className="designer-workspace-settings__header">
        <div>
          <p className="designer-workspace-settings__subtitle">Рабочее пространство</p>
          <h1 className="designer-workspace-settings__title">
            <span className="designer-workspace-settings__title-main">
              {workspace?.title || "Без названия"}
            </span>
            <span className="designer-workspace-settings__title-slug">
              {" "}
              · {workspace?.slug || "—"}
            </span>
          </h1>
        </div>
        <span
          className={`designer-workspace-settings__status ${
            workspace?.status === "archived" ? "is-archived" : "is-active"
          }`}
        >
          {workspace?.status === "archived" ? "Архив" : "Активно"}
        </span>
      </header>

      <section className="designer-workspace-settings__tabs">
        <div className="designer-workspace-settings__tabs-head">
          <h2>Вкладки пространства</h2>
          <button
            type="button"
            className="designer-workspace-settings__btn designer-workspace-settings__btn--primary"
            onClick={() => setIsCreateOpen((prev) => !prev)}
          >
            {isCreateOpen ? "Скрыть форму" : "+ Создать вкладку"}
          </button>
        </div>

        <div className="designer-workspace-settings__table">
          <header className="designer-workspace-settings__table-header">
            <span>Порядок</span>
            <span>Название</span>
            <span>Тип</span>
            <span>Статус</span>
            <span>Действия</span>
          </header>
          <div className="designer-workspace-settings__table-body">
            {tabs.map((tab) => (
              <article key={tab.id} className="designer-workspace-settings__table-row">
                <span>{tab.sort_order}</span>
                <span>{tab.title}</span>
                <span>
                  {tab.is_system
                    ? "Системная: Главная"
                    : `${resolveTabTypeLabel(tab.tab_type)} · ${resolveTargetLabel(tab)}`}
                </span>
                <span className={tab.is_visible ? "is-visible" : "is-hidden"}>
                  {tab.is_visible ? "Показана" : "Скрыта"}
                </span>
                <div className="designer-workspace-settings__actions">
                  <button
                    type="button"
                    className="designer-workspace-settings__btn designer-workspace-settings__btn--ghost"
                    onClick={() => handleStartEdit(tab)}
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    className="designer-workspace-settings__btn designer-workspace-settings__btn--ghost"
                    onClick={() => void updateTabField(tab, { is_visible: !tab.is_visible })}
                  >
                    {tab.is_visible ? "Скрыть" : "Показать"}
                  </button>
                  {!tab.is_system ? (
                    <button
                      type="button"
                      className="designer-workspace-settings__btn designer-workspace-settings__btn--danger"
                      onClick={() => void handleDeleteTab(tab)}
                    >
                      Удалить
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>

        {isCreateOpen ? (
          <div className="designer-workspace-settings__form">
            <h3>Новая вкладка</h3>
            <div className="designer-workspace-settings__form-grid">
              <label>
                <span>Название</span>
                <input
                  value={createForm.title}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
                />
              </label>
              <label>
                <span>Slug</span>
                {createForm.slug_is_manual ? (
                  <input
                    value={createForm.slug}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, slug: event.target.value }))}
                  />
                ) : (
                  <div className="designer-workspace-settings__slug-preview">{createForm.slug || "будет сформирован автоматически"}</div>
                )}
              </label>
              <label>
                <span>Тип вкладки*</span>
                <select
                  value={createForm.tab_type}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      tab_type: event.target.value,
                      page_source: "existing",
                      new_page_title: "",
                      object_type_id: "",
                      object_view_id: "",
                      target_id: "",
                      url: "",
                    }))
                  }
                >
                  {TAB_TYPE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Порядок</span>
                <input
                  type="number"
                  value={Number(createForm.sort_order)}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, sort_order: Number(event.target.value) || 0 }))
                  }
                />
              </label>
              {createForm.tab_type === "object" ? (
                <>
                  <label>
                    <span>Объект*</span>
                    <select
                      value={createForm.object_type_id}
                      onChange={(event) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          object_type_id: event.target.value,
                          object_view_id: "",
                        }))
                      }
                    >
                      <option value="">Выберите тип</option>
                      {objectTypeOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Вкладка объекта*</span>
                    <select
                      value={createForm.object_view_id}
                      disabled={!createForm.object_type_id || createObjectViewsLoading}
                      onChange={(event) =>
                        setCreateForm((prev) => ({ ...prev, object_view_id: event.target.value }))
                      }
                    >
                      <option value="">
                        {createObjectViewsLoading
                          ? "Загрузка вкладок..."
                          : "Выберите вкладку объекта"}
                      </option>
                      {createObjectViews.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    {createForm.object_type_id &&
                    !createObjectViewsLoading &&
                    createObjectViews.length === 0 ? (
                      <p className="designer-workspace-settings__hint">
                        У объекта отсутствуют опубликованные вкладки. Создайте вкладку
                        объекта и опубликуйте её.
                      </p>
                    ) : null}
                  </label>
                </>
              ) : null}
              {createForm.tab_type === "page" ? (
                <>
                  <label>
                    <span>Источник страницы</span>
                    <select
                      value={createForm.page_source}
                      onChange={(event) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          page_source: event.target.value,
                          target_id: "",
                          new_page_title:
                            event.target.value === "new"
                              ? (prev.new_page_title || prev.title)
                              : prev.new_page_title,
                        }))
                      }
                    >
                      <option value="existing">Существующая страница</option>
                      <option value="new">Новая страница</option>
                    </select>
                  </label>
                  {createForm.page_source === "existing" ? (
                    <label>
                      <span>Страница*</span>
                      <select
                        value={createForm.target_id}
                        onChange={(event) => setCreateForm((prev) => ({ ...prev, target_id: event.target.value }))}
                      >
                        <option value="">Выберите страницу</option>
                        {pageOptions.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label>
                      <span>Название новой страницы*</span>
                      <input
                        value={createForm.new_page_title}
                        onChange={(event) =>
                          setCreateForm((prev) => ({ ...prev, new_page_title: event.target.value }))
                        }
                        placeholder="Например: Карта платформы"
                      />
                      <small className="designer-workspace-settings__hint">
                        Slug страницы: {createNewPageSlugPreview || "будет сформирован автоматически"}
                      </small>
                    </label>
                  )}
                </>
              ) : null}
              {createForm.tab_type === "link" ? (
                <>
                  <label>
                    <span>URL*</span>
                    <input
                      value={createForm.url}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, url: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Открывать</span>
                    <select
                      value={createForm.open_in_new_tab ? "new" : "current"}
                      onChange={(event) =>
                        setCreateForm((prev) => ({ ...prev, open_in_new_tab: event.target.value === "new" }))
                      }
                    >
                      <option value="current">В текущем окне</option>
                      <option value="new">В новой вкладке</option>
                    </select>
                  </label>
                </>
              ) : null}
              {["dashboard", "documents", "process"].includes(createForm.tab_type) ? (
                <label>
                  <span>Target ID*</span>
                  <input
                    value={createForm.target_id}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, target_id: event.target.value }))}
                  />
                </label>
              ) : null}
            </div>
            <div className="designer-workspace-settings__form-inline-actions">
              <button
                type="button"
                className="designer-workspace-settings__btn designer-workspace-settings__btn--ghost"
                onClick={() =>
                  setCreateForm((prev) => ({ ...prev, slug_is_manual: !prev.slug_is_manual, slug: prev.slug_is_manual ? "" : prev.slug }))
                }
              >
                {createForm.slug_is_manual ? "Авто-slug" : "Изменить slug"}
              </button>
            </div>
            <label className="designer-workspace-settings__form-description">
              <span>Описание</span>
              <textarea
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </label>
            <div className="designer-workspace-settings__form-actions">
              <button
                type="button"
                className="designer-workspace-settings__btn designer-workspace-settings__btn--ghost"
                onClick={() => {
                  setCreateForm(INITIAL_FORM);
                  setIsCreateOpen(false);
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                className="designer-workspace-settings__btn designer-workspace-settings__btn--primary"
                disabled={isSaving || !isCreateValid}
                onClick={() => void handleCreateTab()}
              >
                {isSaving ? "Создаём..." : "Создать вкладку"}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {editingTabId ? (
        <div className="designer-workspace-settings__modal-overlay">
          <div className="designer-workspace-settings__modal">
            <h3>Редактировать вкладку</h3>
            <div className="designer-workspace-settings__form-grid">
              <label>
                <span>Название</span>
                <input
                  value={editingForm.title}
                  onChange={(event) =>
                    setEditingForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Slug</span>
                {editingForm.slug_is_manual ? (
                  <input
                    value={editingForm.slug}
                    onChange={(event) => setEditingForm((prev) => ({ ...prev, slug: event.target.value }))}
                  />
                ) : (
                  <div className="designer-workspace-settings__slug-preview">{editingForm.slug || "авто"}</div>
                )}
              </label>
              <label>
                <span>Тип вкладки*</span>
                <select
                  value={editingForm.tab_type}
                  disabled={Boolean(editingTab?.is_system)}
                  onChange={(event) =>
                    setEditingForm((prev) => ({ ...prev, tab_type: event.target.value, object_type_id: "", target_id: "", url: "" }))
                  }
                >
                  {TAB_TYPE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Порядок</span>
                <input
                  type="number"
                  value={Number(editingForm.sort_order)}
                  onChange={(event) =>
                    setEditingForm((prev) => ({ ...prev, sort_order: Number(event.target.value) || 0 }))
                  }
                />
              </label>
              {editingForm.tab_type === "object" ? (
                <>
                  <label>
                    <span>Объект*</span>
                    <select
                      value={editingForm.object_type_id}
                      disabled={Boolean(editingTab?.is_system)}
                      onChange={(event) =>
                        setEditingForm((prev) => ({
                          ...prev,
                          object_type_id: event.target.value,
                          object_view_id: "",
                        }))
                      }
                    >
                      <option value="">{editingTab?.is_system ? "Системная вкладка" : "Выберите тип"}</option>
                      {objectTypeOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Вкладка объекта*</span>
                    <select
                      value={editingForm.object_view_id}
                      disabled={
                        Boolean(editingTab?.is_system) ||
                        !editingForm.object_type_id ||
                        editingObjectViewsLoading
                      }
                      onChange={(event) =>
                        setEditingForm((prev) => ({ ...prev, object_view_id: event.target.value }))
                      }
                    >
                      <option value="">
                        {editingObjectViewsLoading
                          ? "Загрузка вкладок..."
                          : "Выберите вкладку объекта"}
                      </option>
                      {editingObjectViews.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    {editingForm.object_type_id &&
                    !editingObjectViewsLoading &&
                    editingObjectViews.length === 0 ? (
                      <p className="designer-workspace-settings__hint">
                        У объекта отсутствуют опубликованные вкладки. Создайте вкладку
                        объекта и опубликуйте её.
                      </p>
                    ) : null}
                  </label>
                </>
              ) : null}
              {editingForm.tab_type === "page" ? (
                <label>
                  <span>Страница*</span>
                  <select
                    value={editingForm.target_id}
                    onChange={(event) =>
                      setEditingForm((prev) => ({ ...prev, target_id: event.target.value }))
                    }
                  >
                    <option value="">Выберите страницу</option>
                    {pageOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {editingForm.tab_type === "link" ? (
                <>
                  <label>
                    <span>URL*</span>
                    <input
                      value={editingForm.url}
                      onChange={(event) => setEditingForm((prev) => ({ ...prev, url: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Открывать</span>
                    <select
                      value={editingForm.open_in_new_tab ? "new" : "current"}
                      onChange={(event) =>
                        setEditingForm((prev) => ({ ...prev, open_in_new_tab: event.target.value === "new" }))
                      }
                    >
                      <option value="current">В текущем окне</option>
                      <option value="new">В новой вкладке</option>
                    </select>
                  </label>
                </>
              ) : null}
              {["dashboard", "documents", "process"].includes(editingForm.tab_type) ? (
                <label>
                  <span>Target ID*</span>
                  <input
                    value={editingForm.target_id}
                    onChange={(event) => setEditingForm((prev) => ({ ...prev, target_id: event.target.value }))}
                  />
                </label>
              ) : null}
            </div>
            <div className="designer-workspace-settings__form-inline-actions">
              <button
                type="button"
                className="designer-workspace-settings__btn designer-workspace-settings__btn--ghost"
                disabled={Boolean(editingTab?.is_system)}
                onClick={() => setEditingForm((prev) => ({ ...prev, slug_is_manual: !prev.slug_is_manual }))}
              >
                {editingForm.slug_is_manual ? "Авто-slug" : "Изменить slug"}
              </button>
            </div>
            <label className="designer-workspace-settings__form-description">
              <span>Описание</span>
              <textarea
                value={editingForm.description}
                onChange={(event) =>
                  setEditingForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </label>
            <div className="designer-workspace-settings__form-actions">
              <button
                type="button"
                className="designer-workspace-settings__btn designer-workspace-settings__btn--ghost"
                onClick={() => setEditingTabId(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="designer-workspace-settings__btn designer-workspace-settings__btn--primary"
                disabled={
                  !editingForm.title.trim() ||
                  (!editingTab?.is_system &&
                    editingForm.tab_type === "object" &&
                    (!editingForm.object_type_id || !editingForm.object_view_id)) ||
                  (editingForm.tab_type === "page" && !editingForm.target_id) ||
                  (editingForm.tab_type === "link" && !editingForm.url.trim())
                }
                onClick={() => void handleSaveEdit()}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

