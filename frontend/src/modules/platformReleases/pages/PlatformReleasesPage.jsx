import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";
import ReleaseCompositionSection from "../components/ReleaseCompositionSection";
import * as platformReleasesApi from "../api/platformReleasesApi";
import { PLATFORM_RELEASE_STATUS_LABELS } from "../platformReleaseStatusLabels";
import { canCreateReleaseFromDiff } from "../utils/releaseComposition";

import "../styles/platformReleasesPage.css";

const COMPOSE_MODE_ID = null;

function ReleaseEditorPanel({
  release,
  isLoading,
  error,
  composeTitle,
  composeDescription,
  onComposeTitleChange,
  onComposeDescriptionChange,
  diffResult,
  selectedElements,
  onToggleElement,
  isComparing,
  compareError,
  onCompare,
  onSave,
  onSubmitForReview,
}) {
  const isComposeMode = !release;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (isComposeMode) {
      setTitle(composeTitle);
      setDescription(composeDescription);
      setActionError("");
      return;
    }
    setTitle(release.title || "");
    setDescription(release.description || "");
    setActionError("");
  }, [release, isComposeMode, composeTitle, composeDescription]);

  const canEdit = isComposeMode || release?.status === "draft" || release?.status === "changes_requested";
  const canSubmit = release?.status === "draft" || release?.status === "changes_requested";

  const handleTitleChange = (value) => {
    setTitle(value);
    if (isComposeMode) {
      onComposeTitleChange(value);
    }
  };

  const handleDescriptionChange = (value) => {
    setDescription(value);
    if (isComposeMode) {
      onComposeDescriptionChange(value);
    }
  };

  const handleSave = async () => {
    if (!release) {
      return;
    }
    setIsSaving(true);
    setActionError("");
    try {
      await onSave(release.id, {
        title: title.trim(),
        description: description.trim() || null,
      });
    } catch (saveError) {
      setActionError(platformReleasesApi.getApiErrorMessage(saveError, "Не удалось сохранить"));
    } finally {
      setIsSaving(false);
    }
  };

  const runAction = async (action) => {
    setActionError("");
    try {
      await action();
    } catch (actionErr) {
      setActionError(platformReleasesApi.getApiErrorMessage(actionErr, "Операция не выполнена"));
    }
  };

  if (isLoading && !isComposeMode) {
    return <p className="platform-releases__status">Загрузка релиза…</p>;
  }

  return (
    <div className="platform-releases__detail">
      <div className="platform-releases__detail-header">
        {isComposeMode ? (
          <h2>Новый релиз</h2>
        ) : (
          <h2>
            {release.version}
            {" "}
            ·
            {" "}
            {PLATFORM_RELEASE_STATUS_LABELS[release.status] || release.status}
          </h2>
        )}
        <button type="button" onClick={onCompare} disabled={isComparing}>
          {isComparing ? "Сравнение…" : "Сравнить DEV и TEMPLATE"}
        </button>
      </div>

      <div className="platform-releases__detail-body">
        {error ? <p className="platform-releases__error">{error}</p> : null}
        {compareError ? <p className="platform-releases__error">{compareError}</p> : null}
        {actionError ? <p className="platform-releases__error">{actionError}</p> : null}

        {!isComposeMode && release.status === "changes_requested" && release.review_comment ? (
          <div className="platform-releases__review-comment">
            <strong>Комментарий Platform reviewer</strong>
            <p>{release.review_comment}</p>
          </div>
        ) : null}

        <div className="platform-releases__field">
          <label>Название релиза</label>
          <input
            value={title}
            onChange={(event) => handleTitleChange(event.target.value)}
            disabled={!canEdit}
          />
        </div>

        <div className="platform-releases__field">
          <label>Описание релиза</label>
          <textarea
            rows={4}
            value={description}
            onChange={(event) => handleDescriptionChange(event.target.value)}
            disabled={!canEdit}
          />
        </div>

        <ReleaseCompositionSection
          diffResult={isComposeMode ? diffResult : null}
          selectedKeys={selectedElements}
          onToggle={onToggleElement}
          readOnly={!isComposeMode}
          savedElementKeys={release?.included_architectural_elements || []}
        />

        {!isComposeMode ? (
          <div className="platform-releases__actions">
            {canEdit ? (
              <button type="button" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Сохранение…" : "Сохранить"}
              </button>
            ) : null}
            {canSubmit ? (
              <button
                type="button"
                onClick={() => runAction(() => onSubmitForReview(release.id))}
              >
                {release.status === "changes_requested"
                  ? "Повторно отправить на проверку"
                  : "Отправить на проверку"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function PlatformReleasesPage() {
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.STUDIO_SECTION,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
  });

  const [releases, setReleases] = useState([]);
  const [selectedId, setSelectedId] = useState(COMPOSE_MODE_ID);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [listError, setListError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [diffResult, setDiffResult] = useState(null);
  const [selectedElements, setSelectedElements] = useState([]);
  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState("");
  const [composeTitle, setComposeTitle] = useState("Новый релиз платформы");
  const [composeDescription, setComposeDescription] = useState("");

  const canCreateRelease = canCreateReleaseFromDiff(diffResult, selectedElements);

  const loadReleases = useCallback(async () => {
    setIsListLoading(true);
    setListError("");
    try {
      const items = await platformReleasesApi.listPlatformReleases();
      setReleases(items);
    } catch (error) {
      setListError(platformReleasesApi.getApiErrorMessage(error, "Не удалось загрузить релизы"));
    } finally {
      setIsListLoading(false);
    }
  }, []);

  const loadReleaseDetail = useCallback(async (releaseId) => {
    if (!releaseId) {
      setSelectedRelease(null);
      return;
    }
    setIsDetailLoading(true);
    setDetailError("");
    try {
      const item = await platformReleasesApi.getPlatformRelease(releaseId);
      setSelectedRelease(item);
    } catch (error) {
      setDetailError(platformReleasesApi.getApiErrorMessage(error, "Не удалось загрузить релиз"));
      setSelectedRelease(null);
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReleases();
  }, [loadReleases]);

  useEffect(() => {
    if (selectedId) {
      void loadReleaseDetail(selectedId);
      return;
    }
    setSelectedRelease(null);
    setDetailError("");
  }, [selectedId, loadReleaseDetail]);

  const handleCompare = async () => {
    setIsComparing(true);
    setCompareError("");
    try {
      const result = await platformReleasesApi.compareDevTemplate();
      setDiffResult(result);
      setSelectedElements(
        Array.isArray(result?.elements)
          ? result.elements.map((item) => item.component_key)
          : [],
      );
    } catch (error) {
      setDiffResult(null);
      setSelectedElements([]);
      setCompareError(
        platformReleasesApi.getApiErrorMessage(error, "Не удалось выполнить сравнение"),
      );
    } finally {
      setIsComparing(false);
    }
  };

  const toggleElementSelection = (componentKey) => {
    setSelectedElements((prev) => (
      prev.includes(componentKey)
        ? prev.filter((key) => key !== componentKey)
        : [...prev, componentKey]
    ));
  };

  const handleCreate = async () => {
    if (!canCreateRelease) {
      setListError(
        diffResult?.dev_matches_template || !diffResult?.has_changes
          ? "DEV и TEMPLATE совпадают. Нет изменений для публикации."
          : "Сначала выполните сравнение DEV и TEMPLATE и выберите элементы.",
      );
      return;
    }
    setIsCreating(true);
    setListError("");
    try {
      const created = await platformReleasesApi.createPlatformRelease({
        title: composeTitle.trim() || "Новый релиз платформы",
        description: composeDescription.trim() || null,
        selected_architectural_elements: selectedElements,
      });
      await loadReleases();
      setSelectedId(created.id);
    } catch (error) {
      setListError(platformReleasesApi.getApiErrorMessage(error, "Не удалось создать релиз"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleSave = async (releaseId, payload) => {
    const updated = await platformReleasesApi.updatePlatformRelease(releaseId, payload);
    setSelectedRelease(updated);
    await loadReleases();
  };

  const handleSubmitForReview = async (releaseId) => {
    const updated = await platformReleasesApi.submitReleaseForReview(releaseId);
    setSelectedRelease(updated);
    await loadReleases();
  };

  const sortedReleases = useMemo(
    () => [...releases].sort((left, right) => right.id - left.id),
    [releases],
  );

  const createDisabledReason = useMemo(() => {
    if (canCreateRelease) {
      return "Создать релиз по выбранным элементам";
    }
    if (!diffResult) {
      return "Сначала выполните сравнение DEV и TEMPLATE";
    }
    if (!diffResult.has_changes) {
      return "Нет изменений для публикации";
    }
    if (selectedElements.length === 0) {
      return "Выберите хотя бы один архитектурный элемент";
    }
    return "Нет данных для формирования релиза";
  }, [canCreateRelease, diffResult, selectedElements.length]);

  return (
    <div className="platform-releases">
      <div className="platform-releases__list">
        <div className="platform-releases__list-header">
          <h1>Релизы платформы</h1>
          <div className="platform-releases__header-actions">
            <button
              type="button"
              className={selectedId === COMPOSE_MODE_ID ? "is-active" : ""}
              onClick={() => setSelectedId(COMPOSE_MODE_ID)}
            >
              Новый релиз
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isCreating || selectedId !== COMPOSE_MODE_ID || !canCreateRelease}
              title={createDisabledReason}
            >
              {isCreating ? "Создание…" : "Создать"}
            </button>
          </div>
        </div>

        {listError ? <p className="platform-releases__error">{listError}</p> : null}
        {isListLoading ? (
          <p className="platform-releases__status">Загрузка…</p>
        ) : (
          <ul className="platform-releases__items">
            {sortedReleases.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`platform-releases__item${
                    selectedId === item.id ? " is-active" : ""
                  }`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="platform-releases__item-title">
                    {item.version}
                    {" "}
                    ·
                    {" "}
                    {item.title}
                  </div>
                  <div className="platform-releases__item-meta">
                    {PLATFORM_RELEASE_STATUS_LABELS[item.status] || item.status}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ReleaseEditorPanel
        release={selectedId ? selectedRelease : null}
        isLoading={isDetailLoading}
        error={detailError}
        composeTitle={composeTitle}
        composeDescription={composeDescription}
        onComposeTitleChange={setComposeTitle}
        onComposeDescriptionChange={setComposeDescription}
        diffResult={diffResult}
        selectedElements={selectedElements}
        onToggleElement={toggleElementSelection}
        isComparing={isComparing}
        compareError={compareError}
        onCompare={handleCompare}
        onSave={handleSave}
        onSubmitForReview={handleSubmitForReview}
      />
    </div>
  );
}
