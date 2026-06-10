import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getTenantRegistrySummary,
  listTenantRegistry,
} from "../../controlPlane/api/tenantRegistryApi";
import TenantRegistryTypeBadge from "../../controlPlane/components/TenantRegistryTypeBadge";
import ControlPlaneAccessGate from "../../controlPlane/components/ControlPlaneAccessGate";
import { controlPlaneStyles as styles } from "../../controlPlane/controlPlaneStyles";
import { buildControlPlaneClientsPath } from "../../controlPlane/config/controlPlanePaths";
import { resolveClientStatusLabel } from "./clientStatusLabels";
import ClientsSectionNav from "./ClientsSectionNav";

function ClientsOverviewView() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [recentCompanies, setRecentCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const [registrySummary, companies] = await Promise.all([
        getTenantRegistrySummary(),
        listTenantRegistry(),
      ]);

      setSummary(registrySummary);
      const sorted = [...(Array.isArray(companies) ? companies : [])].sort(
        (left, right) => Number(right.id) - Number(left.id),
      );
      setRecentCompanies(sorted.slice(0, 5));
    } catch (requestError) {
      const detail =
        requestError?.response?.data?.detail ||
        requestError?.message ||
        "Не удалось загрузить обзор клиентов";
      setError(typeof detail === "string" ? detail : "Не удалось загрузить обзор клиентов");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const statusCounts = summary?.by_status || {};

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>Control Plane</div>
          <h1 style={styles.title}>Клиенты ЯсноПро</h1>
          <p style={styles.subtitle}>
            Компании, использующие платформу ЯсноПро. Создание, управление и
            контроль клиентских организаций.
          </p>
        </div>
      </div>

      <ClientsSectionNav />

      {error ? <div style={styles.error}>{error}</div> : null}

      <section style={styles.card}>
        {isLoading ? (
          <div style={{ color: "#64748b" }}>Загрузка...</div>
        ) : (
          <div style={styles.metricsRow}>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Всего компаний</div>
              <div style={styles.metricValue}>{summary?.total ?? 0}</div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Активных</div>
              <div style={styles.metricValue}>{statusCounts.ACTIVE ?? 0}</div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Отключённых</div>
              <div style={styles.metricValue}>{statusCounts.DISABLED ?? 0}</div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Архивных</div>
              <div style={styles.metricValue}>{statusCounts.ARCHIVED ?? 0}</div>
            </div>
          </div>
        )}
      </section>

      <section style={styles.card}>
        <h2 style={{ margin: "0 0 12px", fontSize: 16, color: "#0f172a" }}>
          Последние компании
        </h2>

        {recentCompanies.length === 0 ? (
          <div style={{ color: "#64748b" }}>Компании не найдены.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentCompanies.map((company) => (
              <div
                key={company.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) auto auto",
                  gap: 12,
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <div style={{ fontWeight: 700, color: "#0f172a" }}>{company.name}</div>
                <TenantRegistryTypeBadge
                  tenantId={company.id}
                  tenantType={company.tenant_type}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                  {resolveClientStatusLabel(company.tenant_status)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => navigate(buildControlPlaneClientsPath("companies"))}
          >
            Все компании →
          </button>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => navigate(buildControlPlaneClientsPath("registry"))}
          >
            Tenant Registry →
          </button>
        </div>
      </section>
    </div>
  );
}

export default function ClientsOverviewPage() {
  return (
    <ControlPlaneAccessGate>
      <ClientsOverviewView />
    </ControlPlaneAccessGate>
  );
}
