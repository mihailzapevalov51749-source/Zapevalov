import { useCallback, useEffect, useMemo, useState } from "react";

import * as platformReleasesApi from "../api/platformReleasesApi";
import { PLATFORM_RELEASE_STATUS_LABELS } from "../platformReleaseStatusLabels";

import "../styles/platformReleasesPage.css";

function ReviewDetailPanel({
  release,
  isLoading,
  error,
  onStartReview,
  onRequestChanges,
  onApprove,
  onPublish,
  onOffer,
}) {
  const [comment, setComment] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    setComment("");
    setActionError("");
  }, [release?.id]);

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
    return <p className="platform-releases__status">Выберите релиз в очереди проверки.</p>;
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

        <div className="platform-releases__field">
          <label>Название</label>
          <p>{release.title}</p>
        </div>
        <div className="platform-releases__field">
          <label>Описание</label>
          <p>{release.description || "—"}</p>
        </div>

        {release.review_comment ? (
          <div className="platform-releases__review-comment">
            <strong>Комментарий reviewer</strong>
            <p>{release.review_comment}</p>
          </div>
        ) : null}

        <div className="platform-releases__changes">
          <strong>Изменения</strong>
          <ul>
            {(release.changes || []).map((change) => (
              <li key={change.id || change.title}>
                {change.title}
                {" "}
                (
                {change.change_type}
                )
              </li>
            ))}
          </ul>
        </div>

        {release.status === "in_platform_review" ? (
          <div className="platform-releases__field">
            <label>Комментарий reviewer</label>
            <textarea
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Комментарий для доработки или принятия"
            />
          </div>
        ) : null}

        <div className="platform-releases__actions">
          {release.status === "ready_for_platform_review" ? (
            <button type="button" onClick={() => runAction(() => onStartReview(release.id))}>
              Взять в проверку
            </button>
          ) : null}
          {release.status === "in_platform_review" ? (
            <>
              <button
                type="button"
                onClick={() => runAction(() => onRequestChanges(release.id, comment))}
                disabled={!comment.trim()}
              >
                Вернуть на доработку
              </button>
              <button
                type="button"
                onClick={() => runAction(() => onApprove(release.id, comment))}
              >
                Принять
              </button>
            </>
          ) : null}
          {release.status === "approved_by_platform" ? (
            <button type="button" onClick={() => runAction(() => onPublish(release.id))}>
              Опубликовать в эталон
            </button>
          ) : null}
          {release.status === "published_to_template" ? (
            <button type="button" onClick={() => runAction(() => onOffer(release.id))}>
              Предложить компаниям
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function PlatformReleaseReviewPage() {
  const [releases, setReleases] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [listError, setListError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const loadQueue = useCallback(async () => {
    setIsListLoading(true);
    setListError("");
    try {
      const items = await platformReleasesApi.listPlatformReviewQueue();
      setReleases(items);
      if (!selectedId && items.length > 0) {
        setSelectedId(items[0].id);
      }
    } catch (error) {
      setListError(platformReleasesApi.getApiErrorMessage(error, "Не удалось загрузить очередь"));
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
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    void loadReleaseDetail(selectedId);
  }, [selectedId, loadReleaseDetail]);

  const refresh = async (releaseId) => {
    await loadQueue();
    await loadReleaseDetail(releaseId);
  };

  const sortedReleases = useMemo(
    () => [...releases].sort((left, right) => right.id - left.id),
    [releases],
  );

  return (
    <div className="platform-releases">
      <div className="platform-releases__list">
        <div className="platform-releases__list-header">
          <h1>Очередь проверки релизов</h1>
        </div>
        {listError ? <p className="platform-releases__error">{listError}</p> : null}
        {isListLoading ? (
          <p className="platform-releases__status">Загрузка…</p>
        ) : sortedReleases.length === 0 ? (
          <p className="platform-releases__status">Нет релизов в очереди проверки.</p>
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

      <ReviewDetailPanel
        release={selectedRelease}
        isLoading={isDetailLoading}
        error={detailError}
        onStartReview={async (id) => {
          await platformReleasesApi.startReleaseReview(id);
          await refresh(id);
        }}
        onRequestChanges={async (id, text) => {
          await platformReleasesApi.requestReleaseChanges(id, text);
          await refresh(id);
        }}
        onApprove={async (id, text) => {
          await platformReleasesApi.approvePlatformRelease(id, text?.trim() || null);
          await refresh(id);
        }}
        onPublish={async (id) => {
          await platformReleasesApi.publishReleaseToTemplate(id);
          await refresh(id);
        }}
        onOffer={async (id) => {
          await platformReleasesApi.offerReleaseToTenants(id);
          await refresh(id);
        }}
      />
    </div>
  );
}
