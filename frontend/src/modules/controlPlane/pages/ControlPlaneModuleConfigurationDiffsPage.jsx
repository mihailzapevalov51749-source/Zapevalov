import { useEffect, useMemo, useState } from "react";

import {
  PAGE_LAYOUT_PAGE_TYPE,
  PAGE_LAYOUT_TOOLBAR_ZONE,
  useResolvedPageLayoutContract,
} from "../../../shared/appShell/pageLayoutContract";
import * as platformModuleConfigurationDiffsApi from "../api/platformModuleConfigurationDiffsApi";
import "./controlPlaneModuleConfigurationDiffsPage.css";

const RISK_LABELS = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  critical: "CRITICAL",
};

function formatRisk(riskLevel) {
  const normalized = String(riskLevel || "low").trim().toLowerCase();
  return RISK_LABELS[normalized] || normalized.toUpperCase();
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

function DiffBlock({ title, block }) {
  const payload = block && typeof block === "object" ? block : {};
  return (
    <div className="cp-module-config-diffs-page__diff-block">
      <strong>{title}</strong>
      <pre className="cp-module-config-diffs-page__diff-json">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}

function DiffDetailPanel({ diff, isLoading, error, onClose }) {
  if (!diff && !isLoading && !error) {
    return null;
  }

  return (
    <section className="cp-module-config-diffs-page__detail-panel">
      <div className="cp-module-config-diffs-page__detail-header">
        <div>
          <h2>Configuration Diff</h2>
          {diff ? (
            <p className="cp-module-config-diffs-page__muted">
              {diff.module_title || diff.module_key} · tenant #{diff.tenant_id}
            </p>
          ) : null}
        </div>
        <button type="button" onClick={onClose}>
          Закрыть
        </button>
      </div>

      {isLoading ? <p className="cp-module-config-diffs-page__status">Загрузка diff…</p> : null}
      {error ? <p className="cp-module-config-diffs-page__error">{error}</p> : null}

      {diff ? (
        <div className="cp-module-config-diffs-page__detail-body">
          <p>
            <strong>Versions:</strong> {diff.from_module_version} → {diff.to_module_version}
          </p>
          <p>
            <strong>Config:</strong> {diff.from_config_version} → {diff.to_config_version}
          </p>
          <p>
            <strong>Risk:</strong> {formatRisk(diff.risk_level)}
          </p>
          <DiffBlock title="Settings" block={diff.diff_payload?.settings} />
          <DiffBlock title="Permissions" block={diff.diff_payload?.permissions} />
          <DiffBlock title="Views" block={diff.diff_payload?.views} />
          <DiffBlock title="Rules" block={diff.diff_payload?.rules} />
          <DiffBlock title="Templates" block={diff.diff_payload?.templates} />
          <p className="cp-module-config-diffs-page__muted">
            Read-only просмотр. Apply, Rollback и редактирование конфигурации недоступны.
          </p>
        </div>
      ) : null}
    </section>
  );
}

export default function ControlPlaneModuleConfigurationDiffsPage() {
  useResolvedPageLayoutContract({
    pageType: PAGE_LAYOUT_PAGE_TYPE.DASHBOARD,
    toolbarZoneId: PAGE_LAYOUT_TOOLBAR_ZONE.APP_HEADER,
    title: "Configuration Diffs",
  });

  const [diffs, setDiffs] = useState([]);
  const [selectedDiffId, setSelectedDiffId] = useState(null);
  const [selectedDiff, setSelectedDiff] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDiffs() {
      setIsLoading(true);
      setError("");
      try {
        const data = await platformModuleConfigurationDiffsApi.listPlatformModuleConfigurationDiffs();
        if (!cancelled) {
          setDiffs(Array.isArray(data) ? data : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            platformModuleConfigurationDiffsApi.getApiErrorMessage(
              loadError,
              "Не удалось загрузить configuration diffs",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadDiffs();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedDiffId) {
      setSelectedDiff(null);
      setDetailError("");
      return undefined;
    }

    let cancelled = false;

    async function loadDiffDetail() {
      setIsDetailLoading(true);
      setDetailError("");
      try {
        const data = await platformModuleConfigurationDiffsApi.getPlatformModuleConfigurationDiff(
          selectedDiffId,
        );
        if (!cancelled) {
          setSelectedDiff(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setDetailError(
            platformModuleConfigurationDiffsApi.getApiErrorMessage(
              loadError,
              "Не удалось загрузить configuration diff",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsDetailLoading(false);
        }
      }
    }

    loadDiffDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedDiffId]);

  const sortedDiffs = useMemo(
    () =>
      [...diffs].sort((left, right) => {
        const tenantCompare = Number(left.tenant_id) - Number(right.tenant_id);
        if (tenantCompare !== 0) {
          return tenantCompare;
        }
        return String(left.module_key || "").localeCompare(String(right.module_key || ""));
      }),
    [diffs],
  );

  return (
    <section className="cp-module-config-diffs-page">
      <p className="cp-module-config-diffs-page__intro">
        Read-only обзор configuration diffs по tenant и module update offers. Apply, Rollback и
        редактирование конфигурации на этом этапе недоступны.
      </p>

      {isLoading ? <p className="cp-module-config-diffs-page__status">Загрузка…</p> : null}
      {error ? <p className="cp-module-config-diffs-page__error">{error}</p> : null}

      {!isLoading && !error ? (
        <div className="cp-module-config-diffs-page__table-wrap">
          <table className="cp-module-config-diffs-page__table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Module</th>
                <th>Versions</th>
                <th>Risk</th>
                <th>Generated</th>
                <th>Diff</th>
              </tr>
            </thead>
            <tbody>
              {sortedDiffs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="cp-module-config-diffs-page__empty">
                    Configuration diffs не обнаружены.
                  </td>
                </tr>
              ) : (
                sortedDiffs.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div>{item.tenant_name || `Tenant #${item.tenant_id}`}</div>
                      <div className="cp-module-config-diffs-page__muted">#{item.tenant_id}</div>
                    </td>
                    <td>
                      <div>{item.module_title || item.module_key}</div>
                      <code>{item.module_key}</code>
                    </td>
                    <td>
                      {item.from_module_version} → {item.to_module_version}
                    </td>
                    <td>{formatRisk(item.risk_level)}</td>
                    <td>{formatGeneratedAt(item.generated_at)}</td>
                    <td>
                      <button type="button" onClick={() => setSelectedDiffId(item.id)}>
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

      {selectedDiffId ? (
        <DiffDetailPanel
          diff={selectedDiff}
          isLoading={isDetailLoading}
          error={detailError}
          onClose={() => setSelectedDiffId(null)}
        />
      ) : null}
    </section>
  );
}
