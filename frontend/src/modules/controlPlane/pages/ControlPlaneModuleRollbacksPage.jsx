import { useEffect, useMemo, useState } from "react";

import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";
import * as platformModuleRollbacksApi from "../api/platformModuleRollbacksApi";
import "./controlPlaneModuleRollbacksPage.css";

const STATUS_LABELS = {
  started: "STARTED",
  completed: "COMPLETED",
  failed: "FAILED",
};

function formatStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return STATUS_LABELS[normalized] || normalized.toUpperCase();
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString("ru-RU");
}

export default function ControlPlaneModuleRollbacksPage() {
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.DASHBOARD,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    title: "Module Rollbacks",
  });

  const [rollbacks, setRollbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRollbacks() {
      setIsLoading(true);
      setError("");
      try {
        const data = await platformModuleRollbacksApi.listPlatformModuleRollbacks();
        if (!cancelled) {
          setRollbacks(Array.isArray(data) ? data : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            platformModuleRollbacksApi.getApiErrorMessage(
              loadError,
              "Не удалось загрузить историю Rollback",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadRollbacks();

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedRollbacks = useMemo(
    () =>
      [...rollbacks].sort((left, right) => {
        const leftTime = new Date(left.started_at || 0).getTime();
        const rightTime = new Date(right.started_at || 0).getTime();
        return rightTime - leftTime;
      }),
    [rollbacks],
  );

  return (
    <section className="cp-module-rollbacks-page">
      <p className="cp-module-rollbacks-page__intro">
        Read-only история rollback конфигураций модулей по tenant. Code rollback и restore
        runtime данных на этом этапе недоступны.
      </p>

      {isLoading ? <p className="cp-module-rollbacks-page__status">Загрузка Rollback…</p> : null}
      {error ? <p className="cp-module-rollbacks-page__error">{error}</p> : null}

      {!isLoading && !error ? (
        <div className="cp-module-rollbacks-page__table-wrap">
          <table className="cp-module-rollbacks-page__table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Module</th>
                <th>Apply</th>
                <th>From</th>
                <th>To</th>
                <th>Status</th>
                <th>Started</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {sortedRollbacks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="cp-module-rollbacks-page__empty">
                    Rollback записи не обнаружены.
                  </td>
                </tr>
              ) : (
                sortedRollbacks.map((rollbackRow) => (
                  <tr key={rollbackRow.id}>
                    <td>
                      {rollbackRow.tenant_name || "—"}
                      <div className="cp-module-rollbacks-page__muted">#{rollbackRow.tenant_id}</div>
                    </td>
                    <td>
                      {rollbackRow.module_title || rollbackRow.module_key}
                      <div className="cp-module-rollbacks-page__muted">
                        <code>{rollbackRow.module_key}</code>
                      </div>
                    </td>
                    <td>{rollbackRow.apply_id || "—"}</td>
                    <td>{rollbackRow.from_module_version || "—"}</td>
                    <td>{rollbackRow.to_module_version || "—"}</td>
                    <td>{formatStatus(rollbackRow.status)}</td>
                    <td>{formatDateTime(rollbackRow.started_at)}</td>
                    <td>{formatDateTime(rollbackRow.completed_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
