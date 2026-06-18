import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { buildControlPlaneClientsPath } from "../config/controlPlanePaths";
import ClientsSectionNav from "../../admin/clients/ClientsSectionNav";
import { getTenantRegistryItem } from "../api/tenantRegistryApi";
import { resolveTenantPlatformVersion } from "../companies/resolveTenantPlatformVersion.js";
import ControlPlaneAccessGate from "../components/ControlPlaneAccessGate";
import TenantRegistryStatusBadge from "../components/TenantRegistryStatusBadge";
import TenantRegistryTypeBadge from "../components/TenantRegistryTypeBadge";
import { openCompanyInOffice } from "../../../portal/utils/openCompanyInOffice";
import { controlPlaneStyles as styles } from "../controlPlaneStyles";

function formatSourceTenant(value) {
  if (value == null || value === "") {
    return "—";
  }
  return String(value);
}

function ControlPlaneTenantDetailView({ tenantId }) {
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isOpeningOffice, setIsOpeningOffice] = useState(false);

  const loadTenant = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const data = await getTenantRegistryItem(tenantId);
      setTenant(data);
    } catch (requestError) {
      const detail =
        requestError?.response?.data?.detail ||
        requestError?.message ||
        "Не удалось загрузить карточку tenant";
      setError(typeof detail === "string" ? detail : "Не удалось загрузить карточку tenant");
      setTenant(null);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadTenant();
  }, [loadTenant]);

  const openTenantRuntime = async () => {
    if (isOpeningOffice) {
      return;
    }

    setIsOpeningOffice(true);
    try {
      await openCompanyInOffice(tenantId);
    } finally {
      setIsOpeningOffice(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>Клиенты ЯсноПро · Tenant Registry</div>
          <h1 style={styles.title}>Карточка компании</h1>
          <p style={styles.subtitle}>Только просмотр. Редактирование не реализовано.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => navigate(buildControlPlaneClientsPath("registry"))}
          >
            К реестру
          </button>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={openTenantRuntime}
            disabled={isOpeningOffice}
          >
            {isOpeningOffice ? "Открытие..." : "Открыть Office"}
          </button>
        </div>
      </div>

      <ClientsSectionNav />

      <section style={styles.card}>
        {isLoading ? <div style={{ color: "#64748b" }}>Загрузка...</div> : null}
        {error ? <div style={styles.error}>{error}</div> : null}

        {tenant ? (
          <>
            <div style={styles.detailGrid}>
              <div style={styles.detailLabel}>ID</div>
              <div style={styles.detailValue}>{tenant.id}</div>

              <div style={styles.detailLabel}>Название</div>
              <div style={styles.detailValue}>{tenant.name}</div>

              <div style={styles.detailLabel}>Тип</div>
              <div style={styles.detailValue}>
                <TenantRegistryTypeBadge
                  tenantId={tenant.id}
                  tenantType={tenant.tenant_type}
                />
              </div>

              <div style={styles.detailLabel}>Версия</div>
              <div style={styles.detailValue}>{resolveTenantPlatformVersion(tenant)}</div>

              <div style={styles.detailLabel}>Статус</div>
              <div style={styles.detailValue}>
                <TenantRegistryStatusBadge status={tenant.tenant_status} />
              </div>

              <div style={styles.detailLabel}>Источник (Source Tenant)</div>
              <div style={styles.detailValue}>
                {formatSourceTenant(tenant.source_tenant_id)}
              </div>

              <div style={styles.detailLabel}>Notes</div>
              <div style={styles.detailValue}>{tenant.notes || "—"}</div>

              {tenant.description ? (
                <>
                  <div style={styles.detailLabel}>Описание</div>
                  <div style={styles.detailValue}>{tenant.description}</div>
                </>
              ) : null}
            </div>

            <div style={styles.futureHint}>
              Поля Type, Source Tenant и Version подготовлены для будущего Clone Tenant
              и Version Management. На этом этапе изменения недоступны.
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

export default function ControlPlaneTenantDetailPage({ tenantId }) {
  return (
    <ControlPlaneAccessGate>
      <ControlPlaneTenantDetailView tenantId={tenantId} />
    </ControlPlaneAccessGate>
  );
}
