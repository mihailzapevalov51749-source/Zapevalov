import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { buildControlPlaneClientsPath } from "../config/controlPlanePaths";
import ClientsSectionNav from "../../admin/clients/ClientsSectionNav";
import {
  getTenantRegistrySummary,
  listTenantRegistry,
} from "../api/tenantRegistryApi";
import { resolveTenantPlatformVersion } from "../companies/resolveTenantPlatformVersion.js";
import ControlPlaneAccessGate from "../components/ControlPlaneAccessGate";
import TenantRegistryStatusBadge from "../components/TenantRegistryStatusBadge";
import TenantRegistryTypeBadge from "../components/TenantRegistryTypeBadge";
import { controlPlaneStyles as styles } from "../controlPlaneStyles";

const TYPE_OPTIONS = [
  "",
  "DEV",
  "TEMPLATE",
  "DEMO",
  "CLIENT",
  "LEGACY_TEMPLATE",
];

const STATUS_OPTIONS = ["", "ACTIVE", "DISABLED", "ARCHIVED"];

function formatSourceTenantId(value) {
  if (value == null || value === "") {
    return "—";
  }
  return String(value);
}

function ControlPlaneTenantRegistryView() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const [registryItems, registrySummary] = await Promise.all([
        listTenantRegistry({
          type: typeFilter || undefined,
          status: statusFilter || undefined,
          search: search || undefined,
        }),
        getTenantRegistrySummary(),
      ]);

      setTenants(Array.isArray(registryItems) ? registryItems : []);
      setSummary(registrySummary);
    } catch (requestError) {
      const detail =
        requestError?.response?.data?.detail ||
        requestError?.message ||
        "Не удалось загрузить Tenant Registry";
      setError(typeof detail === "string" ? detail : "Не удалось загрузить Tenant Registry");
      setTenants([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openTenantCard = (tenantId) => {
    navigate(buildControlPlaneClientsPath(`registry/${tenantId}`));
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearch(searchDraft.trim());
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>Control Plane</div>
          <h1 style={styles.title}>Клиенты ЯсноПро</h1>
          <p style={styles.subtitle}>
            Tenant Registry — read-only реестр окружений платформы: типы, версии
            шаблона и источники для Clone / Version Management.
          </p>
        </div>
      </div>

      <ClientsSectionNav />

      {summary ? (
        <section style={styles.card}>
          <div style={styles.metricsRow}>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Всего tenant</div>
              <div style={styles.metricValue}>{summary.total}</div>
            </div>
            {Object.entries(summary.by_type || {}).map(([type, count]) => (
              <div key={type} style={styles.metricCard}>
                <div style={styles.metricLabel}>{type}</div>
                <div style={styles.metricValue}>{count}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section style={styles.card}>
        <form style={styles.filtersRow} onSubmit={handleSearchSubmit}>
          <label style={styles.field}>
            <span style={styles.label}>Type</span>
            <select
              style={styles.select}
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option || "all"} value={option}>
                  {option || "Все типы"}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Status</span>
            <select
              style={styles.select}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option || "all"} value={option}>
                  {option || "Все статусы"}
                </option>
              ))}
            </select>
          </label>

          <label style={{ ...styles.field, flex: "1 1 240px" }}>
            <span style={styles.label}>Поиск (ID / Name)</span>
            <input
              style={styles.input}
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="14 или Михаил"
            />
          </label>

          <button type="submit" style={styles.secondaryButton}>
            Найти
          </button>
        </form>
      </section>

      <section style={styles.card}>
        {error ? <div style={styles.error}>{error}</div> : null}

        {isLoading ? (
          <div style={{ color: "#64748b" }}>Загрузка...</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Version</th>
                <th style={styles.th}>Source</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={7}>
                    Tenant не найдены по текущим фильтрам.
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td style={styles.td}>{tenant.id}</td>
                    <td style={styles.td}>{tenant.name}</td>
                    <td style={styles.td}>
                      <TenantRegistryTypeBadge
                        tenantId={tenant.id}
                        tenantType={tenant.tenant_type}
                      />
                    </td>
                    <td style={styles.td}>{resolveTenantPlatformVersion(tenant)}</td>
                    <td style={styles.td}>
                      {formatSourceTenantId(tenant.source_tenant_id)}
                    </td>
                    <td style={styles.td}>
                      <TenantRegistryStatusBadge status={tenant.tenant_status} />
                    </td>
                    <td style={styles.td}>
                      <button
                        type="button"
                        style={styles.linkButton}
                        onClick={() => openTenantCard(tenant.id)}
                      >
                        Открыть
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default function ControlPlaneTenantRegistryPage() {
  return (
    <ControlPlaneAccessGate>
      <ControlPlaneTenantRegistryView />
    </ControlPlaneAccessGate>
  );
}
