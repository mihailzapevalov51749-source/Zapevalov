import { useEffect, useMemo, useState } from "react";

import PlatformClientVersionsTable from "./PlatformClientVersionsTable";
import PlatformEnvironmentVersionCard from "./PlatformEnvironmentVersionCard";
import PlatformVersionStatusBadge from "./PlatformVersionStatusBadge";
import * as platformVersionRegistryApi from "../api/platformVersionRegistryApi";
import { partitionVersionRegistryRows } from "../utils/partitionVersionRegistryRows";
import { resolveVersionHistoryEventType } from "../utils/resolveVersionHistoryEventType";
import "../styles/platformVersionsPage.css";

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

function resolveHistoryCompanyName(row) {
  if (row?.tenant_name) {
    return row.tenant_name;
  }
  return row?.tenant_code || "—";
}

function resolveHistoryEnvironmentLabel(row) {
  const key = String(row?.environment_key || "").toUpperCase();
  if (key === "DEV") {
    return "DEV";
  }
  if (key === "TEMPLATE") {
    return "Template";
  }
  if (key === "CLIENT") {
    return "Client";
  }
  return row?.environment_label || key || "—";
}

export default function PlatformVersionsContent({ embedded = false }) {
  const [currentVersions, setCurrentVersions] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRegistry() {
      setIsLoading(true);
      setError("");
      try {
        const data = await platformVersionRegistryApi.fetchPlatformVersionRegistrySummary();
        if (!cancelled) {
          setCurrentVersions(Array.isArray(data?.current_versions) ? data.current_versions : []);
          setHistory(Array.isArray(data?.history) ? data.history : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            platformVersionRegistryApi.getApiErrorMessage(
              loadError,
              "Не удалось загрузить реестр версий платформы",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadRegistry();

    return () => {
      cancelled = true;
    };
  }, []);

  const { contourSlots, clientRows, templateVersion } = useMemo(
    () => partitionVersionRegistryRows(currentVersions),
    [currentVersions],
  );

  const sortedHistory = useMemo(
    () =>
      [...history].sort((left, right) => {
        const leftTime = new Date(left.recorded_at).getTime();
        const rightTime = new Date(right.recorded_at).getTime();
        return rightTime - leftTime;
      }),
    [history],
  );

  return (
    <section
      className={`platform-versions-page${embedded ? " platform-versions-page--embedded" : ""}`}
    >
      {!embedded ? (
        <header className="platform-versions-page__header">
          <h1 className="platform-versions-page__title">Версии платформы</h1>
          <p className="platform-versions-page__intro">
            Релизный контур платформы: состояние сред DEV и Template, поставки клиентским
            компаниям и журнал установок, обновлений и откатов.
          </p>
        </header>
      ) : (
        <p className="platform-versions-page__intro platform-versions-page__intro--embedded">
          Состояние контуров DEV и Template, версии у клиентских компаний и журнал установок,
          обновлений и откатов.
        </p>
      )}

      {isLoading ? <p className="platform-versions-page__status">Загрузка…</p> : null}
      {error ? <p className="platform-versions-page__error">{error}</p> : null}

      {!isLoading && !error ? (
        <>
          <section className="platform-versions-page__section" aria-label="Контуры DEV и Template">
            <h2 className="platform-versions-page__section-title">Контуры платформы</h2>
            <p className="platform-versions-page__section-hint">
              Фиксированные этапы выпуска: разработка (DEV) и эталон (Template).
            </p>
            <div className="platform-versions-page__contour-cards">
              {contourSlots.map((slot) => (
                <PlatformEnvironmentVersionCard
                  key={slot.key}
                  environmentTitle={slot.label}
                  row={
                    slot.row || {
                      environment_key: slot.key,
                      tenant_id: null,
                    }
                  }
                  empty={!slot.row}
                />
              ))}
            </div>
          </section>

          <section className="platform-versions-page__section" aria-label="Клиентские компании">
            <h2 className="platform-versions-page__section-title">Клиентские компании</h2>
            <p className="platform-versions-page__section-hint">
              Версии платформы, установленные у клиентских компаний в среде Client.
            </p>
            <PlatformClientVersionsTable rows={clientRows} templateVersion={templateVersion} />
          </section>

          <section className="platform-versions-page__section" aria-label="История версий">
            <h2 className="platform-versions-page__section-title">История версий</h2>
            <p className="platform-versions-page__section-hint">
              Журнал установок, обновлений и откатов по контурам и клиентским компаниям.
            </p>
            <div className="platform-versions-page__history-panel">
              {sortedHistory.length === 0 ? (
                <p className="platform-versions-page__history-empty">История пуста.</p>
              ) : (
                <table className="platform-versions-page__history-table">
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Событие</th>
                      <th>Среда</th>
                      <th>Компания</th>
                      <th>Версия</th>
                      <th>Автор</th>
                      <th>Описание</th>
                      <th>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHistory.map((row) => (
                      <tr key={row.id}>
                        <td className="platform-versions-page__history-muted">
                          {formatDateTime(row.recorded_at)}
                        </td>
                        <td>{resolveVersionHistoryEventType(row)}</td>
                        <td>{resolveHistoryEnvironmentLabel(row)}</td>
                        <td>{resolveHistoryCompanyName(row)}</td>
                        <td>
                          <span className="platform-versions-page__history-version">
                            {row.platform_version}
                          </span>
                        </td>
                        <td className="platform-versions-page__history-muted">
                          {row.installed_by_name || "—"}
                        </td>
                        <td>{row.change_description || row.notes || "—"}</td>
                        <td>
                          <PlatformVersionStatusBadge status={row.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}
