import { useEffect, useMemo, useState } from "react";

import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";
import * as platformModuleUpdatePreviewsApi from "../api/platformModuleUpdatePreviewsApi";
import "./controlPlaneModuleUpdatePreviewsPage.css";

const RISK_LABELS = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
  critical: "Критический",
};

function formatRisk(riskLevel) {
  const normalized = String(riskLevel || "low").trim().toLowerCase();
  return RISK_LABELS[normalized] || normalized;
}

function formatGeneratedAt(value) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString("ru-RU");
}

export default function ControlPlaneModuleUpdatePreviewsPage() {
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.DASHBOARD,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    title: "Предпросмотр обновлений",
  });

  const [previews, setPreviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPreviews() {
      setIsLoading(true);
      setError("");

      try {
        const data = await platformModuleUpdatePreviewsApi.listPlatformModuleUpdatePreviews();
        if (!cancelled) {
          setPreviews(Array.isArray(data) ? data : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            platformModuleUpdatePreviewsApi.getApiErrorMessage(
              loadError,
              "Не удалось загрузить предпросмотры обновлений",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPreviews();

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedPreviews = useMemo(
    () =>
      [...previews].sort((left, right) => {
        const tenantCompare = Number(left.tenant_id) - Number(right.tenant_id);
        if (tenantCompare !== 0) {
          return tenantCompare;
        }
        return String(left.module_key || "").localeCompare(String(right.module_key || ""));
      }),
    [previews],
  );

  return (
    <section className="cp-module-previews-page">
      <p className="cp-module-previews-page__intro">
        Read-only обзор предпросмотров обновлений модулей по tenant. Apply, Rollback и
        другие действия изменения состояния на этом этапе недоступны.
      </p>

      {isLoading ? <p className="cp-module-previews-page__status">Загрузка…</p> : null}
      {error ? <p className="cp-module-previews-page__error">{error}</p> : null}

      {!isLoading && !error ? (
        <div className="cp-module-previews-page__table-wrap">
          <table className="cp-module-previews-page__table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Модуль</th>
                <th>From</th>
                <th>To</th>
                <th>Риск</th>
                <th>Сгенерирован</th>
              </tr>
            </thead>
            <tbody>
              {sortedPreviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="cp-module-previews-page__empty">
                    Предпросмотры обновлений не обнаружены.
                  </td>
                </tr>
              ) : (
                sortedPreviews.map((preview) => (
                  <tr key={preview.id}>
                    <td>
                      <div>{preview.tenant_name || `Tenant #${preview.tenant_id}`}</div>
                      <div className="cp-module-previews-page__muted">#{preview.tenant_id}</div>
                    </td>
                    <td>
                      <div>{preview.module_title || preview.module_key}</div>
                      <code>{preview.module_key}</code>
                    </td>
                    <td>{preview.from_version}</td>
                    <td>{preview.to_version}</td>
                    <td>{formatRisk(preview.risk_level)}</td>
                    <td>{formatGeneratedAt(preview.generated_at)}</td>
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
