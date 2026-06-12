import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getTenantRegistrySummary,
} from "../api/tenantRegistryApi";
import { buildControlPlaneCompaniesPath } from "../config/controlPlanePaths";

const toneColorMap = {
  success: "#16A34A",
  warning: "#EA580C",
  danger: "#DC2626",
  muted: "#64748B",
  primary: "#2563EB",
};

function MetricTile({ label, value, tone = "primary" }) {
  return (
    <div style={metricTileStyle}>
      <div style={{ ...metricValueStyle, color: toneColorMap[tone] || "#0F172A" }}>
        {value}
      </div>
      <div style={metricLabelStyle}>{label}</div>
    </div>
  );
}

function DashboardSection({ title, children }) {
  return (
    <section style={sectionStyle}>
      <h2 style={sectionTitleStyle}>{title}</h2>
      {children}
    </section>
  );
}

export default function ControlPlaneDashboardPage() {
  const navigate = useNavigate();
  const [clientsSummary, setClientsSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      const summary = await getTenantRegistrySummary();
      setClientsSummary(summary);
    } catch (error) {
      console.error("CONTROL PLANE DASHBOARD SUMMARY LOAD ERROR:", error);
      setClientsSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const statusCounts = clientsSummary?.by_status || {};
  const companiesMetrics = useMemo(
    () => [
      {
        label: "Всего",
        value: isLoading ? "…" : String(clientsSummary?.total ?? 0),
        tone: "primary",
      },
      {
        label: "Активных",
        value: isLoading ? "…" : String(statusCounts.ACTIVE ?? 0),
        tone: "success",
      },
      {
        label: "Отключённых",
        value: isLoading ? "…" : String(statusCounts.DISABLED ?? 0),
        tone: "warning",
      },
      {
        label: "Архивных",
        value: isLoading ? "…" : String(statusCounts.ARCHIVED ?? 0),
        tone: "muted",
      },
    ],
    [clientsSummary?.total, isLoading, statusCounts.ARCHIVED, statusCounts.ACTIVE, statusCounts.DISABLED],
  );

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <h1 style={titleStyle}>Состояние платформы</h1>
        <p style={subtitleStyle}>
          Обзор компаний, шаблонов и операционного статуса Control Plane.
        </p>
      </header>

      <DashboardSection title="Компании">
        <div style={metricsGridStyle}>
          {companiesMetrics.map((metric) => (
            <MetricTile
              key={metric.label}
              label={metric.label}
              value={metric.value}
              tone={metric.tone}
            />
          ))}
        </div>
      </DashboardSection>

      <DashboardSection title="Шаблоны">
        <div style={metricsGridStyle}>
          <MetricTile label="Текущая версия TEMPLATE" value="В разработке" tone="muted" />
          <MetricTile label="На актуальной версии" value="Нет данных" tone="muted" />
          <MetricTile label="С устаревшей версией" value="Нет данных" tone="muted" />
        </div>
      </DashboardSection>

      <DashboardSection title="Операционный статус">
        <div style={metricsGridStyle}>
          <MetricTile label="Ошибок сегодня" value="В разработке" tone="muted" />
          <MetricTile label="Последних событий" value="В разработке" tone="muted" />
          <MetricTile label="Предупреждений" value="В разработке" tone="muted" />
        </div>
      </DashboardSection>

      <DashboardSection title="Быстрые действия">
        <div style={actionsRowStyle}>
          <button
            type="button"
            style={primaryActionStyle}
            onClick={() => navigate(buildControlPlaneCompaniesPath("clients"))}
          >
            Открыть компании
          </button>
        </div>
      </DashboardSection>
    </div>
  );
}

const pageStyle = {
  flex: 1,
  minHeight: 0,
  height: "100%",
  padding: "8px 12px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  boxSizing: "border-box",
  background: "#F8FAFC",
  overflowY: "auto",
  overflowX: "hidden",
};

const headerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const titleStyle = {
  margin: 0,
  fontSize: 24,
  fontWeight: 800,
  color: "#0F172A",
  letterSpacing: 0.2,
};

const subtitleStyle = {
  margin: 0,
  fontSize: 14,
  color: "#64748B",
};

const sectionStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  padding: "16px 18px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const sectionTitleStyle = {
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  color: "#0F172A",
};

const metricsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 12,
};

const metricTileStyle = {
  background: "#F8FAFC",
  border: "1px solid #E2E8F0",
  borderRadius: 10,
  padding: "12px 14px",
  minHeight: 72,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: 4,
};

const metricValueStyle = {
  fontSize: 22,
  fontWeight: 800,
  lineHeight: 1.1,
};

const metricLabelStyle = {
  fontSize: 12,
  color: "#64748B",
};

const actionsRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
};

const primaryActionStyle = {
  border: "none",
  borderRadius: 8,
  padding: "10px 16px",
  background: "#2563EB",
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryActionStyle = {
  border: "1px solid #CBD5E1",
  borderRadius: 8,
  padding: "10px 16px",
  background: "#FFFFFF",
  color: "#0F172A",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};
