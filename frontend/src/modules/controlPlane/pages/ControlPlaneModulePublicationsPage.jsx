import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";
import * as publicationsApi from "../api/platformModulePublicationsApi";
import "../pages/controlPlaneModuleAppliesPage.css";

const STATUS_LABELS = {
  draft: "DRAFT",
  ready_for_review: "READY FOR REVIEW",
  in_review: "IN REVIEW",
  approved: "APPROVED",
  rejected: "REJECTED",
  published: "PUBLISHED",
};

function formatStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return STATUS_LABELS[normalized] || normalized.toUpperCase();
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("ru-RU");
}

export default function ControlPlaneModulePublicationsPage() {
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.DASHBOARD,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    title: "Module Publications",
  });

  const [publications, setPublications] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");

  const loadPublications = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await publicationsApi.listPlatformModulePublications();
      setPublications(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(
        publicationsApi.getApiErrorMessage(
          loadError,
          "Не удалось загрузить публикации модулей",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPublications();
  }, [loadPublications]);

  const loadDetail = useCallback(async (publicationId) => {
    setSelectedId(publicationId);
    setSelectedDetail(null);
    setDetailError("");
    setIsDetailLoading(true);
    try {
      const detail = await publicationsApi.getPlatformModulePublication(publicationId);
      setSelectedDetail(detail);
    } catch (loadError) {
      setDetailError(
        publicationsApi.getApiErrorMessage(
          loadError,
          "Не удалось загрузить карточку публикации",
        ),
      );
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const runAction = useCallback(
    async (actionName, publicationId) => {
      setIsActionLoading(true);
      setDetailError("");
      try {
        if (actionName === "start-review") {
          await publicationsApi.startModulePublicationReview(publicationId);
        } else if (actionName === "approve") {
          await publicationsApi.approveModulePublication(publicationId);
        } else if (actionName === "reject") {
          await publicationsApi.rejectModulePublication(publicationId, "Rejected in Control Plane");
        } else if (actionName === "publish") {
          await publicationsApi.publishModulePublication(publicationId);
        }
        await loadPublications();
        await loadDetail(publicationId);
      } catch (actionError) {
        setDetailError(
          publicationsApi.getApiErrorMessage(actionError, "Не удалось выполнить действие"),
        );
      } finally {
        setIsActionLoading(false);
      }
    },
    [loadDetail, loadPublications],
  );

  const sortedPublications = useMemo(
    () =>
      [...publications].sort((left, right) => {
        const leftTime = new Date(left.created_at || 0).getTime();
        const rightTime = new Date(right.created_at || 0).getTime();
        return rightTime - leftTime;
      }),
    [publications],
  );

  const selectedStatus = String(selectedDetail?.publication_status || "").toLowerCase();

  return (
    <section className="cp-module-applies-page">
      <p className="cp-module-applies-page__intro">
        Pipeline DEV → Platform Review → platform_template → Client Offers. Публикуется
        только configuration layer (без code deployment).
      </p>

      {isLoading ? <p className="cp-module-applies-page__status">Загрузка публикаций…</p> : null}
      {error ? <p className="cp-module-applies-page__error">{error}</p> : null}

      {!isLoading && !error ? (
        <div className="cp-module-applies-page__table-wrap">
          <table className="cp-module-applies-page__table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Version</th>
                <th>Status</th>
                <th>Created</th>
                <th>Reviewer</th>
                <th>Approved</th>
                <th>Published</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedPublications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="cp-module-applies-page__empty">
                    Публикации не обнаружены.
                  </td>
                </tr>
              ) : (
                sortedPublications.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.module_title || row.module_key}
                      <div className="cp-module-applies-page__muted">
                        <code>{row.module_key}</code>
                      </div>
                    </td>
                    <td>
                      {row.from_module_version} → {row.to_module_version}
                    </td>
                    <td>{formatStatus(row.publication_status)}</td>
                    <td>{formatDateTime(row.created_at)}</td>
                    <td>{row.reviewed_by_name || "—"}</td>
                    <td>{formatDateTime(row.approved_at)}</td>
                    <td>{formatDateTime(row.published_at)}</td>
                    <td>
                      <button type="button" onClick={() => loadDetail(row.id)}>
                        Открыть
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {selectedId ? (
        <section style={{ marginTop: 24 }}>
          <h2>Карточка публикации #{selectedId}</h2>
          {isDetailLoading ? <p>Загрузка…</p> : null}
          {detailError ? <p className="cp-module-applies-page__error">{detailError}</p> : null}
          {selectedDetail ? (
            <>
              <p>
                <strong>Status:</strong> {formatStatus(selectedDetail.publication_status)}
                {" · "}
                <strong>Risk:</strong> {selectedDetail.risk_level || "—"}
              </p>
              <p>
                <strong>Release summary:</strong> {selectedDetail.release_summary || "—"}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {selectedStatus === "ready_for_review" ? (
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={() => runAction("start-review", selectedId)}
                  >
                    Start Review
                  </button>
                ) : null}
                {selectedStatus === "in_review" ? (
                  <>
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => runAction("approve", selectedId)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => runAction("reject", selectedId)}
                    >
                      Reject
                    </button>
                  </>
                ) : null}
                {selectedStatus === "approved" ? (
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={() => runAction("publish", selectedId)}
                  >
                    Publish to Template
                  </button>
                ) : null}
              </div>
              <h3>Configuration Diff</h3>
              <pre className="cp-module-applies-page__muted">
                {JSON.stringify(selectedDetail.configuration_diff || {}, null, 2)}
              </pre>
              <h3>Snapshot</h3>
              <pre className="cp-module-applies-page__muted">
                {JSON.stringify(selectedDetail.snapshot_payload || {}, null, 2)}
              </pre>
            </>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
