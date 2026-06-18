import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";
import * as platformReleasesApi from "../api/platformReleasesApi";
import { PLATFORM_RELEASE_STATUS_LABELS } from "../platformReleaseStatusLabels";

import "../styles/platformReleasesPage.css";

function ReleaseModulesImpact({ releaseId }) {
  const [modules, setModules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!releaseId) {
      setModules([]);
      return;
    }

    let cancelled = false;

    async function loadModules() {
      setIsLoading(true);
      setError("");
      try {
        const data = await platformReleasesApi.listReleaseModules(releaseId);
        if (!cancelled) {
          setModules(Array.isArray(data) ? data : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            platformReleasesApi.getApiErrorMessage(
              loadError,
              "Не удалось загрузить модули релиза",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadModules();

    return () => {
      cancelled = true;
    };
  }, [releaseId]);

  return (
    <div className="platform-releases__release-modules">
      <strong>Затронутые модули</strong>
      {isLoading ? <p className="platform-releases__status">Загрузка…</p> : null}
      {error ? <p className="platform-releases__error">{error}</p> : null}
      {!isLoading && !error ? (
        modules.length === 0 ? (
          <p className="platform-releases__status">Модули для этого релиза не связаны.</p>
        ) : (
          <ul className="platform-releases__release-modules-list">
            {modules.map((item) => (
              <li key={item.id} className="platform-releases__release-modules-item">
                <code>{item.module_key}</code>
                <span>
                  {item.from_version}
                  {" → "}
                  {item.to_version}
                </span>
                {item.change_summary ? <p>{item.change_summary}</p> : null}
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}

function emptyChange() {
  return {
    change_type: "feature",
    title: "",
    description: "",
    risk_level: "low",
  };
}

function ReleaseDetailPanel({
  release,
  isLoading,
  error,
  onSave,
  onSubmitForReview,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [changes, setChanges] = useState([emptyChange()]);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!release) {
      return;
    }
    setTitle(release.title || "");
    setDescription(release.description || "");
    setChanges(
      release.changes?.length
        ? release.changes.map((item) => ({
            change_type: item.change_type || "other",
            title: item.title || "",
            description: item.description || "",
            risk_level: item.risk_level || "low",
            entity_type: item.entity_type || "",
            system_key: item.system_key || "",
          }))
        : [emptyChange()],
    );
    setActionError("");
  }, [release]);

  const canEdit = release?.status === "draft" || release?.status === "changes_requested";
  const canSubmit = release?.status === "draft" || release?.status === "changes_requested";

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
        changes: changes
          .filter((item) => String(item.title || "").trim())
          .map((item) => ({
            change_type: item.change_type,
            title: item.title.trim(),
            description: item.description?.trim() || null,
            risk_level: item.risk_level,
            entity_type: item.entity_type?.trim() || null,
            system_key: item.system_key?.trim() || null,
          })),
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

  if (isLoading) {
    return <p className="platform-releases__status">Загрузка релиза…</p>;
  }

  if (!release) {
    return <p className="platform-releases__status">Выберите релиз или создайте новый.</p>;
  }

  return (
    <div className="platform-releases__detail">
      <div className="platform-releases__detail-header">
        <h2>
          {release.version}
          {" "}
          ·
          {" "}
          {PLATFORM_RELEASE_STATUS_LABELS[release.status] || release.status}
        </h2>
      </div>
      <div className="platform-releases__detail-body">
        {error ? <p className="platform-releases__error">{error}</p> : null}
        {actionError ? <p className="platform-releases__error">{actionError}</p> : null}

        {release.status === "changes_requested" && release.review_comment ? (
          <div className="platform-releases__review-comment">
            <strong>Комментарий Platform reviewer</strong>
            <p>{release.review_comment}</p>
          </div>
        ) : null}

        <div className="platform-releases__field">
          <label>Название</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={!canEdit}
          />
        </div>

        <div className="platform-releases__field">
          <label>Описание</label>
          <textarea
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={!canEdit}
          />
        </div>

        <div className="platform-releases__changes">
          <strong>Изменения</strong>
          {changes.map((change, index) => (
            <div key={`change-${index}`} className="platform-releases__change-row">
              <input
                placeholder="Заголовок изменения"
                value={change.title}
                onChange={(event) => {
                  const next = [...changes];
                  next[index] = { ...next[index], title: event.target.value };
                  setChanges(next);
                }}
                disabled={!canEdit}
              />
              <select
                value={change.change_type}
                onChange={(event) => {
                  const next = [...changes];
                  next[index] = { ...next[index], change_type: event.target.value };
                  setChanges(next);
                }}
                disabled={!canEdit}
              >
                <option value="feature">Функция</option>
                <option value="fix">Исправление</option>
                <option value="configuration">Конфигурация</option>
                <option value="navigation">Навигация</option>
                <option value="other">Другое</option>
              </select>
              <textarea
                rows={2}
                placeholder="Описание"
                value={change.description}
                onChange={(event) => {
                  const next = [...changes];
                  next[index] = { ...next[index], description: event.target.value };
                  setChanges(next);
                }}
                disabled={!canEdit}
              />
              <select
                value={change.risk_level}
                onChange={(event) => {
                  const next = [...changes];
                  next[index] = { ...next[index], risk_level: event.target.value };
                  setChanges(next);
                }}
                disabled={!canEdit}
              >
                <option value="low">Низкий риск</option>
                <option value="medium">Средний риск</option>
                <option value="high">Высокий риск</option>
              </select>
            </div>
          ))}
          {canEdit ? (
            <button
              type="button"
              onClick={() => setChanges((prev) => [...prev, emptyChange()])}
            >
              Добавить изменение
            </button>
          ) : null}
        </div>

        <ReleaseModulesImpact releaseId={release.id} />

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
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [listError, setListError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const loadReleases = useCallback(async () => {
    setIsListLoading(true);
    setListError("");
    try {
      const items = await platformReleasesApi.listPlatformReleases();
      setReleases(items);
      if (!selectedId && items.length > 0) {
        setSelectedId(items[0].id);
      }
    } catch (error) {
      setListError(platformReleasesApi.getApiErrorMessage(error, "Не удалось загрузить релизы"));
    } finally {
      setIsListLoading(false);
    }
  }, [selectedId]);

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
    void loadReleaseDetail(selectedId);
  }, [selectedId, loadReleaseDetail]);

  const handleCreate = async () => {
    setIsCreating(true);
    setListError("");
    try {
      const created = await platformReleasesApi.createPlatformRelease({
        title: "Новый релиз платформы",
        description: "",
        changes: [],
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

  return (
    <div className="platform-releases">
      <div className="platform-releases__list">
        <div className="platform-releases__list-header">
          <h1>Релизы платформы</h1>
          <button type="button" onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Создание…" : "Создать"}
          </button>
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
                    {" "}
                    · изменений:
                    {" "}
                    {item.changes_count}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ReleaseDetailPanel
        release={selectedRelease}
        isLoading={isDetailLoading}
        error={detailError}
        onSave={handleSave}
        onSubmitForReview={handleSubmitForReview}
      />
    </div>
  );
}
