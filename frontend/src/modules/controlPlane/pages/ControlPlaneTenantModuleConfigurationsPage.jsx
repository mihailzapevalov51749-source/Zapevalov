import { useEffect, useMemo, useState } from "react";

import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";
import * as platformTenantModuleConfigurationsApi from "../api/platformTenantModuleConfigurationsApi";
import "./controlPlaneTenantModuleConfigurationsPage.css";

function formatUpdatedAt(value) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString("ru-RU");
}

export default function ControlPlaneTenantModuleConfigurationsPage() {
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.DASHBOARD,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    title: "Tenant Module Configurations",
  });

  const [configurations, setConfigurations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadConfigurations() {
      setIsLoading(true);
      setError("");

      try {
        const data = await platformTenantModuleConfigurationsApi.listPlatformTenantModuleConfigurations();
        if (!cancelled) {
          setConfigurations(Array.isArray(data) ? data : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            platformTenantModuleConfigurationsApi.getApiErrorMessage(
              loadError,
              "Не удалось загрузить конфигурации модулей tenant",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadConfigurations();

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedConfigurations = useMemo(
    () =>
      [...configurations].sort((left, right) => {
        const tenantCompare = Number(left.tenant_id) - Number(right.tenant_id);
        if (tenantCompare !== 0) {
          return tenantCompare;
        }
        return String(left.module_key || "").localeCompare(String(right.module_key || ""));
      }),
    [configurations],
  );

  return (
    <section className="cp-tenant-module-configs-page">
      <p className="cp-tenant-module-configs-page__intro">
        Read-only обзор tenant-конфигураций модулей. Apply, Rollback, редактирование и
        сохранение на этом этапе недоступны.
      </p>

      {isLoading ? <p className="cp-tenant-module-configs-page__status">Загрузка…</p> : null}
      {error ? <p className="cp-tenant-module-configs-page__error">{error}</p> : null}

      {!isLoading && !error ? (
        <div className="cp-tenant-module-configs-page__table-wrap">
          <table className="cp-tenant-module-configs-page__table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Module</th>
                <th>Module Version</th>
                <th>Config Version</th>
                <th>Schema Version</th>
                <th>Source</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {sortedConfigurations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="cp-tenant-module-configs-page__empty">
                    Конфигурации модулей tenant не обнаружены.
                  </td>
                </tr>
              ) : (
                sortedConfigurations.map((item) => (
                  <tr key={`${item.tenant_id}:${item.module_key}`}>
                    <td>
                      <div>{item.tenant_title || `Tenant #${item.tenant_id}`}</div>
                      <div className="cp-tenant-module-configs-page__muted">#{item.tenant_id}</div>
                    </td>
                    <td>
                      <div>{item.module_title || item.module_key}</div>
                      <code>{item.module_key}</code>
                    </td>
                    <td>{item.module_version || "—"}</td>
                    <td>{item.config_version || "—"}</td>
                    <td>{item.schema_version || "—"}</td>
                    <td>{item.source || "—"}</td>
                    <td>{formatUpdatedAt(item.updated_at)}</td>
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
