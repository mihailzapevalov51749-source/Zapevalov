import { useEffect, useMemo, useState } from "react";

import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";
import * as platformModuleAppliesApi from "../api/platformModuleAppliesApi";
import "./controlPlaneModuleAppliesPage.css";

const STATUS_LABELS = {
  started: "STARTED",
  completed: "COMPLETED",
  failed: "FAILED",
  rolled_back: "ROLLED BACK",
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

export default function ControlPlaneModuleAppliesPage() {
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.DASHBOARD,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    title: "Module Applies",
  });

  const [applies, setApplies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadApplies() {
      setIsLoading(true);
      setError("");
      try {
        const data = await platformModuleAppliesApi.listPlatformModuleApplies();
        if (!cancelled) {
          setApplies(Array.isArray(data) ? data : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            platformModuleAppliesApi.getApiErrorMessage(
              loadError,
              "Не удалось загрузить историю Apply",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadApplies();

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedApplies = useMemo(
    () =>
      [...applies].sort((left, right) => {
        const leftTime = new Date(left.started_at || 0).getTime();
        const rightTime = new Date(right.started_at || 0).getTime();
        return rightTime - leftTime;
      }),
    [applies],
  );

  return (
    <section className="cp-module-applies-page">
      <p className="cp-module-applies-page__intro">
        Read-only история применения конфигураций модулей по tenant. Rollback и restore
        snapshot на этом этапе недоступны.
      </p>

      {isLoading ? <p className="cp-module-applies-page__status">Загрузка Apply…</p> : null}
      {error ? <p className="cp-module-applies-page__error">{error}</p> : null}

      {!isLoading && !error ? (
        <div className="cp-module-applies-page__table-wrap">
          <table className="cp-module-applies-page__table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Module</th>
                <th>From</th>
                <th>To</th>
                <th>Status</th>
                <th>Started</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {sortedApplies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="cp-module-applies-page__empty">
                    Apply записи не обнаружены.
                  </td>
                </tr>
              ) : (
                sortedApplies.map((applyRow) => (
                  <tr key={applyRow.id}>
                    <td>
                      {applyRow.tenant_name || "—"}
                      <div className="cp-module-applies-page__muted">#{applyRow.tenant_id}</div>
                    </td>
                    <td>
                      {applyRow.module_title || applyRow.module_key}
                      <div className="cp-module-applies-page__muted">
                        <code>{applyRow.module_key}</code>
                      </div>
                    </td>
                    <td>{applyRow.from_module_version || "—"}</td>
                    <td>{applyRow.to_module_version || "—"}</td>
                    <td>{formatStatus(applyRow.status)}</td>
                    <td>{formatDateTime(applyRow.started_at)}</td>
                    <td>{formatDateTime(applyRow.completed_at)}</td>
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
